import type { SignalFlags, ServiceMatchOutput, ImplementationDifficulty, KronosService } from './types'
import { KRONOS_SERVICES } from './constants'

// ─── Service trigger rules ────────────────────────────────────────────────────
// Each rule maps signal conditions to a service key from KRONOS_SERVICES

function getMatchedServiceKeys(s: SignalFlags): string[] {
  const matched: string[] = []

  if (!s.signalHasWhatsapp || s.signalSlowResponse || s.signalWeakFollowup) {
    matched.push('whatsapp_automation')
  }

  if (!s.signalHasBookingSystem) {
    matched.push('appointment_booking')
  }

  if (!s.signalHasContactForm || !s.signalHasLeadCapture || !s.signalHasClearCta) {
    matched.push('lead_capture_funnel')
  }

  if (s.signalWeakFollowup && s.signalManualWork) {
    matched.push('crm_followup_automation')
  }

  if (!s.signalHasGoogleBusiness) {
    matched.push('google_business_setup')
  }

  if (s.signalHasUnansweredReviews) {
    matched.push('review_management')
  }

  if (!s.signalHasInstagram && s.signalWeakOnlinePresence) {
    matched.push('social_media_presence')
  }

  if (!s.signalHasWebsite) {
    matched.push('website_development')
  }

  // Sales process automation requires all three major operational problems
  if (s.signalSlowResponse && s.signalWeakFollowup && s.signalManualWork) {
    matched.push('sales_process_automation')
  }

  // Digital presence audit is a catch-all for weak online presence
  if (s.signalWeakOnlinePresence) {
    matched.push('digital_presence_audit')
  }

  return matched
}

// ─── Difficulty aggregation ───────────────────────────────────────────────────

const DIFFICULTY_RANK: Record<ImplementationDifficulty, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

function aggregateDifficulty(services: KronosService[]): ImplementationDifficulty {
  if (services.length === 0) return 'low'
  const max = Math.max(...services.map((s) => DIFFICULTY_RANK[s.difficulty]))
  return (Object.keys(DIFFICULTY_RANK) as ImplementationDifficulty[]).find(
    (k) => DIFFICULTY_RANK[k] === max
  ) ?? 'low'
}

// ─── Time estimate aggregation ────────────────────────────────────────────────

function aggregateTimeEstimate(services: KronosService[]): string {
  if (services.length === 0) return '1 semana'
  if (services.length === 1) return services[0].timeEstimate

  // Estimate based on highest difficulty service as anchor
  const highestDiff = aggregateDifficulty(services)
  if (highestDiff === 'high') return '6–12 semanas'
  if (highestDiff === 'medium') return '3–6 semanas'
  return '1–3 semanas'
}

// ─── Main service match function ──────────────────────────────────────────────

export function matchServices(signals: SignalFlags): ServiceMatchOutput {
  const matchedKeys = getMatchedServiceKeys(signals)
  const matchedServices = matchedKeys
    .map((key) => KRONOS_SERVICES[key])
    .filter(Boolean)

  const recommendedServices = matchedServices.map((s) => s.name)

  const totalPriceMin = matchedServices.reduce((sum, s) => sum + s.priceMin, 0)
  const totalPriceMax = matchedServices.reduce((sum, s) => sum + s.priceMax, 0)

  return {
    recommendedServices,
    implementationDifficulty: aggregateDifficulty(matchedServices),
    implementationTimeEstimate: aggregateTimeEstimate(matchedServices),
    estimatedProjectPriceMin: totalPriceMin,
    estimatedProjectPriceMax: totalPriceMax,
  }
}
