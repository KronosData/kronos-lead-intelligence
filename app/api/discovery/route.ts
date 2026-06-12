// POST /api/discovery
// Prospect-first discovery:
//  1. Geocode city server-side (validates country match)
//  2. Create 5-point geographic grid to avoid center bias
//  3. Over-fetch 5× (capped at 150) from HERE + OSM in parallel
//  4. Enrich candidates with Prospect Fit Score and business size
//  5. Rerank by PFS, apply mode filters, return top N

import { z } from 'zod'
import { ok, badRequest, serverError } from '@/lib/api-helpers'
import { searchHere, hereAvailable } from '@/lib/discovery/here-adapter'
import { searchOSM }                 from '@/lib/discovery/osm-adapter'
import { normalizeAndDedup }         from '@/lib/discovery/normalizer'
import { geocodeLocation, createSearchGrid } from '@/lib/locations/geocoder'
import { getCountryConfig }          from '@/lib/locations/countries'
import { OVERFETCH_MULTIPLIER, MAX_OVERFETCH, DEFAULT_RADIUS_KM, DEFAULT_SEARCH_MODE } from '@/lib/prospecting/config'
import type { SearchMode } from '@/lib/discovery/types'

// ── Request schema ─────────────────────────────────────────────────────────────

const SearchSchema = z.object({
  query:               z.string().min(2).max(120),
  city:                z.string().min(2).max(100),
  country:             z.string().min(2).max(60),
  district:            z.string().max(100).optional(),
  radiusKm:            z.number().min(1).max(50).optional(),
  limit:               z.number().int().min(1).max(50).default(20),
  mode:                z.enum(['sellable', 'quick_wins', 'automation', 'conversion', 'data', 'competitive', 'contactable', 'broad']).optional(),
  excludeChains:       z.boolean().optional(),
  excludeLarge:        z.boolean().optional(),
  requireContact:      z.boolean().optional(),
  minProspectFitScore: z.number().min(0).max(100).optional(),
})

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = SearchSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid search params', parsed.error.flatten())

    const {
      query,
      city,
      country: countrySlug,
      district,
      radiusKm = DEFAULT_RADIUS_KM,
      limit,
      mode = DEFAULT_SEARCH_MODE as SearchMode,
      excludeChains,
      excludeLarge,
      requireContact,
      minProspectFitScore,
    } = parsed.data

    // ── 1. Resolve country config ────────────────────────────────────────────────

    const countryConfig = getCountryConfig(countrySlug)
    if (!countryConfig) {
      return badRequest(`Unknown country: ${countrySlug}`)
    }

    // ── 2. Geocode city server-side ──────────────────────────────────────────────

    const geocoded = await geocodeLocation(city, countrySlug)
    if (!geocoded) {
      return badRequest(`Could not geocode city "${city}" in ${countryConfig.label}`)
    }

    // Validate that geocoding returned the expected country
    const geocodedIso2 = geocoded.countryCode.toUpperCase()
    const expectedIso2 = countryConfig.iso2.toUpperCase()
    if (geocodedIso2 !== expectedIso2) {
      return badRequest(
        `City "${city}" resolved to country ${geocodedIso2} but expected ${expectedIso2}. ` +
        `Try using a city from ${countryConfig.label}.`
      )
    }

    // ── 3. Build geographic grid ─────────────────────────────────────────────────

    const grid = createSearchGrid(geocoded.latitude, geocoded.longitude, radiusKm)

    // ── 4. Over-fetch from adapters ──────────────────────────────────────────────

    const overFetchLimit = Math.min(limit * OVERFETCH_MULTIPLIER, MAX_OVERFETCH)

    const hereParams = {
      query,
      country:     countrySlug,
      city:        district ?? city,
      position:    { lat: geocoded.latitude, lng: geocoded.longitude },
      grid,
      limit:       overFetchLimit,
      countryIso3: countryConfig.iso3,
    }

    const osmParams = {
      query,
      country:  countrySlug,
      city:     district ?? city,
      position: { lat: geocoded.latitude, lng: geocoded.longitude },
      bbox:     geocoded.boundingBox,
      limit:    overFetchLimit,
    }

    const [hereResults, osmResults] = await Promise.all([
      hereAvailable() ? searchHere(hereParams) : Promise.resolve([]),
      searchOSM(osmParams),
    ])

    // ── 5. Normalize, enrich, rerank ─────────────────────────────────────────────

    const candidates = await normalizeAndDedup(hereResults, osmResults, {
      limit,
      mode,
      excludeChains,
      excludeLarge,
      requireContact,
      minProspectFitScore,
    })

    return ok({
      candidates,
      meta: {
        city:          geocoded.city,
        state:         geocoded.state,
        country:       countryConfig.label,
        countryCode:   geocoded.countryCode,
        latitude:      geocoded.latitude,
        longitude:     geocoded.longitude,
        gridPoints:    grid.length,
        radiusKm,
        mode,
        overFetched:   hereResults.length + osmResults.length,
        afterFilters:  candidates.length,
        sources: {
          here:      hereAvailable(),
          osm:       true,
          hereRaw:   hereResults.length,
          osmRaw:    osmResults.length,
        },
      },
    })
  } catch (err) {
    return serverError(err)
  }
}
