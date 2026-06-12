// HERE Places Discovery adapter.
// Accepts a pre-geocoded position and performs grid-based discovery.
// All calls are server-side; HERE_API_KEY is never exposed to the browser.

import type { RawCandidate, HereAdapterParams } from './types'
import { ISO3_TO_SLUG } from '@/lib/locations/countries'

const DISCOVER_BASE = 'https://discover.search.hereapi.com/v1/discover'
const UA = 'KronosLeadIntelligence/1.0'

// ── HERE response types ────────────────────────────────────────────────────────

interface HereContact {
  phone?: Array<{ value: string }>
  www?:   Array<{ value: string }>
}

interface HereItem {
  id:          string
  title:       string
  resultType?: string
  position?:   { lat: number; lng: number }
  address?: {
    label?:       string
    countryCode?: string
    countryName?: string
    city?:        string
    district?:    string
    street?:      string
    houseNumber?: string
  }
  contacts?:   HereContact[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function discoverPlaces(
  lat: number, lng: number,
  query: string,
  limit: number,
  key: string,
): Promise<HereItem[]> {
  try {
    const url = new URL(DISCOVER_BASE)
    url.searchParams.set('at',     `${lat},${lng}`)
    url.searchParams.set('q',      query)
    url.searchParams.set('limit',  String(Math.min(limit, 50)))
    url.searchParams.set('apikey', key)

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) {
      console.warn(`[HERE] HTTP ${res.status} from discover endpoint`)
      return []
    }
    const data = await res.json() as { items?: HereItem[] }
    return data?.items ?? []
  } catch (err) {
    console.warn('[HERE] Fetch error:', (err as Error).message)
    return []
  }
}

function normalizeItem(
  item: HereItem,
  queryIndustry: string,
  fallbackCity: string,
  fallbackCountry: string,
): RawCandidate {
  const phone   = item.contacts?.[0]?.phone?.[0]?.value ?? null
  const website = item.contacts?.[0]?.www?.[0]?.value   ?? null

  const rawCode = item.address?.countryCode ?? ''
  const country = ISO3_TO_SLUG[rawCode.toUpperCase()]
    ?? item.address?.countryName?.toLowerCase().replace(/\s+/g, '_')
    ?? fallbackCountry

  const city    = item.address?.city ?? fallbackCity
  const street  = [item.address?.street, item.address?.houseNumber].filter(Boolean).join(' ')
  const address = item.address?.label ?? (street ? `${street}, ${city}` : `${city}, ${country}`)

  let confidence = 55
  if (website)       confidence += 20
  if (phone)         confidence += 10
  if (item.position) confidence += 10
  if (street)        confidence += 5

  return {
    source:            'here',
    externalId:        item.id,
    name:              item.title,
    industry:          queryIndustry,
    country,
    city,
    address,
    website,
    phone,
    latitude:          item.position?.lat  ?? null,
    longitude:         item.position?.lng  ?? null,
    googleBusinessUrl: null,
    confidence:        Math.min(confidence, 100),
    alreadyExists:     false,
    duplicateReason:   null,
    existingCompanyId: null,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function searchHere(params: HereAdapterParams): Promise<RawCandidate[]> {
  const key = process.env.HERE_API_KEY
  if (!key) return []

  const { query, country, city, grid, limit } = params

  // Per-point limit: enough to allow cross-point dedup and still reach total limit
  const perPointLimit = Math.min(25, Math.ceil(limit / grid.length) + 8)

  // Query each grid point in parallel
  const allResults = await Promise.all(
    grid.map(pt => discoverPlaces(pt.lat, pt.lng, query, perPointLimit, key))
  )

  // Flatten, deduplicate by HERE item ID, filter for business places only
  const seen = new Set<string>()
  const unique: HereItem[] = []
  for (const items of allResults) {
    for (const item of items) {
      if (!seen.has(item.id) && (!item.resultType || item.resultType === 'place')) {
        seen.add(item.id)
        unique.push(item)
      }
    }
  }

  return unique.map(i => normalizeItem(i, query, city, country))
}

export function hereAvailable(): boolean {
  return !!process.env.HERE_API_KEY
}
