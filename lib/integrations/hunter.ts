// Hunter.io email finder stub
// NOT activated — requires HUNTER_API_KEY in environment.
// Use to find verified contact emails for a given domain.

export interface HunterDomainSearchResult {
  status: 'not_configured' | 'ok' | 'error'
  message: string
  emails?: Array<{ value: string; confidence: number; type: string }>
}

function isConfigured(): boolean {
  return !!(process.env.HUNTER_API_KEY)
}

export async function findEmailsByDomain(domain: string): Promise<HunterDomainSearchResult> {
  if (!isConfigured()) {
    return { status: 'not_configured', message: 'HUNTER_API_KEY not set — stub inactive' }
  }
  // Real implementation: GET https://api.hunter.io/v2/domain-search?domain={domain}&api_key={key}
  return { status: 'ok', message: `stub: would search emails for ${domain}`, emails: [] }
}

export async function getHunterStatus(): Promise<{ configured: boolean; envKey: string }> {
  return { configured: isConfigured(), envKey: 'HUNTER_API_KEY' }
}
