// @legacy — replaced by lib/signal-engine/ in v2.
// v2 uses computeIcpFit() + computeVisibleSymptoms() + computeContactabilityV2() instead.
// Archived: do not import in new routes.
// Prospect Fit Score: measures how sellable a candidate is for Kronos.
// Computed at discovery time from available data (before web analysis).
// Score range: 0–100.
// Component weights: opportunityVisible×0.35 + contactability×0.20 + kronosFit×0.20
//                    + pymeProbability×0.15 + evidenceQuality×0.10

import {
  HIGH_KRONOS_FIT_INDUSTRIES,
  PROSPECT_FIT_WEIGHTS,
  PROSPECT_PROFILE_THRESHOLDS,
  type ProspectProfile,
} from './config'
import type { BusinessSizeResult } from './business-size'

export interface ProspectFitInput {
  name: string
  industry: string
  website: string | null
  phone: string | null
  address: string
  businessSize: BusinessSizeResult
}

export interface ProspectFitResult {
  score: number                  // 0–100 final (after penalties)
  contactabilityScore: number    // 0–20 component
  opportunityVisibleScore: number // 0–35 component
  kronosFitScore: number         // 0–20 component
  pymeProbabilityScore: number   // 0–15 component
  evidenceQualityScore: number   // 0–10 component
  // Raw 0-100 values (before weighting) — used by SQS computation
  contactabilityRaw: number
  opportunityVisibleRaw: number
  evidenceQualityRaw: number
  profile: ProspectProfile
  opportunityReasons: string[]   // max 3 human-readable reasons
  prospectRisks: string[]        // max 3 risk notes
  potentialPackageSlug: string | null
}

function normalize(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function matchIndustry(industry: string, name: string): { fitScore: number; packageSlug: string | null } {
  const combined = normalize(`${industry} ${name}`)
  for (const entry of HIGH_KRONOS_FIT_INDUSTRIES) {
    if (entry.keywords.some(kw => combined.includes(normalize(kw)))) {
      return { fitScore: entry.fitScore, packageSlug: entry.packageSlug }
    }
  }
  return { fitScore: 40, packageSlug: null }
}

export function computeProspectFitScore(input: ProspectFitInput): ProspectFitResult {
  const { name, industry, website, phone, businessSize } = input
  const industryLabel = normalize(`${industry} ${name}`)
  const opportunityReasons: string[] = []
  const prospectRisks: string[] = []

  // ── 1. Opportunity visible (35 pts max) ─────────────────────────────────────

  let oppRaw = 0

  if (website) {
    oppRaw += 25  // Has website → likely has digital gaps we can fix
    opportunityReasons.push('Tiene sitio web con posibles mejoras de conversión')
  } else {
    oppRaw += 15  // No website → opportunity for digital presence
    opportunityReasons.push('Sin sitio web — oportunidad de presencia digital')
  }

  if (!phone) {
    oppRaw += 10
    prospectRisks.push('Sin teléfono localizado')
  }

  // Industry-specific opportunity boost
  if (industryLabel.match(/dental|odontolog|clinica|clínica|salud|medico|médico/)) {
    oppRaw += 10
    opportunityReasons.push('Sector salud con alta necesidad de automatización de citas')
  } else if (industryLabel.match(/inmobiliaria|real estate|bienes/)) {
    oppRaw += 10
    opportunityReasons.push('Inmobiliaria con oportunidades de captura y seguimiento de leads')
  } else if (industryLabel.match(/abogado|legal|juridico|notaria/)) {
    oppRaw += 8
    opportunityReasons.push('Estudio jurídico con potencial de gestión automatizada de clientes')
  } else if (industryLabel.match(/constructora|construccion/)) {
    oppRaw += 8
    opportunityReasons.push('Constructora con potencial para dashboards de proyectos y costos')
  } else if (industryLabel.match(/restaurant|comida|gastro/)) {
    oppRaw += 5
    opportunityReasons.push('Negocio gastronómico con oportunidad de reservas y seguimiento')
  }

  oppRaw = Math.min(100, oppRaw)
  const opportunityVisibleScore = Math.round(oppRaw * PROSPECT_FIT_WEIGHTS.opportunityVisible)

  // ── 2. Contactability (20 pts max) ──────────────────────────────────────────

  let contactRaw = 0
  if (website) contactRaw += 45
  if (phone)   contactRaw += 55
  if (!website && !phone) {
    prospectRisks.push('Sin sitio web ni teléfono — difícil de contactar inicialmente')
  }
  contactRaw = Math.min(100, contactRaw)
  const contactabilityScore = Math.round(contactRaw * PROSPECT_FIT_WEIGHTS.contactability)

  // ── 3. Kronos fit (20 pts max) ───────────────────────────────────────────────

  const { fitScore: kronosRaw, packageSlug: potentialPackageSlug } = matchIndustry(industry, name)
  const kronosFitScore = Math.round(kronosRaw * PROSPECT_FIT_WEIGHTS.kronosFit)

  if (potentialPackageSlug && kronosRaw >= 70) {
    opportunityReasons.push(`Alta alineación con paquetes Kronos (${kronosRaw}% fit)`)
  }

  // ── 4. Pyme probability (15 pts max) ─────────────────────────────────────────

  let pymeRaw: number
  switch (businessSize.size) {
    case 'micro':   pymeRaw = 90; break
    case 'small':   pymeRaw = 90; break
    case 'medium':  pymeRaw = 60; break
    case 'large':   pymeRaw = 10; break
    default:        pymeRaw = 65  // unknown → lean pyme
  }

  if (businessSize.chainDetected) {
    pymeRaw = Math.min(pymeRaw, 15)
    prospectRisks.push(`Posible cadena detectada: ${businessSize.chainEvidence[0] ?? ''}`)
  }

  const pymeProbabilityScore = Math.round(pymeRaw * PROSPECT_FIT_WEIGHTS.pymeProbability)

  // ── 5. Evidence quality (10 pts max) ─────────────────────────────────────────

  let evidenceRaw = 0
  if (website) evidenceRaw += 40
  if (phone)   evidenceRaw += 40
  if (input.address && input.address.length > 5) evidenceRaw += 20
  evidenceRaw = Math.min(100, evidenceRaw)
  const evidenceQualityScore = Math.round(evidenceRaw * PROSPECT_FIT_WEIGHTS.evidenceQuality)

  // ── Business size risks ───────────────────────────────────────────────────────

  if (businessSize.isExcluded) {
    prospectRisks.push(businessSize.exclusionReason ?? 'Empresa excluida automáticamente')
  } else if (businessSize.size === 'large') {
    prospectRisks.push('Empresa posiblemente grande o corporativa')
  }

  // ── Total score + penalties ───────────────────────────────────────────────────

  let score = opportunityVisibleScore + contactabilityScore + kronosFitScore +
    pymeProbabilityScore + evidenceQualityScore

  // Penalties
  if (businessSize.isExcluded)      score = Math.min(score, 5)
  else if (businessSize.chainDetected) score = Math.max(0, score - 35)
  else if (businessSize.size === 'large') score = Math.max(0, score - 25)
  if (!website && !phone)           score = Math.max(0, score - 15)

  score = Math.min(100, Math.max(0, score))

  // ── Profile ───────────────────────────────────────────────────────────────────

  let profile: ProspectProfile
  if (businessSize.isExcluded || score < PROSPECT_PROFILE_THRESHOLDS.low_priority) {
    profile = 'discard'
  } else if (score >= PROSPECT_PROFILE_THRESHOLDS.ideal) {
    profile = 'ideal'
  } else if (score >= PROSPECT_PROFILE_THRESHOLDS.good_opportunity) {
    profile = 'good_opportunity'
  } else if (score >= PROSPECT_PROFILE_THRESHOLDS.investigate) {
    profile = 'investigate'
  } else {
    profile = 'low_priority'
  }

  return {
    score,
    contactabilityScore,
    opportunityVisibleScore,
    kronosFitScore,
    pymeProbabilityScore,
    evidenceQualityScore,
    contactabilityRaw:     contactRaw,
    opportunityVisibleRaw: oppRaw,
    evidenceQualityRaw:    evidenceRaw,
    profile,
    opportunityReasons: opportunityReasons.slice(0, 3),
    prospectRisks:      prospectRisks.slice(0, 3),
    potentialPackageSlug,
  }
}
