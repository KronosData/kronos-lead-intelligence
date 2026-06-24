import type { SignalEvidenceMap } from './types'

// Contactability Score (0-100): how reachable is this company for outreach.
// Higher = easier to initiate contact and get a response.

export interface ContactabilityInput {
  websiteVerificationStatus?: string | null
  hasPhone: boolean
  hasWhatsapp: boolean
  hasEmail?: boolean
  evidence?: SignalEvidenceMap
  hasInstagram?: boolean
  hasLinkedin?: boolean
}

export function computeContactabilityV2(input: ContactabilityInput): number {
  let score = 0

  const ev = input.evidence ?? {}

  // Active, usable website (20 pts)
  const websiteUsable = ['VERIFIED', 'UNVERIFIED'].includes(input.websiteVerificationStatus ?? '')
  if (websiteUsable) score += 20

  // WhatsApp — highest conversion direct channel (30 pts)
  const hasWa = input.hasWhatsapp || ev['signalHasWhatsapp']?.status === 'positive'
  if (hasWa) score += 30

  // Phone (20 pts)
  if (input.hasPhone) score += 20

  // Contact form or email (15 pts)
  const hasForm = ev['signalHasContactForm']?.status === 'positive'
  if (input.hasEmail || hasForm) score += 15

  // Social media (5 pts each, max 10)
  const hasIg = input.hasInstagram || ev['signalHasInstagram']?.status === 'positive'
  const hasLi = input.hasLinkedin || ev['signalHasLinkedin']?.status === 'positive'
  if (hasIg) score += 5
  if (hasLi) score += 5

  // Google Business (5 pts — findable/contactable via platform)
  if (ev['signalHasGoogleBusiness']?.status === 'positive') score += 5

  return Math.min(100, score)
}
