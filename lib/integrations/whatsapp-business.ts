// WhatsApp Business API stub
// NOT activated — requires WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in environment.
// IMPORTANT: Never auto-send messages. This stub only logs intent.
// All actual sends must be manually initiated by a human.

export interface WhatsAppMessagePayload {
  to: string
  body: string
  companyId: string
  channel: 'whatsapp'
}

export interface WhatsAppStubResult {
  status: 'not_configured' | 'blocked' | 'ok' | 'error'
  message: string
}

function isConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)
}

export async function sendWhatsAppMessage(_payload: WhatsAppMessagePayload): Promise<WhatsAppStubResult> {
  // ALWAYS blocked — auto-sending is prohibited per project policy.
  return {
    status: 'blocked',
    message: 'Auto-send is disabled. Copy the message and send manually via WhatsApp.',
  }
}

export async function checkOptIn(_phone: string): Promise<{ hasOptIn: boolean }> {
  // Would check opt-in registry — always false until real opt-in system exists
  return { hasOptIn: false }
}

export async function getWhatsAppStatus(): Promise<{ configured: boolean; autoSendBlocked: boolean; envKeys: string[] }> {
  return {
    configured: isConfigured(),
    autoSendBlocked: true,
    envKeys: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID'],
  }
}
