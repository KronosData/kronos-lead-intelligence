// @legacy — Phase 4 composite scorer archived in v2.
// v2 uses lib/signal-engine/ instead: ICP Fit + Visible Symptoms + Contactability → Audit Priority.
// HOT/HIGH/MEDIUM/LOW priority labels and salesOpportunityScore are no longer computed for new prospects.
// Phase 4 — Multi-dimensional commercial scoring.
// Answers two questions separately:
//   1. Can Kronos help this company? (icpFitScore, painScore, paymentCapacityScore)
//   2. Is it worth contacting now?  (evidenceCoverageScore, commercialIntentScore, contactabilityScore)
//
// Rule: UNKNOWN data is neutral, not positive. Low evidence caps the final score.

import { HIGH_KRONOS_FIT_INDUSTRIES } from '@/lib/prospecting/config'
import { getIndustryProfile } from '@/lib/economics/industry-models'
import type { BusinessSize } from '@/lib/prospecting/config'

export type EvidenceTier = 'HIGH' | 'MEDIUM' | 'LOW'
export type SalesPriority = 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'REVIEW' | 'DISCARD'

export interface CompositeInput {
  // Company base
  name: string
  industry: string
  country: string
  website: string | null
  whatsapp: string | null
  instagram: string | null
  linkedin: string | null
  googleBusinessUrl: string | null
  entityIsCommercial: boolean
  entityType: string | null
  sellabilityClass: string | null
  budgetCapacityScore: number | null
  budgetCapacityLabel: string | null
  roiFitLabel: string | null
  roiFitScore: number | null
  salesQualificationScore: number | null   // SQS (Phase 3.9)
  contactabilityScore: number | null       // Phase 3.8
  estimatedBusinessSize: string | null
  whyContact: string[]
  whyNotContact: string[]
  entityExclusionReason: string | null
  qualificationQuestions: string[]

  // Evaluation data (may be absent at discovery stage)
  eval?: {
    opportunityScore: number | null
    scoreLeadGeneration: number | null
    scoreFollowUp: number | null
    scoreConversionProcess: number | null
    scoreAutomationOpportunity: number | null
    scoreOnlinePresence: number | null
    scoreReputation: number | null
    researchCoverage: number | null
    scoreConfidence: string | null
    signalHasWebsite: boolean
    signalHasWhatsapp: boolean
    signalHasContactForm: boolean
    signalHasBookingSystem: boolean
    signalHasGoogleBusiness: boolean
    signalHasReviews: boolean
    signalHasUnansweredReviews: boolean
    signalHasClearCta: boolean
    signalHasLeadCapture: boolean
    signalSlowResponse: boolean
    signalWeakFollowup: boolean
    signalManualWork: boolean
    signalWeakOnlinePresence: boolean
    detectedProblems: string[]
    probablePainPoint: string | null
    recommendedPackageSlug: string | null
    primaryService: string | null
  }
}

export interface CompositeResult {
  icpFitScore: number
  painScore: number
  paymentCapacityScore: number
  evidenceCoverageScore: number
  commercialIntentScore: number
  salesOpportunityScore: number
  evidenceTier: EvidenceTier
  salesPriority: SalesPriority
  qualificationReason: string | null
  disqualificationReason: string | null
  recommendedFirstAction: string
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

// ── ICP Fit (0-100): How well does this company match Kronos ideal client? ─────
// Considers: industry alignment, private entity, SMB size, has some digital presence
function computeIcpFit(input: CompositeInput): number {
  if (!input.entityIsCommercial) return 0

  const combined = normalize(`${input.industry} ${input.name}`)
  let industryFit = 35 // base for unknown industry

  for (const entry of HIGH_KRONOS_FIT_INDUSTRIES) {
    if (entry.keywords.some(kw => combined.includes(normalize(kw)))) {
      industryFit = entry.fitScore
      break
    }
  }

  // Size factor: micro/small/medium ideal, large/unknown less so
  const size = (input.estimatedBusinessSize ?? 'unknown') as BusinessSize
  const sizeFactor =
    size === 'micro'   ? 0.85 :
    size === 'small'   ? 1.00 :
    size === 'medium'  ? 0.90 :
    size === 'large'   ? 0.60 :
    /* unknown */        0.75

  const score = Math.round(industryFit * sizeFactor)
  return Math.min(100, Math.max(0, score))
}

// ── Pain Score (0-100): How visible is the commercial pain? ───────────────────
// With evaluation: use category scores. Without: use discovery signals.
function computePainScore(input: CompositeInput): number {
  if (!input.entityIsCommercial) return 0

  if (input.eval) {
    const { scoreLeadGeneration, scoreFollowUp, scoreConversionProcess, scoreAutomationOpportunity } = input.eval
    const scores = [scoreLeadGeneration, scoreFollowUp, scoreConversionProcess, scoreAutomationOpportunity].filter(s => s !== null) as number[]
    if (scores.length === 0) return 30
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    return Math.round(avg)
  }

  // No evaluation — infer from discovery data
  let pain = 30 // baseline uncertainty
  if (!input.website)          pain += 20  // no website = big problem
  if (!input.whatsapp)         pain += 10  // no WhatsApp = lead gen gap
  if (!input.googleBusinessUrl) pain += 10  // no Google Business = visibility gap
  if (!input.instagram && !input.linkedin) pain += 5  // no social

  return Math.min(80, pain) // cap at 80 without evaluation (UNKNOWN ceiling)
}

// ── Payment Capacity (0-100): Can they afford Kronos? ─────────────────────────
// Based on Phase 3.9 budget capacity + ROI fit
function computePaymentCapacity(input: CompositeInput): number {
  if (!input.entityIsCommercial) return 0

  const budgetScore = input.budgetCapacityScore ?? 40
  const roiBonus =
    input.roiFitLabel === 'excellent' ? 15 :
    input.roiFitLabel === 'good'      ? 8  :
    input.roiFitLabel === 'limited'   ? 0  :
    -15

  return Math.min(100, Math.max(0, budgetScore + roiBonus))
}

// ── Evidence Coverage (0-100): How much do we know? ──────────────────────────
function computeEvidenceCoverage(input: CompositeInput): number {
  if (input.eval?.researchCoverage !== null && input.eval?.researchCoverage !== undefined) {
    return input.eval.researchCoverage
  }
  // No evaluation: partial coverage from discovery data
  let coverage = 15 // minimum — we know name/industry/location
  if (input.website)           coverage += 10
  if (input.whatsapp)          coverage += 8
  if (input.googleBusinessUrl) coverage += 7
  if (input.instagram)         coverage += 5
  if (input.linkedin)          coverage += 5
  return Math.min(50, coverage) // discovery-only max = 50% (no evaluation = MEDIUM cap)
}

// ── Commercial Intent (0-100): Are they investing in their business digitally? ─
// With eval: signals of active digital investment.
// Without eval: basic discovery signals.
function computeCommercialIntent(input: CompositeInput): number {
  if (!input.entityIsCommercial) return 0

  let score = 10 // baseline for any known business

  if (input.eval) {
    if (input.eval.signalHasWebsite)       score += 20
    if (input.eval.signalHasGoogleBusiness) score += 15
    if (input.eval.signalHasClearCta)      score += 15
    if (input.eval.signalHasLeadCapture)   score += 15
    if (input.eval.signalHasBookingSystem) score += 10
    if (input.eval.signalHasWhatsapp)      score += 10
    if (input.eval.signalHasContactForm)   score += 5
  } else {
    if (input.website)           score += 25
    if (input.whatsapp)          score += 20
    if (input.googleBusinessUrl) score += 20
    if (input.instagram)         score += 15
    if (input.linkedin)          score += 10
  }

  return Math.min(100, score)
}

// ── Evidence Tier ─────────────────────────────────────────────────────────────
function getEvidenceTier(coverage: number): EvidenceTier {
  if (coverage >= 70) return 'HIGH'
  if (coverage >= 40) return 'MEDIUM'
  return 'LOW'
}

// ── Sales Priority ────────────────────────────────────────────────────────────
function getSalesPriority(
  compositeScore: number,
  evidenceTier: EvidenceTier,
  input: CompositeInput,
): SalesPriority {
  // Non-commercial always DISCARD
  if (!input.entityIsCommercial) return 'DISCARD'

  // Sellability gate
  if (input.sellabilityClass === 'discard') return 'DISCARD'

  // LOW evidence → always REVIEW (7% coverage must never surface as MEDIUM)
  if (evidenceTier === 'LOW') return 'REVIEW'

  if (compositeScore >= 75) return 'HOT'
  if (compositeScore >= 60) return 'HIGH'
  if (compositeScore >= 45) return 'MEDIUM'
  if (compositeScore >= 28) return 'LOW'
  return 'DISCARD'
}

// ── Qualification / Disqualification Reasons ──────────────────────────────────
function buildReasons(
  input: CompositeInput,
  scores: Pick<CompositeResult, 'icpFitScore' | 'painScore' | 'paymentCapacityScore' | 'evidenceCoverageScore'>,
  priority: SalesPriority,
): { qualificationReason: string | null; disqualificationReason: string | null; recommendedFirstAction: string } {

  if (!input.entityIsCommercial) {
    return {
      qualificationReason: null,
      disqualificationReason: input.entityExclusionReason ?? input.whyNotContact[0] ?? 'Entidad no comercial',
      recommendedFirstAction: 'No contactar. Revisar si hay una empresa relacionada que sí sea privada.',
    }
  }

  if (priority === 'DISCARD') {
    const reason = input.whyNotContact[0] ?? 'ROI no defensible o capacidad de pago insuficiente'
    return {
      qualificationReason: null,
      disqualificationReason: reason,
      recommendedFirstAction: 'Descartar del pipeline activo. Revisar en 6 meses si el sector mejora.',
    }
  }

  if (priority === 'REVIEW') {
    return {
      qualificationReason: null,
      disqualificationReason: null,
      recommendedFirstAction: 'Completar evaluación manual antes de contactar. Visitar web y verificar presencia digital.',
    }
  }

  // Build positive reason
  const reasons: string[] = []
  if (scores.icpFitScore >= 70) reasons.push(`Encaje alto con ICP de Kronos en ${input.industry}`)
  if (scores.painScore >= 60)   reasons.push('Dolor comercial claramente visible')
  if (scores.paymentCapacityScore >= 60) reasons.push('Capacidad de pago estimada media-alta')
  if (input.whyContact.length)  reasons.push(input.whyContact[0])

  const qualificationReason = reasons.slice(0, 2).join('. ') || 'Empresa privada con oportunidad identificada.'

  // First action
  let recommendedFirstAction: string
  if (priority === 'HOT') {
    recommendedFirstAction = input.whatsapp
      ? 'Enviar mensaje por WhatsApp con propuesta específica. Referir a auditoría gratuita.'
      : input.website
      ? 'Enviar email personalizado. Proponer auditoría gratuita.'
      : 'Buscar contacto directo. Auditoría gratuita como oferta de entrada.'
  } else if (priority === 'HIGH') {
    recommendedFirstAction = 'Agendar diagnóstico gratuito. Preparar propuesta de valor personalizada.'
  } else if (priority === 'MEDIUM') {
    recommendedFirstAction = 'Enviar mensaje introductorio. Proponer diagnóstico sin compromiso.'
  } else {
    recommendedFirstAction = 'Monitorear durante 30–60 días. Recontactar si hay nuevas señales.'
  }

  return { qualificationReason, disqualificationReason: null, recommendedFirstAction }
}

// ── Main Composite Scorer ─────────────────────────────────────────────────────
export function computeCompositeScore(input: CompositeInput): CompositeResult {
  const icpFitScore           = computeIcpFit(input)
  const painScore             = computePainScore(input)
  const paymentCapacityScore  = computePaymentCapacity(input)
  const evidenceCoverageScore = computeEvidenceCoverage(input)
  const commercialIntentScore = computeCommercialIntent(input)
  const contactabilityRaw     = input.contactabilityScore ?? 30

  // Weighted composite
  let raw =
    icpFitScore           * 0.25 +
    painScore             * 0.20 +
    paymentCapacityScore  * 0.20 +
    evidenceCoverageScore * 0.15 +
    commercialIntentScore * 0.10 +
    contactabilityRaw     * 0.10

  // Evidence gating: low evidence caps score (unknown ≠ positive)
  const evidenceTier = getEvidenceTier(evidenceCoverageScore)
  if (evidenceTier === 'LOW')    raw = Math.min(raw, 45)
  if (evidenceTier === 'MEDIUM') raw = Math.min(raw, 72)

  // Non-commercial: floor to 0
  if (!input.entityIsCommercial) raw = 0

  const salesOpportunityScore = Math.round(Math.min(100, Math.max(0, raw)))
  const salesPriority = getSalesPriority(salesOpportunityScore, evidenceTier, input)
  const { qualificationReason, disqualificationReason, recommendedFirstAction } =
    buildReasons(input, { icpFitScore, painScore, paymentCapacityScore, evidenceCoverageScore }, salesPriority)

  return {
    icpFitScore,
    painScore,
    paymentCapacityScore,
    evidenceCoverageScore,
    commercialIntentScore,
    salesOpportunityScore,
    evidenceTier,
    salesPriority,
    qualificationReason,
    disqualificationReason,
    recommendedFirstAction,
  }
}
