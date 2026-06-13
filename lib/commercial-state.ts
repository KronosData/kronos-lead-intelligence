// Commercial state engine.
// Maps evidence + scoring data to a single actionable commercial state.
// This is distinct from SalesPriority (which is a score tier).
// CommericalState drives outreach workflow: what to do next with this account.

export type CommercialState =
  | 'READY_TO_CONTACT'    // Strong ICP fit + contactability + confirmed pain → contact now
  | 'OFFER_AUDIT'         // Good fit + reachable, but no confirmed pain → offer free audit
  | 'RESEARCH_REQUIRED'   // Insufficient evidence (<40% coverage) → investigate first
  | 'NURTURE'             // Fit but not the right moment or missing contact → keep warm
  | 'DISQUALIFIED'        // Non-commercial, discard sellability, or exclusion reason

export interface CommercialStateInput {
  // Qualification outputs
  entityIsCommercial: boolean
  sellabilityClass: string | null
  icpFitScore: number           // 0–100
  contactabilityScore: number   // 0–100
  painScore: number             // 0–100

  // Evidence quality
  coveragePercent: number       // 0–100 (researchCoverage)

  // Verification
  websiteVerificationStatus: string | null
}

export function computeCommercialState(input: CommercialStateInput): CommercialState {
  // Hard disqualifiers
  if (!input.entityIsCommercial) return 'DISQUALIFIED'
  if (input.sellabilityClass === 'discard') return 'DISQUALIFIED'

  // Insufficient evidence — must research before any action
  if (input.coveragePercent < 40) return 'RESEARCH_REQUIRED'

  // Mismatch website — we may have analyzed the wrong site, can't trust signals
  if (input.websiteVerificationStatus === 'MISMATCH') return 'RESEARCH_REQUIRED'

  const hasGoodFit      = input.icpFitScore >= 50
  const isReachable     = input.contactabilityScore >= 40
  const hasConfirmedPain = input.painScore >= 50

  if (hasGoodFit && isReachable && hasConfirmedPain) return 'READY_TO_CONTACT'
  if (hasGoodFit && isReachable) return 'OFFER_AUDIT'
  if (hasGoodFit) return 'NURTURE'

  return 'RESEARCH_REQUIRED'
}
