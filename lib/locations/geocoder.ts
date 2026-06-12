// Server-side geocoding: HERE Geocoding API (primary) → Nominatim (fallback).
// HERE_API_KEY is never exposed to the browser.

import { getCountryConfig } from './countries'

export interface GeocodedLocation {
  city: string
  state: string | null
  country: string           // display name
  countryCode: string       // ISO2 uppercase
  latitude: number
  longitude: number
  boundingBox: [south: number, north: number, west: number, east: number] | null
  displayName: string
}

// ── HERE Geocoding ─────────────────────────────────────────────────────────────

async function geocodeWithHere(city: string, iso2: string, apiKey: string): Promise<GeocodedLocation | null> {
  try {
    const url = new URL('https://geocode.search.hereapi.com/v1/geocode')
    url.searchParams.set('q', `${city}, ${iso2}`)
    url.searchParams.set('in', `countryCode:${iso2}`)
    url.searchParams.set('limit', '1')
    url.searchParams.set('apikey', apiKey)

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'KronosLeadIntelligence/1.0' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null

    const data = await res.json() as { items?: Array<{
      title?: string
      position: { lat: number; lng: number }
      mapView?: { south: number; north: number; west: number; east: number }
      address?: { countryCode?: string; countryName?: string; county?: string; state?: string }
    }> }

    const item = data.items?.[0]
    if (!item) return null

    const mv = item.mapView
    return {
      city,
      state:       item.address?.county ?? item.address?.state ?? null,
      country:     item.address?.countryName ?? '',
      countryCode: (item.address?.countryCode ?? iso2).toUpperCase().slice(0, 2),
      latitude:    item.position.lat,
      longitude:   item.position.lng,
      boundingBox: mv ? [mv.south, mv.north, mv.west, mv.east] : null,
      displayName: item.title ?? city,
    }
  } catch {
    return null
  }
}

// ── Nominatim Geocoding ────────────────────────────────────────────────────────

async function geocodeWithNominatim(city: string, iso2: string): Promise<GeocodedLocation | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', city)
    url.searchParams.set('countrycodes', iso2.toLowerCase())
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    url.searchParams.set('addressdetails', '1')

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'KronosLeadIntelligence/1.0 (alejandro@kronosdata.tech)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return null

    const data = await res.json() as Array<{
      lat: string; lon: string
      display_name: string
      boundingbox: [string, string, string, string]
      address?: { country_code?: string; country?: string; state?: string; county?: string }
    }>

    const item = data?.[0]
    if (!item) return null

    const bb = item.boundingbox
    return {
      city,
      state:       item.address?.state ?? item.address?.county ?? null,
      country:     item.address?.country ?? '',
      countryCode: (item.address?.country_code ?? iso2).toUpperCase(),
      latitude:    parseFloat(item.lat),
      longitude:   parseFloat(item.lon),
      boundingBox: bb
        ? [parseFloat(bb[0]), parseFloat(bb[1]), parseFloat(bb[2]), parseFloat(bb[3])]
        : null,
      displayName: item.display_name ?? city,
    }
  } catch {
    return null
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function geocodeLocation(city: string, countrySlug: string): Promise<GeocodedLocation | null> {
  const country = getCountryConfig(countrySlug)
  if (!country) return null

  const apiKey = process.env.HERE_API_KEY
  if (apiKey) {
    const result = await geocodeWithHere(city, country.iso2, apiKey)
    if (result) return result
  }

  return geocodeWithNominatim(city, country.iso2)
}

// Creates a 5-point search grid (center + 4 cardinal points).
// Grid offset scales with radiusKm so we cover the city without leaving it.
export function createSearchGrid(
  lat: number, lng: number, radiusKm: number
): Array<{ lat: number; lng: number }> {
  const deg = (radiusKm * 0.5) / 111  // ~0.5 × radius in degrees
  return [
    { lat,         lng         },  // center
    { lat: lat + deg, lng         },  // north
    { lat: lat - deg, lng         },  // south
    { lat,         lng: lng + deg },  // east
    { lat,         lng: lng - deg },  // west
  ]
}
