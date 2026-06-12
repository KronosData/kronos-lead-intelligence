// HubSpot CRM integration stub
// NOT activated — requires HUBSPOT_API_KEY in environment.
// All functions are no-ops unless the key is configured.

export interface HubSpotContactPayload {
  email?: string
  firstName?: string
  lastName?: string
  company?: string
  phone?: string
  website?: string
}

export interface HubSpotStubResult {
  status: 'not_configured' | 'ok' | 'error'
  message: string
  data?: unknown
}

function isConfigured(): boolean {
  return !!(process.env.HUBSPOT_API_KEY)
}

export async function syncContactToHubSpot(payload: HubSpotContactPayload): Promise<HubSpotStubResult> {
  if (!isConfigured()) {
    return { status: 'not_configured', message: 'HUBSPOT_API_KEY not set — stub inactive' }
  }
  // Real implementation would POST to https://api.hubapi.com/crm/v3/objects/contacts
  return { status: 'ok', message: 'stub: would sync contact', data: payload }
}

export async function getHubSpotStatus(): Promise<{ configured: boolean; envKey: string }> {
  return { configured: isConfigured(), envKey: 'HUBSPOT_API_KEY' }
}
