// GET /api/locations/search?query=Lima&country=peru
// Server-side geocoding API used by the discover page for city validation.
// HERE_API_KEY is never exposed to the browser.

import { geocodeLocation } from '@/lib/locations/geocoder'
import { getCountryConfig } from '@/lib/locations/countries'
import { ok, badRequest } from '@/lib/api-helpers'

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const query       = searchParams.get('query')?.trim()
  const countrySlug = searchParams.get('country')?.trim()

  if (!query || query.length < 2) return badRequest('query must be at least 2 characters')
  if (!countrySlug)               return badRequest('country is required')

  const country = getCountryConfig(countrySlug)
  if (!country) return badRequest(`Unknown country: ${countrySlug}`)

  const result = await geocodeLocation(query, countrySlug)
  if (!result) return ok({ result: null, valid: false, suggestedCities: country.cities })

  // Validate: geocoded city must be in the expected country
  const valid = result.countryCode.toUpperCase() === country.iso2.toUpperCase()

  return ok({ result, valid, suggestedCities: country.cities })
}
