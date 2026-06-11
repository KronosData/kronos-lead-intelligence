import type { SignalFlags, DiagnosisOutput } from './types'

// ─── Problem detection ────────────────────────────────────────────────────────

function detectProblems(s: SignalFlags): string[] {
  const problems: string[] = []

  if (!s.signalHasWebsite) problems.push('Sin sitio web activo')
  if (!s.signalHasWhatsapp) problems.push('Sin WhatsApp visible')
  if (!s.signalHasContactForm) problems.push('Sin formulario de contacto')
  if (!s.signalHasBookingSystem) problems.push('Sin sistema de reservas o citas')
  if (!s.signalHasInstagram) problems.push('Sin presencia en Instagram')
  if (!s.signalHasLinkedin) problems.push('Sin presencia en LinkedIn')
  if (!s.signalHasGoogleBusiness) problems.push('Sin Google Business Profile')
  if (!s.signalHasReviews) problems.push('Sin reseñas en Google')
  if (s.signalHasUnansweredReviews) problems.push('Reseñas sin responder detectadas')
  if (!s.signalHasClearCta) problems.push('Sin llamada a la acción (CTA) clara')
  if (!s.signalHasLeadCapture) problems.push('Sin captura de leads en el sitio')
  if (s.signalSlowResponse) problems.push('Señales de respuesta lenta a consultas')
  if (s.signalWeakFollowup) problems.push('Señales de seguimiento débil después del primer contacto')
  if (s.signalManualWork) problems.push('Señales de trabajo manual repetitivo en procesos')
  if (s.signalWeakOnlinePresence) problems.push('Presencia online débil o desactualizada')

  return problems
}

// ─── Pain point identification ────────────────────────────────────────────────

function identifyPainPoint(s: SignalFlags): string {
  const hasFollowUpIssue = s.signalSlowResponse || s.signalWeakFollowup
  const hasLeadIssue = !s.signalHasContactForm || !s.signalHasLeadCapture
  const hasAutomationIssue = s.signalManualWork || !s.signalHasBookingSystem
  const hasPresenceIssue = !s.signalHasWebsite || s.signalWeakOnlinePresence
  const hasReputationIssue = !s.signalHasGoogleBusiness || s.signalHasUnansweredReviews

  // Most critical combinations first
  if (hasFollowUpIssue && hasLeadIssue && hasAutomationIssue) {
    return 'Fuga masiva de ingresos: sin captura de leads, sin seguimiento y procesos 100% manuales. El negocio está perdiendo clientes en cada etapa del proceso de venta.'
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

function recommendSolution(s: SignalFlags): string {
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
  opportunityScore: number
): { min: number; max: number } {
  const industryLower = industry.toLowerCase()

  let baseMin = 1200
  let baseMax = 3500

  if (industryLower.includes('inmob') || industryLower.includes('real_estate')) {
    baseMin = 1800
    baseMax = 5000
  } else if (industryLower.includes('legal') || industryLower.includes('jurídico') || industryLower.includes('law')) {
    baseMin = 2000
    baseMax = 5500
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
  opportunityScore: number
): DiagnosisOutput {
  const value = estimateValue(industry, opportunityScore)

  return {
    detectedProblems: detectProblems(signals),
    probablePainPoint: identifyPainPoint(signals),
    recommendedSolution: recommendSolution(signals),
    estimatedValueMin: value.min,
    estimatedValueMax: value.max,
  }
}
