// OpenStreetMap adapter.
// Uses Nominatim for geocoding and Overpass API for business discovery.
// Both services are free and require no API key.
// IMPORTANT: Nominatim ToS requires a valid User-Agent with contact email.

import type { DiscoveryCandidate, DiscoverySearchParams } from './types'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_BASE  = 'https://overpass-api.de/api/interpreter'
const UA = 'KronosLeadIntelligence/1.0 (alejandro@kronosdata.tech)'

// ── OSM response types ─────────────────────────────────────────────────────

interface NominatimResult {
  lat: string
  lon: string
  boundingbox: [string, string, string, string] // [minlat, maxlat, minlon, maxlon]
  display_name: string
  address?: { country_code?: string; country?: string }
}

interface OverpassTags {
  name?:               string
  'addr:street'?:      string
  'addr:housenumber'?: string
  'addr:city'?:        string
  'addr:country'?:     string
  phone?:              string
  'contact:phone'?:    string
  website?:            string
  'contact:website'?:  string
  'contact:instagram'?: string
  [key: string]:       string | undefined
}

interface OverpassElement {
  type:    'node' | 'way' | 'relation'
  id:      number
  lat?:    number
  lon?:    number
  center?: { lat: number; lon: number }
  tags?:   OverpassTags
}

// ── Industry → OSM tag mapping ─────────────────────────────────────────────
// Each entry maps a keyword (matched against the query) to OSM key=value pairs.

const INDUSTRY_TAGS: Array<{ keywords: string[]; tags: Array<[string, string]> }> = [
  { keywords: ['dental', 'dentist', 'odontolog', 'clínica dental', 'clinica dental'],
    tags: [['amenity', 'dentist']] },
  { keywords: ['clinic', 'clínica', 'clinica', 'healthcare'],
    tags: [['amenity', 'clinic'], ['amenity', 'hospital'], ['healthcare', 'clinic']] },
  { keywords: ['hospital'],
    tags: [['amenity', 'hospital']] },
  { keywords: ['farmacia', 'pharmacy', 'drug'],
    tags: [['amenity', 'pharmacy']] },
  { keywords: ['restaurant', 'restaurante', 'comida', 'food'],
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
  { keywords: ['escuela', 'school', 'colegio', 'instituto'],
    tags: [['amenity', 'school']] },
  { keywords: ['universidad', 'university'],
    tags: [['amenity', 'university']] },
  { keywords: ['supermarket', 'supermercado', 'market'],
    tags: [['shop', 'supermarket']] },
  { keywords: ['beauty', 'salon', 'salón', 'estética', 'estetica', 'peluquería'],
    tags: [['shop', 'hairdresser'], ['shop', 'beauty']] },
  { keywords: ['veterinaria', 'veterinario', 'vet'],
    tags: [['amenity', 'veterinary']] },
  { keywords: ['banco', 'bank'],
    tags: [['amenity', 'bank']] },
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
    .slice(0, 3) // use at most 3 terms to keep regex manageable
}

// ── Country normalizer ─────────────────────────────────────────────────────

const CC_TO_VALUE: Record<string, string> = {
  pe: 'peru', mx: 'mexico', co: 'colombia', cl: 'chile',
  ar: 'argentina', es: 'spain', ec: 'ecuador', bo: 'bolivia',
  uy: 'uruguay', py: 'paraguay', cr: 'costa_rica', pa: 'panama',
  gt: 'guatemala', hn: 'honduras', sv: 'el_salvador', ni: 'nicaragua',
}

function normalizeCountry(cc: string | undefined, fallback: string): string {
  if (!cc) return fallback.toLowerCase()
  return CC_TO_VALUE[cc.toLowerCase()] ?? fallback.toLowerCase()
}

// ── Nominatim geocode ──────────────────────────────────────────────────────

async function geocodeNominatim(city: string, country: string): Promise<NominatimResult | null> {
  const url = new URL(NOMINATIM_BASE)
  url.searchParams.set('q', `${city}, ${country}`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('addressdetails', '1')

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return null
    const data = await res.json() as NominatimResult[]
    return data?.[0] ?? null
  } catch {
    return null
  }
}

// ── Overpass query ─────────────────────────────────────────────────────────

async function queryOverpass(
  bbox: [string, string, string, string], // [minlat, maxlat, minlon, maxlon]
  query: string,
  limit: number,
): Promise<OverpassElement[]> {
  const [minlat, maxlat, minlon, maxlon] = bbox
  const bboxStr = `${minlat},${minlon},${maxlat},${maxlon}`

  const tagFilters = inferOSMTags(query)
  const terms      = extractSearchTerms(query)

  const nodeWay = (filter: string) =>
    `node${filter}(${bboxStr});way${filter}(${bboxStr});`

  let filters: string

  if (tagFilters.length > 0) {
    // Use specific tag filters — more precise
    const tagParts = tagFilters.map(([k, v]) => nodeWay(`["${k}"="${v}"]`)).join('')
    if (terms.length > 0) {
      // Also include name~ fallback for same tags
      const pattern = terms.join('|')
      filters = tagParts + nodeWay(`["name"~"${pattern}",i]`)
    } else {
      filters = tagParts
    }
  } else if (terms.length > 0) {
    // Fall back to name~ search only
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

// ── Normalize OSM element → DiscoveryCandidate ─────────────────────────────

function normalizeElement(
  el: OverpassElement,
  queryIndustry: string,
  fallbackCity: string,
  fallbackCountry: string,
): DiscoveryCandidate | null {
  const tags = el.tags ?? {}
  const name = tags.name?.trim()
  if (!name || name.length < 2) return null

  const lat  = el.lat  ?? el.center?.lat ?? null
  const lon  = el.lon  ?? el.center?.lon ?? null
  const city = tags['addr:city'] ?? fallbackCity
  const cc   = tags['addr:country']
  const country = normalizeCountry(cc, fallbackCountry)

  const street = [tags['addr:street'], tags['addr:housenumber']]
    .filter(Boolean).join(' ')
  const address = street ? `${street}, ${city}` : `${city}, ${country}`

  const phone   = tags.phone ?? tags['contact:phone'] ?? null
  const website = tags.website ?? tags['contact:website'] ?? null

  let confidence = 35
  if (website)      confidence += 25
  if (phone)        confidence += 15
  if (lat !== null) confidence += 10
  if (street)       confidence += 10
  if (city !== fallbackCity) confidence += 5 // city detected from tags

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

// ── Public API ─────────────────────────────────────────────────────────────

export async function searchOSM(params: DiscoverySearchParams): Promise<DiscoveryCandidate[]> {
  const { query, city, country, limit } = params

  const geo = await geocodeNominatim(city, country)
  if (!geo) {
    console.warn('[OSM] Could not geocode:', city, country)
    return []
  }

  const bbox = geo.boundingbox
  const elements = await queryOverpass(bbox, query, Math.min(limit + 10, 40))

  return elements
    .map(el => normalizeElement(el, query, city, country))
    .filter((c): c is DiscoveryCandidate => c !== null)
}
