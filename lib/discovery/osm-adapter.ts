// OpenStreetMap adapter.
// Uses Overpass API for business discovery within a pre-geocoded bounding box.
// No API key required. Nominatim ToS: must send valid User-Agent with contact.

import type { RawCandidate, OsmAdapterParams } from './types'
import { ISO2_TO_SLUG } from '@/lib/locations/countries'

const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter'
const UA = 'KronosLeadIntelligence/1.0 (alejandro@kronosdata.tech)'

// ── OSM element types ──────────────────────────────────────────────────────────

interface OverpassTags {
  name?:                string
  'addr:street'?:       string
  'addr:housenumber'?:  string
  'addr:city'?:         string
  'addr:country'?:      string
  phone?:               string
  'contact:phone'?:     string
  website?:             string
  'contact:website'?:   string
  [key: string]:        string | undefined
}

interface OverpassElement {
  type:    'node' | 'way' | 'relation'
  id:      number
  lat?:    number
  lon?:    number
  center?: { lat: number; lon: number }
  tags?:   OverpassTags
}

// ── Industry → OSM tag mapping ─────────────────────────────────────────────────

const INDUSTRY_TAGS: Array<{ keywords: string[]; tags: Array<[string, string]> }> = [
  { keywords: ['dental', 'dentist', 'odontolog', 'clinica dental'],
    tags: [['amenity', 'dentist']] },
  { keywords: ['clinic', 'clínica', 'clinica', 'healthcare', 'medico', 'médico', 'salud'],
    tags: [['amenity', 'clinic'], ['amenity', 'hospital'], ['healthcare', 'clinic']] },
  { keywords: ['hospital'],
    tags: [['amenity', 'hospital']] },
  { keywords: ['farmacia', 'pharmacy', 'drug'],
    tags: [['amenity', 'pharmacy']] },
  { keywords: ['restaurant', 'restaurante', 'comida', 'food', 'gastronomia'],
    tags: [['amenity', 'restaurant'], ['amenity', 'fast_food']] },
  { keywords: ['café', 'cafe', 'coffee'],
    tags: [['amenity', 'cafe']] },
  { keywords: ['hotel', 'hostal', 'hostel'],
    tags: [['tourism', 'hotel'], ['tourism', 'hostel']] },
  { keywords: ['abogado', 'lawyer', 'legal', 'jurídico', 'juridico', 'estudio de abogados'],
    tags: [['office', 'lawyer']] },
  { keywords: ['inmobiliaria', 'real estate', 'estate agent', 'bienes raíces', 'bienes raices'],
    tags: [['office', 'estate_agent']] },
  { keywords: ['construccion', 'construcción', 'construction', 'constructora'],
    tags: [['office', 'construction']] },
  { keywords: ['gym', 'gimnasio', 'fitness', 'crossfit'],
    tags: [['leisure', 'fitness_centre']] },
  { keywords: ['escuela', 'school', 'colegio'],
    tags: [['amenity', 'school']] },
  { keywords: ['universidad', 'university'],
    tags: [['amenity', 'university']] },
  { keywords: ['supermarket', 'supermercado'],
    tags: [['shop', 'supermarket']] },
  { keywords: ['beauty', 'salon', 'salón', 'estética', 'estetica', 'peluquería', 'spa'],
    tags: [['shop', 'hairdresser'], ['shop', 'beauty']] },
  { keywords: ['veterinaria', 'veterinario', 'vet'],
    tags: [['amenity', 'veterinary']] },
  { keywords: ['banco', 'bank'],
    tags: [['amenity', 'bank']] },
  { keywords: ['taller', 'automotriz', 'mecanico', 'mecánico', 'autorepair'],
    tags: [['shop', 'car_repair']] },
  { keywords: ['notaria', 'notaría', 'notary'],
    tags: [['office', 'notary']] },
  { keywords: ['consultor', 'consultoria', 'agencia'],
    tags: [['office', 'consulting']] },
  { keywords: ['logistica', 'logística', 'transporte', 'envios'],
    tags: [['office', 'logistics']] },
]

function inferOSMTags(query: string): Array<[string, string]> {
  const lower = query.toLowerCase()
  for (const { keywords, tags } of INDUSTRY_TAGS) {
    if (keywords.some(kw => lower.includes(kw))) return tags
  }
  return []
}

function extractSearchTerms(query: string): string[] {
  const stop = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'o', 'con', 'para', 'por', 'una', 'unos'])
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stop.has(w))
    .slice(0, 3)
}

// ── Country normalizer ─────────────────────────────────────────────────────────

function normalizeCountry(cc: string | undefined, fallback: string): string {
  if (!cc) return fallback.toLowerCase()
  return ISO2_TO_SLUG[cc.toLowerCase()] ?? fallback.toLowerCase()
}

// ── Overpass query ─────────────────────────────────────────────────────────────

async function queryOverpass(
  bbox: [number, number, number, number], // [south, north, west, east]
  query: string,
  limit: number,
): Promise<OverpassElement[]> {
  const [south, north, west, east] = bbox
  const bboxStr = `${south},${west},${north},${east}`

  const tagFilters = inferOSMTags(query)
  const terms      = extractSearchTerms(query)

  const nodeWay = (filter: string) =>
    `node${filter}(${bboxStr});way${filter}(${bboxStr});`

  let filters: string

  if (tagFilters.length > 0) {
    const tagParts = tagFilters.map(([k, v]) => nodeWay(`["${k}"="${v}"]`)).join('')
    if (terms.length > 0) {
      const pattern = terms.join('|')
      filters = tagParts + nodeWay(`["name"~"${pattern}",i]`)
    } else {
      filters = tagParts
    }
  } else if (terms.length > 0) {
    const pattern = terms.join('|')
    filters = nodeWay(`["name"~"${pattern}",i]`)
  } else {
    return []
  }

  const overpassQuery = `[out:json][timeout:25];(${filters});out center ${limit};`

  try {
    const res = await fetch(OVERPASS_BASE, {
      method: 'POST',
      headers: {
        'User-Agent':   UA,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      console.warn('[OSM] Overpass HTTP', res.status)
      return []
    }
    const data = await res.json() as { elements?: OverpassElement[] }
    return data?.elements ?? []
  } catch (err) {
    console.warn('[OSM] Overpass error:', (err as Error).message)
    return []
  }
}

// ── Normalize OSM element ──────────────────────────────────────────────────────

function normalizeElement(
  el: OverpassElement,
  queryIndustry: string,
  fallbackCity: string,
  fallbackCountry: string,
): RawCandidate | null {
  const tags = el.tags ?? {}
  const name = tags.name?.trim()
  if (!name || name.length < 2) return null

  const lat    = el.lat  ?? el.center?.lat ?? null
  const lon    = el.lon  ?? el.center?.lon ?? null
  const city   = tags['addr:city'] ?? fallbackCity
  const cc     = tags['addr:country']
  const country = normalizeCountry(cc, fallbackCountry)

  const street  = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ')
  const address = street ? `${street}, ${city}` : `${city}, ${country}`

  const phone   = tags.phone ?? tags['contact:phone'] ?? null
  const website = tags.website ?? tags['contact:website'] ?? null

  let confidence = 35
  if (website)      confidence += 25
  if (phone)        confidence += 15
  if (lat !== null) confidence += 10
  if (street)       confidence += 10
  if (city !== fallbackCity) confidence += 5

  return {
    source:            'osm',
    externalId:        `osm:${el.type}:${el.id}`,
    name,
    industry:          queryIndustry,
    country,
    city,
    address,
    website,
    phone,
    latitude:          lat,
    longitude:         lon,
    googleBusinessUrl: null,
    confidence:        Math.min(confidence, 100),
    alreadyExists:     false,
    duplicateReason:   null,
    existingCompanyId: null,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function searchOSM(params: OsmAdapterParams): Promise<RawCandidate[]> {
  const { query, country, city, bbox, limit } = params

  if (!bbox) {
    console.warn('[OSM] No bounding box provided for:', city, country)
    return []
  }

  const elements = await queryOverpass(bbox, query, Math.min(limit + 20, 60))

  return elements
    .map(el => normalizeElement(el, query, city, country))
    .filter((c): c is RawCandidate => c !== null)
}
