// Phase 4 — Outreach message generator.
// Generates personalized, evidence-based messages by channel and evidence tier.
//
// Rules:
//  - Always include https://www.kronosdata.tech/
//  - Never invent phone/email/revenue numbers
//  - Never claim losses or ROI not backed by evidence
//  - LOW evidence → propose free audit only, no specific claims
//  - MEDIUM evidence → hypothesis framing, "hemos notado que…"
//  - HIGH evidence → specific pain points, concrete service match
//  - Messages are proposals, not automated sends

import { KRONOS_PACKAGES } from '@/lib/catalog/kronos-offers'
import type { EvidenceTier } from '@/lib/scoring/composite-scorer'

const OFFICIAL_URL = 'https://www.kronosdata.tech/'

export type OutreachChannel = 'email' | 'whatsapp' | 'linkedin'

export interface MessageInput {
  // Company
  companyName: string
  industry: string
  city: string | null
  country: string
  website: string | null

  // Scoring
  evidenceTier: EvidenceTier
  salesPriority: string
  primaryProblem: string | null
  whyContact: string[]
  qualificationReason: string | null
  recommendedFirstAction: string

  // Package/service recommendation
  recommendedPackageSlug: string | null
  primaryServiceName: string | null

  // Evaluation signals (optional — only if evaluation exists)
  signals?: {
    hasWebsite: boolean
    hasCta: boolean
    hasBooking: boolean
    hasWhatsapp: boolean
    hasGoogleBusiness: boolean
    hasReviews: boolean
    hasUnansweredReviews: boolean
    slowResponse: boolean
    manualWork: boolean
    weakFollowup: boolean
    probablePainPoint: string | null
    detectedProblems: string[]
  }
}

export interface GeneratedMessage {
  channel: OutreachChannel
  subject: string | null  // email only
  body: string
  evidenceTier: EvidenceTier
  notes: string  // usage guidance for the sender
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function locationStr(city: string | null, country: string): string {
  if (city) return `${city}, ${country}`
  return country
}

function packageLabel(slug: string | null): string {
  if (!slug || !(slug in KRONOS_PACKAGES)) return 'nuestros servicios'
  return KRONOS_PACKAGES[slug as keyof typeof KRONOS_PACKAGES].name
}

function packageDescription(slug: string | null): string {
  if (!slug || !(slug in KRONOS_PACKAGES)) return 'una solución a medida para tu operación'
  return KRONOS_PACKAGES[slug as keyof typeof KRONOS_PACKAGES].subtitle
}

function topProblems(input: MessageInput): string[] {
  const problems: string[] = []
  if (input.signals?.probablePainPoint) problems.push(input.signals.probablePainPoint)
  if (input.primaryProblem && !problems.includes(input.primaryProblem)) problems.push(input.primaryProblem)
  if (input.signals?.detectedProblems) problems.push(...input.signals.detectedProblems.slice(0, 2))
  return [...new Set(problems)].slice(0, 3)
}

// ── Email templates ────────────────────────────────────────────────────────────

function emailLow(input: MessageInput): GeneratedMessage {
  const loc = locationStr(input.city, input.country)
  return {
    channel: 'email',
    subject: `Diagnóstico gratuito para ${input.companyName} — Kronos Data`,
    body: `Hola equipo de ${input.companyName},

Mi nombre es [Tu nombre] y soy parte de Kronos Data, una empresa especializada en automatización de operaciones y eficiencia de datos para negocios en ${loc}.

Encontramos a ${input.companyName} en nuestra búsqueda de empresas del sector ${input.industry} con potencial de mejora en sus procesos digitales, y quisiera ofrecerles algo concreto: una auditoría gratuita de su operación actual.

Sin compromiso ni contrato. El objetivo es simplemente identificar si hay oportunidades reales que valga la pena explorar juntos.

¿Tienen 20 minutos esta semana para una llamada exploratoria?

Pueden conocer más sobre lo que hacemos en ${OFFICIAL_URL}

Quedo a disposición.

[Tu nombre]
Kronos Data
${OFFICIAL_URL}`,
    evidenceTier: 'LOW',
    notes: 'Mensaje exploratorio. No menciona problemas específicos porque la evidencia es limitada. Personaliza [Tu nombre] antes de enviar.',
  }
}

function emailMedium(input: MessageInput): GeneratedMessage {
  const loc = locationStr(input.city, input.country)
  const problems = topProblems(input)
  const problemText = problems.length > 0
    ? `Al revisar su presencia digital, notamos algunas áreas que podrían estar limitando su captación de clientes:\n${problems.map(p => `• ${p}`).join('\n')}\n`
    : `Al revisar el sector de ${input.industry} en ${loc}, identificamos patrones comunes que suelen afectar la captación y conversión de clientes.\n`

  return {
    channel: 'email',
    subject: `Oportunidad de mejora para ${input.companyName} — Diagnóstico gratuito`,
    body: `Hola equipo de ${input.companyName},

Mi nombre es [Tu nombre], de Kronos Data. Nos especializamos en automatización de operaciones y transformación digital para empresas del sector ${input.industry} en Latinoamérica.

${problemText}
Trabajamos con empresas similares a la suya ayudándoles a ${packageDescription(input.recommendedPackageSlug)}.

Nuestra propuesta de entrada siempre es una auditoría gratuita: sin compromiso, sin contrato. Primero entendemos su situación real, luego — si tiene sentido — conversamos sobre soluciones concretas.

¿Estarían disponibles para una sesión de 30 minutos esta semana?

Pueden revisar nuestra oferta completa en ${OFFICIAL_URL}

Saludos,

[Tu nombre]
Kronos Data
${OFFICIAL_URL}`,
    evidenceTier: 'MEDIUM',
    notes: 'Mensaje basado en hipótesis. Verifica manualmente los problemas detectados antes de enviar. Personaliza [Tu nombre].',
  }
}

function emailHigh(input: MessageInput): GeneratedMessage {
  const loc = locationStr(input.city, input.country)
  const problems = topProblems(input)
  const pkg = packageLabel(input.recommendedPackageSlug)
  const pkgDesc = packageDescription(input.recommendedPackageSlug)

  const problemSection = problems.length > 0
    ? `En nuestra revisión de ${input.companyName} identificamos específicamente:\n${problems.map(p => `• ${p}`).join('\n')}\n`
    : `Hemos analizado la presencia digital y operativa de ${input.companyName} en ${loc}.\n`

  return {
    channel: 'email',
    subject: `${input.companyName} — Solución concreta para [problema principal]`,
    body: `Hola [Nombre del contacto],

Mi nombre es [Tu nombre], de Kronos Data. Nos especializamos en ${pkgDesc} para empresas del sector ${input.industry}.

${problemSection}
Basándonos en esto, creemos que la solución más adecuada para ${input.companyName} sería nuestro servicio de ${pkg}.

Lo que proponemos como primer paso es una auditoría gratuita de 30 minutos donde:
• Revisamos juntos los puntos de mejora identificados
• Validamos si corresponden a su realidad operativa
• Definimos si hay un caso de negocio claro antes de cualquier inversión

Si todo tiene sentido para ustedes, avanzamos. Si no, la conversación igualmente les será útil.

¿Tienen disponibilidad esta semana?

Más información en ${OFFICIAL_URL}

Saludos,

[Tu nombre]
Kronos Data
${OFFICIAL_URL}`,
    evidenceTier: 'HIGH',
    notes: `Mensaje con evidencia alta. Reemplaza [problema principal] en el asunto con el problema real detectado. Reemplaza [Nombre del contacto] si lo conoces. Basado en: ${input.whyContact.slice(0, 2).join('; ')}.`,
  }
}

// ── WhatsApp templates ────────────────────────────────────────────────────────

function whatsappLow(input: MessageInput): GeneratedMessage {
  return {
    channel: 'whatsapp',
    subject: null,
    body: `Hola, soy [nombre] de Kronos Data 👋

Encontramos a ${input.companyName} y quisiera ofrecerles una auditoría gratuita de su operación — sin compromiso.

¿Tienen unos minutos para conversarlo?

Más info: ${OFFICIAL_URL}`,
    evidenceTier: 'LOW',
    notes: 'Mensaje muy corto para WhatsApp. Úsalo SOLO si hay contexto previo o canal comercial público claro. No enviar masivamente.',
  }
}

function whatsappMedium(input: MessageInput): GeneratedMessage {
  const problems = topProblems(input)
  const problemLine = problems[0]
    ? `Notamos que ${problems[0].toLowerCase()}.`
    : `Vemos oportunidades de mejora en su presencia digital.`

  return {
    channel: 'whatsapp',
    subject: null,
    body: `Hola equipo de ${input.companyName} 👋

Soy [nombre] de Kronos Data. ${problemLine}

Ayudamos a empresas de ${input.industry} a resolver exactamente esto.

¿Puedo contarles en 2 minutos qué hacemos? Sin compromiso.

${OFFICIAL_URL}`,
    evidenceTier: 'MEDIUM',
    notes: 'Mensaje breve basado en hipótesis. Verifica el problema antes de enviar. WhatsApp debe usarse con canal comercial público o interacción previa.',
  }
}

function whatsappHigh(input: MessageInput): GeneratedMessage {
  const problems = topProblems(input)
  const mainProblem = problems[0] ?? `oportunidades de mejora identificadas en ${input.industry}`
  const pkg = packageLabel(input.recommendedPackageSlug)

  return {
    channel: 'whatsapp',
    subject: null,
    body: `Hola [nombre del contacto] 👋

Soy [Tu nombre] de Kronos Data.

Revisamos ${input.companyName} y identificamos: ${mainProblem.toLowerCase()}.

Tenemos un servicio específico para esto — ${pkg} — y nos gustaría ofrecerles un diagnóstico gratuito de 30 min para ver si aplica a su caso.

¿Les parece bien esta semana?

Más detalles: ${OFFICIAL_URL}`,
    evidenceTier: 'HIGH',
    notes: `Mensaje con evidencia alta. Reemplaza [nombre del contacto] si lo tienes. WhatsApp solo con opt-in o canal público. Basado en: ${problems.slice(0, 2).join('; ')}.`,
  }
}

// ── LinkedIn templates ────────────────────────────────────────────────────────

function linkedinLow(input: MessageInput): GeneratedMessage {
  return {
    channel: 'linkedin',
    subject: null,
    body: `Hola [Nombre],

Vi el perfil de ${input.companyName} y me pareció interesante lo que hacen en ${input.industry}.

Soy [Tu nombre] de Kronos Data — ayudamos a empresas como la suya a mejorar su operación y captación de clientes a través de automatización y datos.

¿Estarías abierto a una conversación exploratoria de 20 minutos? Ofrecemos un diagnóstico inicial gratuito.

${OFFICIAL_URL}

¡Gracias!`,
    evidenceTier: 'LOW',
    notes: 'Mensaje genérico para LinkedIn. Personaliza con el nombre del contacto y algún dato concreto del perfil si lo tienes.',
  }
}

function linkedinMedium(input: MessageInput): GeneratedMessage {
  const problems = topProblems(input)
  const problemHint = problems[0]
    ? `noté que podrían tener oportunidades en ${problems[0].toLowerCase()}`
    : `identificamos algunas áreas de mejora en su presencia digital`

  return {
    channel: 'linkedin',
    subject: null,
    body: `Hola [Nombre],

Revisé el perfil de ${input.companyName} y ${problemHint}.

Desde Kronos Data trabajamos específicamente con empresas de ${input.industry} en Latinoamérica para resolver este tipo de problemas — automatización de procesos, mejora de conversión digital y datos estructurados.

Si te parece, me gustaría compartirte en una sesión de 30 min cómo lo hacemos. Empezamos con un diagnóstico gratuito.

¿Tienes disponibilidad esta semana?

${OFFICIAL_URL}`,
    evidenceTier: 'MEDIUM',
    notes: 'Mensaje semi-personalizado. Verifica el problema detectado antes de enviar.',
  }
}

function linkedinHigh(input: MessageInput): GeneratedMessage {
  const problems = topProblems(input)
  const mainProblem = problems[0] ?? 'oportunidades de mejora identificadas'
  const pkg = packageLabel(input.recommendedPackageSlug)

  return {
    channel: 'linkedin',
    subject: null,
    body: `Hola [Nombre],

Revisé en detalle la presencia de ${input.companyName} y encontré algo relevante: ${mainProblem.toLowerCase()}.

En Kronos Data nos especializamos exactamente en esto para empresas del sector ${input.industry}. Nuestro servicio de ${pkg} está diseñado para este tipo de situación.

Propongo una sesión de diagnóstico gratuita de 30 minutos donde revisamos juntos los hallazgos y definimos si tiene sentido trabajar juntos.

Sin compromiso previo.

¿Hay un buen momento esta semana o la siguiente?

${OFFICIAL_URL}`,
    evidenceTier: 'HIGH',
    notes: `Mensaje con evidencia alta. Reemplaza [Nombre] con el nombre real del contacto. Basado en: ${problems.slice(0, 2).join('; ')}.`,
  }
}

// ── Main generator ─────────────────────────────────────────────────────────────

export function generateOutreachMessages(input: MessageInput): GeneratedMessage[] {
  const tier = input.evidenceTier
  const messages: GeneratedMessage[] = []

  // Generate per-channel messages based on evidence tier
  if (tier === 'HIGH') {
    messages.push(emailHigh(input), whatsappHigh(input), linkedinHigh(input))
  } else if (tier === 'MEDIUM') {
    messages.push(emailMedium(input), whatsappMedium(input), linkedinMedium(input))
  } else {
    messages.push(emailLow(input), whatsappLow(input), linkedinLow(input))
  }

  return messages
}

// ── Compliance helper ─────────────────────────────────────────────────────────

export interface ComplianceInfo {
  legalRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  warnings: string[]
  channelGuidance: string
}

export function assessOutreachCompliance(
  channel: OutreachChannel,
  evidenceTier: EvidenceTier,
  country: string,
  hasOptIn: boolean,
  hasPublicContactInfo: boolean,
): ComplianceInfo {
  const warnings: string[] = []
  let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'

  if (channel === 'whatsapp' && !hasOptIn && !hasPublicContactInfo) {
    warnings.push('WhatsApp sin opt-in ni canal comercial público confirmado — alto riesgo de spam')
    risk = 'HIGH'
  } else if (channel === 'whatsapp' && !hasOptIn) {
    warnings.push('WhatsApp sin opt-in previo — úsalo solo si el número es claramente comercial/público')
    risk = 'MEDIUM'
  }

  if (evidenceTier === 'LOW' && channel !== 'email') {
    warnings.push('Evidencia baja: asegúrate de que el mensaje no haga afirmaciones sobre el negocio')
    if (risk === 'LOW') risk = 'MEDIUM'
  }

  const gdprCountries = ['spain']
  if (gdprCountries.includes(country.toLowerCase())) {
    warnings.push('España aplica RGPD/GDPR — asegura base legal antes de contactar (legítimo interés B2B puede aplicar para email)')
  }

  const channelGuidance: Record<OutreachChannel, string> = {
    email: 'Email B2B con fuente pública (web, Google Business) tiene menor riesgo legal en LATAM. Incluye opt-out.',
    whatsapp: 'WhatsApp requiere número comercial público o interacción previa. No usar si el número es personal.',
    linkedin: 'LinkedIn InMail o conexión B2B tiene el menor riesgo legal. Mensaje profesional siempre.',
  }

  return { legalRisk: risk, warnings, channelGuidance: channelGuidance[channel] }
}
