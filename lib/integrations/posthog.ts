// PostHog analytics stub
// NOT activated — requires POSTHOG_API_KEY in environment.
// Use for tracking CRM events, funnel conversions, and sales actions.

export interface PostHogEvent {
  distinctId: string
  event: string
  properties?: Record<string, unknown>
}

export interface PostHogStubResult {
  status: 'not_configured' | 'ok' | 'error'
  message: string
}

function isConfigured(): boolean {
  return !!(process.env.POSTHOG_API_KEY)
}

export async function captureEvent(event: PostHogEvent): Promise<PostHogStubResult> {
  if (!isConfigured()) {
    return { status: 'not_configured', message: 'POSTHOG_API_KEY not set — stub inactive' }
  }
  // Real implementation: POST to https://app.posthog.com/capture/
  return { status: 'ok', message: `stub: would capture event ${event.event}` }
}

export async function getPostHogStatus(): Promise<{ configured: boolean; envKey: string }> {
  return { configured: isConfigured(), envKey: 'POSTHOG_API_KEY' }
}
