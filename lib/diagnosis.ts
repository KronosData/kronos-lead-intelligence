// @legacy — v2 does NOT generate automatic diagnoses before an audit.
// Diagnoses belong in the Audit model (post-meeting, human-validated).
// Archived: do not import in new routes or UI primary views.
import type { SignalFlags, DiagnosisOutput } from './types'
import type { SignalEvidenceMap } from './evidence'
import { SIGNAL_DEFINITIONS } from './constants'

// ─── Problem detection ────────────────────────────────────────────────────────
// With evidence: only list problems that are confirmed or inferred (not unknown).
// Unknown signals are excluded — absence of evidence is not evidence of a problem.

function detectProblems(s: SignalFlags, evidence?: SignalEvidenceMap): string[] {
  const problems: string[] = []

  function add(signalKey: keyof SignalFlags, problemText: string, condition: boolean) {
    if (!condition) return
    if (!evidence) { problems.push(problemText); return }
    const entry = evidence[signalKey]
    if (!entry) { problems.push(problemText); return }
    if (entry.status === 'unknown') return // skip — not confirmed
    if (entry.status === 'inferred') {
      problems.push(`(posible) ${problemText.charAt(0).toLowerCase()}${problemText.slice(1)}`)
    } else {
      problems.push(problemText)
    }
  }

  add('signalHasWebsite',           'Sin sitio web activo',                          !s.signalHasWebsite)
  add('signalHasWhatsapp',          'Sin WhatsApp visible',                           !s.signalHasWhatsapp)
  add('signalHasContactForm',       'Sin formulario de contacto',                     !s.signalHasContactForm)
  add('signalHasBookingSystem',     'Sin sistema de reservas o citas',                !s.signalHasBookingSystem)
  add('signalHasInstagram',         'Sin presencia en Instagram',                     !s.signalHasInstagram)
  add('signalHasLinkedin',          'Sin presencia en LinkedIn',                      !s.signalHasLinkedin)
  add('signalHasGoogleBusiness',    'Sin Google Business Profile',                    !s.signalHasGoogleBusiness)
  add('signalHasReviews',           'Sin reseñas en Google',                          !s.signalHasReviews)
  add('signalHasUnansweredReviews', 'Reseñas sin responder detectadas',               s.signalHasUnansweredReviews)
  add('signalHasClearCta',          'Sin llamada a la acción (CTA) clara',            !s.signalHasClearCta)
  add('signalHasLeadCapture',       'Sin captura de leads en el sitio',               !s.signalHasLeadCapture)
  add('signalSlowResponse',         'Señales de respuesta lenta a consultas',          s.signalSlowResponse)
  add('signalWeakFollowup',         'Señales de seguimiento débil tras el contacto',  s.signalWeakFollowup)
  add('signalManualWork',           'Señales de trabajo manual repetitivo',            s.signalManualWork)
  add('signalWeakOnlinePresence',   'Presencia online débil o desactualizada',         s.signalWeakOnlinePresence)

  return problems
}

// ─── Pain point identification ────────────────────────────────────────────────

function identifyPainPoint(s: SignalFlags, coverage: number): string {
  if (coverage < 40) {
    return 'Información preliminar — con los datos disponibles no es posible identificar el dolor principal. Un diagnóstico inicial permitirá confirmar las oportunidades concretas.'
  }

  const hasFollowUpIssue = s.signalSlowResponse || s.signalWeakFollowup
  const hasLeadIssue = !s.signalHasContactForm || !s.signalHasLeadCapture
  const hasAutomationIssue = s.signalManualWork || !s.signalHasBookingSystem
  const hasPresenceIssue = !s.signalHasWebsite || s.signalWeakOnlinePresence
  const hasReputationIssue = !s.signalHasGoogleBusiness || s.signalHasUnansweredReviews

  if (hasFollowUpIssue && hasLeadIssue && hasAutomationIssue) {
    return 'Fuga de ingresos en múltiples etapas: sin captura de leads estructurada, sin seguimiento sistemático y con procesos mayormente manuales. El negocio está perdiendo clientes en cada paso del proceso de venta.'
  }

  if (hasFollowUpIssue && hasLeadIssue) {
    return 'Pérdida de leads en etapas clave: los prospectos llegan pero no se capturan correctamente, y los que contactan no reciben seguimiento oportuno.'
  }

  if (hasAutomationIssue && hasFollowUpIssue) {
    return 'Cuello de botella operativo: los procesos manuales consumen tiempo del equipo e impiden dar respuesta y seguimiento rápido a los clientes potenciales.'
  }

  if (hasLeadIssue && hasPresenceIssue) {
    return 'Invisibilidad digital: el negocio no aparece donde buscan sus clientes ideales y no tiene mecanismos para capturar el tráfico que llega.'
  }

  if (hasAutomationIssue) {
    return 'Alta carga operativa manual: tareas repetitivas consumen tiempo que debería invertirse en ventas y atención al cliente.'
  }

  if (hasFollowUpIssue) {
    return 'Pérdida de clientes por tiempo de respuesta: los prospectos contactan, pero la lentitud en responder o la falta de seguimiento los empuja a la competencia.'
  }

  if (hasReputationIssue) {
    return 'Reputación digital descuidada: sin Google Business o con reseñas sin responder, el negocio pierde credibilidad ante nuevos prospectos.'
  }

  if (hasPresenceIssue) {
    return 'Presencia digital insuficiente: el negocio no es encontrado fácilmente por clientes potenciales en los canales digitales relevantes.'
  }

  return 'Oportunidades de mejora identificadas en su proceso comercial y presencia digital.'
}

// ─── Solution recommendation ──────────────────────────────────────────────────

function recommendSolution(s: SignalFlags, coverage: number): string {
  if (coverage < 40) {
    return 'Una auditoría de presencia digital nos permitirá confirmar el diagnóstico y definir las acciones prioritarias con datos concretos.'
  }

  const solutions: string[] = []

  if (s.signalSlowResponse || s.signalWeakFollowup || !s.signalHasWhatsapp) {
    solutions.push('automatización de WhatsApp con respuestas inmediatas y secuencia de seguimiento')
  }

  if (!s.signalHasBookingSystem || s.signalManualWork) {
    solutions.push('sistema de reservas y citas online para eliminar gestión manual')
  }

  if (!s.signalHasContactForm || !s.signalHasLeadCapture || !s.signalHasClearCta) {
    solutions.push('funnel de captura de leads con CTA optimizado')
  }

  if (!s.signalHasGoogleBusiness) {
    solutions.push('configuración y optimización de Google Business Profile')
  }

  if (s.signalHasUnansweredReviews) {
    solutions.push('estrategia de gestión y respuesta a reseñas')
  }

  if (!s.signalHasWebsite) {
    solutions.push('desarrollo de sitio web profesional con conversión optimizada')
  }

  if (!s.signalHasInstagram && s.signalWeakOnlinePresence) {
    solutions.push('paquete de presencia en redes sociales')
  }

  if (solutions.length === 0) {
    return 'Auditoría de presencia digital y proceso comercial para identificar áreas de mejora.'
  }

  const primary = solutions.slice(0, 2).join(' + ')
  return primary.charAt(0).toUpperCase() + primary.slice(1) + '.'
}

// ─── Rough value estimation ───────────────────────────────────────────────────

function estimateValue(
  industry: string,
  opportunityScore: number,
): { min: number; max: number } {
  const industryLower = industry.toLowerCase()

  let baseMin = 650
  let baseMax = 2200

  if (industryLower.includes('inmob') || industryLower.includes('real_estate')) {
    baseMin = 900
    baseMax = 3000
  } else if (industryLower.includes('legal') || industryLower.includes('jurídico') || industryLower.includes('law')) {
    baseMin = 900
    baseMax = 3200
  }

  const multiplier =
    opportunityScore >= 80 ? 1.0
    : opportunityScore >= 60 ? 0.75
    : opportunityScore >= 40 ? 0.50
    : 0.25

  return {
    min: Math.round(baseMin * multiplier),
    max: Math.round(baseMax * multiplier),
  }
}

// ─── Main diagnosis function ──────────────────────────────────────────────────

export function generateDiagnosis(
  signals: SignalFlags,
  industry: string,
  opportunityScore: number,
  coverage = 100,
  evidence?: SignalEvidenceMap,
): DiagnosisOutput {
  const value = estimateValue(industry, opportunityScore)

  return {
    detectedProblems: detectProblems(signals, evidence),
    probablePainPoint: identifyPainPoint(signals, coverage),
    recommendedSolution: recommendSolution(signals, coverage),
    estimatedValueMin: value.min,
    estimatedValueMax: value.max,
  }
}
