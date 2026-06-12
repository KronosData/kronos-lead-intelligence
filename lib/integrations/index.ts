// Integration adapter registry
// All adapters are stubs — none are activated by default.
// Configure via environment variables. See each stub for required keys.

export { syncContactToHubSpot, getHubSpotStatus }       from './hubspot'
export { triggerN8nWebhook, getN8nStatus }               from './n8n'
export { findEmailsByDomain, getHunterStatus }           from './hunter'
export { enrichCompany, getClayStatus }                  from './clay'
export { captureEvent, getPostHogStatus }                from './posthog'
export { sendWhatsAppMessage, checkOptIn, getWhatsAppStatus } from './whatsapp-business'

import { getHubSpotStatus }    from './hubspot'
import { getN8nStatus }        from './n8n'
import { getHunterStatus }     from './hunter'
import { getClayStatus }       from './clay'
import { getPostHogStatus }    from './posthog'
import { getWhatsAppStatus }   from './whatsapp-business'

export async function getAllIntegrationStatuses() {
  const [hubspot, n8n, hunter, clay, posthog, whatsapp] = await Promise.all([
    getHubSpotStatus(),
    getN8nStatus(),
    getHunterStatus(),
    getClayStatus(),
    getPostHogStatus(),
    getWhatsAppStatus(),
  ])
  return { hubspot, n8n, hunter, clay, posthog, whatsapp }
}
