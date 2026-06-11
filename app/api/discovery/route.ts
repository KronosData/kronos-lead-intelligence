// POST /api/discovery
// Searches for potential client companies via HERE Places (primary) and OSM (fallback).
// Returns normalized, deduplicated candidates with existing-DB flags.

import { z } from 'zod'
import { ok, badRequest, serverError } from '@/lib/api-helpers'
import { searchHere, hereAvailable } from '@/lib/discovery/here-adapter'
import { searchOSM } from '@/lib/discovery/osm-adapter'
import { normalizeAndDedup } from '@/lib/discovery/normalizer'

const SearchSchema = z.object({
  query:   z.string().min(2).max(120),
  city:    z.string().min(2).max(100),
  country: z.string().min(2).max(50),
  limit:   z.number().int().min(1).max(50).default(20),
})

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = SearchSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid search params', parsed.error.flatten())

    const params = parsed.data

    // Try HERE first; fall back to OSM only
    let hereResults = hereAvailable() ? await searchHere(params) : []
    const osmResults = await searchOSM(params)

    const candidates = await normalizeAndDedup(hereResults, osmResults, params.limit)

    return ok({
      candidates,
      sources: {
        here: hereAvailable(),
        osm:  true,
        hereCount: hereResults.length,
        osmCount:  osmResults.length,
      },
    })
  } catch (err) {
    return serverError(err)
  }
}
