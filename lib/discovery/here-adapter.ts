// HERE Places Discovery adapter.
// Uses HERE Geocoding API to resolve city → coordinates,
// then HERE Discover API to find businesses by free-text query.
// Requires server-side HERE_API_KEY env var (never exposed to browser).

import type { DiscoveryCandidate, DiscoverySearchParams } from './types'

const GEOCODE_BASE  = 'https://geocode.search.hereapi.com/v1/geocode'
const DISCOVER_BASE = 'https://discover.search.hereapi.com/v1/discover'
const UA = 'KronosLeadIntelligence/1.0'

// ── HERE response types ────────────────────────────────────────────────────

interface HerePosition { lat: number; lng: number }

interface HereGeoItem {
  position?: HerePosition
}

interface HereContact {
  phone?: Array<{ value: string }>
  www?:   Array<{ value: string }>
}

interface HereItem {
  id:           string
  title:        string
  resultType?:  string
  position?:    HerePosition
  address?: {
    label?:        string
    countryCode?:  string
    countryName?:  string
    city?:         string
    district?:     string
    street?:       string
    houseNumber?:  string
  }
  contacts?:   HereContact[]
  categories?: Array<{ id: string; name: string }>
}

// ── Country code normalizer (HERE uses ISO 3166-1 alpha-3) ────────────────

const ISO3_TO_VALUE: Record<string, string> = {
  PER: 'peru',   MEX: 'mexico', COL: 'colombia', CHL: 'chile',
  ARG: 'argentina', ESP: 'spain', ECU: 'ecuador', BOL: 'bolivia',
  URY: 'uruguay', PRY: 'paraguay', CRI: 'costa_rica', PAN: 'panama',
  GTM: 'guatemala', HND: 'honduras', SLV: 'el_salvador', NIC: 'nicaragua',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function apiUrl(base: string, params: Record<string, string>): string {
  const u = new URL(base)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  return u.toString()
}

async function hereGet(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) {
      // Don't log full URL — it contains the API key
      console.warn(`[HERE] HTTP ${res.status} from ${res.url.split('?')[0]}`)
      return null
    }
    return res.json()
  } catch (err) {
    console.warn('[HERE] Fetch error:', (err as Error).message)
    return null
  }
}

// ── Geocode city ───────────────────────────────────────────────────────────

async function geocodeCity(
  city: string,
  country: string,
  key: string,
): Promise<HerePosition | null> {
  const url = apiUrl(GEOCODE_BASE, {
    q:      `${city}, ${country}`,
    limit:  '1',
    apiKey: key,
  })
  const data = await hereGet(url) as { items?: HereGeoItem[] } | null
  return data?.items?.[0]?.position ?? null
}

// ── Discover places ────────────────────────────────────────────────────────

async function discoverPlaces(
  pos: HerePosition,
  query: string,
  limit: number,
  key: string,
): Promise<HereItem[]> {
  const url = apiUrl(DISCOVER_BASE, {
    at:     `${pos.lat},${pos.lng}`,
    q:      query,
    limit:  String(limit),
    apiKey: key,
  })
  const data = await hereGet(url) as { items?: HereItem[] } | null
  return data?.items ?? []
}

// ── Normalize a HERE item → DiscoveryCandidate ────────────────────────────

function normalizeItem(
  item: HereItem,
  queryIndustry: string,
  fallbackCity: string,
  fallbackCountry: string,
): DiscoveryCandidate {
  const phone   = item.contacts?.[0]?.phone?.[0]?.value ?? null
  const website = item.contacts?.[0]?.www?.[0]?.value   ?? null

  const rawCode = item.address?.countryCode ?? ''
  const country = ISO3_TO_VALUE[rawCode.toUpperCase()] ?? item.address?.countryName?.toLowerCase() ?? fallbackCountry

  const city    = item.address?.city ?? fallbackCity
  const street  = [item.address?.street, item.address?.houseNumber].filter(Boolean).join(' ')
  const address = item.address?.label ?? (street ? `${street}, ${city}` : `${city}, ${country}`)

  let confidence = 55
  if (website)           confidence += 20
  if (phone)             confidence += 10
  if (item.position)     confidence += 10
  if (street)            confidence += 5

  return {
    source:              'here',
    externalId:          item.id,
    name:                item.title,
    industry:            queryIndustry,
    country,
    city,
    address,
    website,
    phone,
    latitude:            item.position?.lat  ?? null,
    longitude:           item.position?.lng  ?? null,
    googleBusinessUrl:   null,
    confidence:          Math.min(confidence, 100),
    alreadyExists:       false,
    duplicateReason:     null,
    existingCompanyId:   null,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function searchHere(params: DiscoverySearchParams): Promise<DiscoveryCandidate[]> {
  const key = process.env.HERE_API_KEY
  if (!key) return []

  const { query, city, country, limit } = params

  const pos = await geocodeCity(city, country, key)
  if (!pos) {
    console.warn('[HERE] Could not geocode:', city, country)
    return []
  }

  const items = await discoverPlaces(pos, `${query} ${city}`, Math.min(limit, 50), key)

  return items
    // Keep only business places (exclude roads, localities, etc.)
    .filter(i => !i.resultType || i.resultType === 'place')
    .map(i => normalizeItem(i, query, city, country))
}

export function hereAvailable(): boolean {
  return !!process.env.HERE_API_KEY
}
