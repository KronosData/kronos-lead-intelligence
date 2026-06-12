import type { SignalFlags, ServiceMatchOutput, ImplementationDifficulty, KronosService } from './types'
import { KRONOS_SERVICES } from './constants'

// ─── Service trigger rules ────────────────────────────────────────────────────

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

  if (s.signalSlowResponse && s.signalWeakFollowup && s.signalManualWork) {
    matched.push('sales_process_automation')
  }

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

// ─── Tiered service selection ─────────────────────────────────────────────────
// Returns: { primaryKey, complementaryKeys, futureKeys }
// Low coverage (< 40%): primary = audit (diagnostic step)
// High coverage: primary determined by confirmed impact priority

const PRIMARY_PRIORITY_ORDER = [
  'website_development',
  'whatsapp_automation',
  'appointment_booking',
  'lead_capture_funnel',
  'crm_followup_automation',
  'google_business_setup',
  'social_media_presence',
  'review_management',
  'sales_process_automation',
]

function selectTieredKeys(
  matchedKeys: string[],
  coverage: number,
): { primaryKey: string; complementaryKeys: string[]; futureKeys: string[] } {
  if (matchedKeys.length === 0) {
    return { primaryKey: 'digital_presence_audit', complementaryKeys: [], futureKeys: [] }
  }

  let primaryKey: string
  let remaining: string[]

  if (coverage < 40) {
    // Low evidence → lead with the diagnostic; safer and more honest
    primaryKey = 'digital_presence_audit'
    remaining = matchedKeys.filter((k) => k !== 'digital_presence_audit')
  } else {
    // Pick highest-impact confirmed service
    const byPriority = PRIMARY_PRIORITY_ORDER.find((k) => matchedKeys.includes(k))
    primaryKey = byPriority ?? matchedKeys[0]
    remaining = matchedKeys.filter((k) => k !== primaryKey)
  }

  // Prefer quick-win complementary services (low difficulty first)
  const sorted = [...remaining].sort((a, b) => {
    const da = DIFFICULTY_RANK[KRONOS_SERVICES[a]?.difficulty ?? 'low']
    const db = DIFFICULTY_RANK[KRONOS_SERVICES[b]?.difficulty ?? 'low']
    return da - db
  })

  const complementaryKeys = sorted.slice(0, 2)
  const futureKeys = sorted.slice(2)

  return { primaryKey, complementaryKeys, futureKeys }
}

// ─── Main service match function ──────────────────────────────────────────────

export function matchServices(signals: SignalFlags, coverage = 100): ServiceMatchOutput {
  const matchedKeys = getMatchedServiceKeys(signals)
  const { primaryKey, complementaryKeys, futureKeys } = selectTieredKeys(matchedKeys, coverage)

  const primarySvc = KRONOS_SERVICES[primaryKey]
  const complementarySvcs = complementaryKeys.map((k) => KRONOS_SERVICES[k]).filter(Boolean)

  const primaryName = primarySvc?.name ?? primaryKey
  const complementaryNames = complementarySvcs.map((s) => s.name)
  const futureNames = futureKeys.map((k) => KRONOS_SERVICES[k]?.name ?? k).filter(Boolean)

  // Price = primary + complementary only (max 3 services total in proposal)
  const priceMin = [primarySvc, ...complementarySvcs].filter(Boolean).reduce((sum, s) => sum + s.priceMin, 0)
  const priceMax = [primarySvc, ...complementarySvcs].filter(Boolean).reduce((sum, s) => sum + s.priceMax, 0)

  const priceLabel = coverage < 40 ? 'Rango preliminar' : 'Estimado'

  return {
    recommendedServices: [primaryName, ...complementaryNames],
    primaryService: primaryName,
    complementaryServices: complementaryNames,
    futureServices: futureNames,
    implementationDifficulty: aggregateDifficulty([primarySvc, ...complementarySvcs].filter(Boolean)),
    implementationTimeEstimate: primarySvc?.timeEstimate ?? '1 semana',
    estimatedProjectPriceMin: priceMin,
    estimatedProjectPriceMax: priceMax,
    priceLabel,
  }
}
