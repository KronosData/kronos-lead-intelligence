import type { CommercialStateV2 } from './types'

// v2 commercial state: determines what action to take with a prospect.
// Does NOT depend on ROI, revenue loss, or diagnosis.
// Depends ONLY on: ICP fit, visible symptoms, contactability, data coverage.

export interface CommercialStateV2Input {
  isCommercial: boolean
  icpFitScore: number         // 0-100
  visibleSymptomsScore: number // 0-100
  contactabilityScore: number  // 0-100
  evidenceCoverage: number     // 0-100
}

export function computeCommercialStateV2(input: CommercialStateV2Input): CommercialStateV2 {
  // Gate 1: Non-commercial entity
  if (!input.isCommercial) return 'DISQUALIFIED'

  // Gate 2: ICP score too low — not a Kronos prospect
  if (input.icpFitScore < 15) return 'DISQUALIFIED'

  // Gate 3: Almost no data and can't contact → need research first
  if (input.evidenceCoverage < 15 && input.contactabilityScore < 25) return 'RESEARCH_REQUIRED'

  // OFFER_AUDIT: good fit + visible reasons to investigate + contactable
  if (
    input.icpFitScore >= 40 &&
    input.visibleSymptomsScore >= 20 &&
    input.contactabilityScore >= 40
  ) return 'OFFER_AUDIT'

  // CONTACT_READY: very contactable + good fit — reach out even without many confirmed symptoms
  // (audit will discover the symptoms live)
  if (input.icpFitScore >= 40 && input.contactabilityScore >= 65) return 'CONTACT_READY'

  // OFFER_AUDIT with marginal ICP but clear symptoms + some contactability
  if (
    input.icpFitScore >= 30 &&
    input.visibleSymptomsScore >= 30 &&
    input.contactabilityScore >= 30
  ) return 'OFFER_AUDIT'

  // Everything else → need more data before acting
  return 'RESEARCH_REQUIRED'
}
