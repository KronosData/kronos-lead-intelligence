// Clay.com enrichment stub
// NOT activated — requires CLAY_API_KEY in environment.
// Use for enriching company data (firmographics, technographics, contact discovery).

export interface ClayEnrichmentPayload {
  companyName: string
  website?: string
  country?: string
}

export interface ClayEnrichmentResult {
  status: 'not_configured' | 'ok' | 'error'
  message: string
  enriched?: Record<string, unknown>
}

function isConfigured(): boolean {
  return !!(process.env.CLAY_API_KEY)
}

export async function enrichCompany(payload: ClayEnrichmentPayload): Promise<ClayEnrichmentResult> {
  if (!isConfigured()) {
    return { status: 'not_configured', message: 'CLAY_API_KEY not set — stub inactive' }
  }
  // Real implementation would call Clay's enrichment API
  return { status: 'ok', message: `stub: would enrich ${payload.companyName}`, enriched: {} }
}

export async function getClayStatus(): Promise<{ configured: boolean; envKey: string }> {
  return { configured: isConfigured(), envKey: 'CLAY_API_KEY' }
}
