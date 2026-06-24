import type { ProspectSignalInput, ProspectSignals, VisibleSymptom } from './types'
import { computeIcpFit } from './icp-fit'
import { computeVisibleSymptoms } from './visible-symptoms'
import { computeContactabilityV2 } from './contactability'
import { computeCommercialStateV2 } from './commercial-state'
import { generateAuditQuestions } from './audit-questions'

export function computeProspectSignals(input: ProspectSignalInput): ProspectSignals {
  // 1. ICP Fit
  const icp = computeIcpFit({
    industry: input.industry,
    name: input.name,
    country: input.country,
    isCommercial: input.isCommercial,
    entityType: input.entityType,
    website: input.website,
  })

  // 2. Visible Symptoms — only confirmed evidence
  const symptomsResult = computeVisibleSymptoms({
    evidence: input.evidence,
    websiteVerificationStatus: input.websiteVerificationStatus,
  })

  // 3. Contactability
  const contactabilityScore = computeContactabilityV2({
    websiteVerificationStatus: input.websiteVerificationStatus,
    hasPhone: input.hasPhone,
    hasWhatsapp: input.hasWhatsapp,
    hasEmail: input.hasEmail,
    evidence: input.evidence,
    hasInstagram: input.hasInstagram,
    hasLinkedin: input.hasLinkedin,
  })

  // 4. Audit Priority Score — weighted composite
  const auditPriorityScore = Math.round(
    icp.score * 0.40 +
    symptomsResult.score * 0.35 +
    contactabilityScore * 0.25
  )

  // 5. Commercial State v2
  const commercialState = computeCommercialStateV2({
    isCommercial: input.isCommercial,
    icpFitScore: icp.score,
    visibleSymptomsScore: symptomsResult.score,
    contactabilityScore,
    evidenceCoverage: input.evidenceCoverage,
  })

  // 6. Audit questions from top symptoms
  const auditQuestions = generateAuditQuestions(symptomsResult.symptoms)

  // 7. Audit hook — primary outreach hook based on top symptom
  const auditHook = buildAuditHook(
    input.name,
    input.industry,
    symptomsResult.symptoms,
    commercialState,
  )

  // 8. Disqualification reason
  const disqualificationReason = !input.isCommercial
    ? (input.entityExclusionReason ?? 'Entidad no comercial')
    : icp.score < 15
      ? 'Fuera del perfil de cliente ideal de Kronos'
      : null

  return {
    icpFitScore: icp.score,
    icpFitTier: icp.tier,
    visibleSymptomsScore: symptomsResult.score,
    contactabilityScore,
    auditPriorityScore,
    commercialState,
    confirmedSymptoms: symptomsResult.symptoms,
    auditHook,
    auditQuestions,
    disqualificationReason,
    evidenceCoverage: input.evidenceCoverage,
    isCommercial: input.isCommercial,
  }
}

function buildAuditHook(
  name: string,
  industry: string,
  symptoms: VisibleSymptom[],
  state: string,
): string | null {
  if (state === 'DISQUALIFIED' || state === 'RESEARCH_REQUIRED') return null

  const top = symptoms.find((s) => s.confidence === 'high') ?? symptoms[0]

  const hooks: Record<string, string> = {
    websiteUnreachable:     `El sitio web de ${name} no está accesible — hay una oportunidad visible de mejora en presencia digital.`,
    websiteMismatch:        `La web de ${name} no coincide con la empresa — vale la pena una conversación para validar la presencia digital.`,
    signalHasWebsite:       `${name} opera en ${industry} sin presencia web — una auditoría gratuita puede mostrar cómo mejorar la captación online.`,
    signalHasBookingSystem: `${name} no tiene sistema de reservas o citas en línea — una auditoría de 15 min puede estimar el impacto de automatizarlo.`,
    signalHasWhatsapp:      `${name} no tiene WhatsApp visible — una conversación de 15 min puede explorar cómo mejorar la contactabilidad.`,
    signalHasClearCta:      `La web de ${name} no tiene CTA claro — hay margen visible de mejora en conversión web.`,
    signalHasUnansweredReviews: `${name} tiene reseñas sin responder — señal externa de oportunidad en gestión reputacional.`,
    signalHasGoogleBusiness:    `${name} no tiene perfil de Google Business — hay margen claro de mejora en visibilidad local.`,
    signalWeakOnlinePresence:   `La presencia digital de ${name} tiene margen visible de mejora para un negocio de ${industry}.`,
  }

  if (top && hooks[top.key]) return hooks[top.key]

  return `${name} muestra síntomas externos de mejora en ${industry}. Una auditoría gratuita de 15 min puede confirmar si hay una oportunidad real.`
}

export type { ProspectSignals, ProspectSignalInput, CommercialStateV2 } from './types'
