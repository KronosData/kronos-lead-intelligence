// n8n webhook integration stub
// NOT activated — requires N8N_WEBHOOK_URL in environment.
// Use for triggering automation workflows (e.g., outreach sequences, CRM updates).

export interface N8nWebhookPayload {
  event: string
  companyId: string
  data: Record<string, unknown>
}

export interface N8nStubResult {
  status: 'not_configured' | 'ok' | 'error'
  message: string
  httpStatus?: number
}

function isConfigured(): boolean {
  return !!(process.env.N8N_WEBHOOK_URL)
}

export async function triggerN8nWebhook(payload: N8nWebhookPayload): Promise<N8nStubResult> {
  if (!isConfigured()) {
    return { status: 'not_configured', message: 'N8N_WEBHOOK_URL not set — stub inactive' }
  }
  // Real implementation would POST to process.env.N8N_WEBHOOK_URL
  return { status: 'ok', message: 'stub: would trigger webhook', httpStatus: 200 }
}

export async function getN8nStatus(): Promise<{ configured: boolean; envKey: string }> {
  return { configured: isConfigured(), envKey: 'N8N_WEBHOOK_URL' }
}
