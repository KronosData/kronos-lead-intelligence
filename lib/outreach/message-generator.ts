// Phase 4 - Outreach message generator.
// Generates concise, evidence-based messages by channel and evidence tier.
//
// Rules:
//  - Always include https://www.kronosdata.tech/
//  - Never invent phone/email/revenue numbers
//  - Never claim losses or ROI not backed by evidence
//  - First contact asks for a diagnostic conversation, not a purchase decision
//  - Client-facing copy avoids: sell/sales language, automation, system, AI
//  - Messages are proposals, not automated sends

import type { EvidenceTier } from '@/lib/scoring/composite-scorer'
import { makeClientSafeCopy } from '@/lib/outreach/approach-message'

const OFFICIAL_URL = 'https://www.kronosdata.tech/'

export type OutreachChannel = 'email' | 'whatsapp' | 'linkedin'

export interface MessageInput {
  companyName: string
  industry: string
  city: string | null
  country: string
  website: string | null
  evidenceTier: EvidenceTier
  salesPriority: string
  primaryProblem: string | null
  whyContact: string[]
  qualificationReason: string | null
  recommendedFirstAction: string
  recommendedPackageSlug: string | null
  primaryServiceName: string | null
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
  subject: string | null
  body: string
  evidenceTier: EvidenceTier
  notes: string
}

function locationStr(city: string | null, country: string): string {
  if (city) return `${city}, ${country}`
  return country
}

function cleanSnippet(text: string): string {
  return makeClientSafeCopy(text)
    .replace(/\s+/g, ' ')
    .replace(/[.。]+$/, '')
    .trim()
}

function topProblems(input: MessageInput): string[] {
  const problems: string[] = []
  if (input.signals?.probablePainPoint) problems.push(input.signals.probablePainPoint)
  if (input.primaryProblem) problems.push(input.primaryProblem)
  if (input.qualificationReason) problems.push(input.qualificationReason)
  if (input.whyContact.length > 0) problems.push(...input.whyContact.slice(0, 2))
  if (input.signals?.detectedProblems) problems.push(...input.signals.detectedProblems.slice(0, 2))
  return [...new Set(problems.map(cleanSnippet).filter(Boolean))].slice(0, 3)
}

function observedPain(input: MessageInput): string {
  const problems = topProblems(input)
  if (problems[0]) return problems[0].toLowerCase()

  if (!input.website || input.signals?.hasWebsite === false) {
    return 'no se ve una página clara donde una persona interesada pueda entender rápido qué hacer después'
  }
  if (input.signals?.slowResponse || input.signals?.weakFollowup) {
    return 'parece haber espacio para mejorar cómo se responde y se retoman las consultas'
  }
  if (input.signals?.hasBooking === false) {
    return 'agendar o confirmar parece requerir demasiados pasos manuales'
  }
  if (input.signals?.hasCta === false) {
    return 'el siguiente paso para contactar no queda tan claro como podría quedar'
  }
  if (input.signals?.manualWork) {
    return 'hay señales de trabajo repetitivo que podría estar quitando tiempo operativo'
  }
  if (input.signals?.hasReviews === false || input.signals?.hasUnansweredReviews) {
    return 'hay detalles de confianza digital que una persona revisa antes de decidir'
  }

  return `hay puntos visibles de contacto y presencia digital que conviene revisar para un negocio de ${input.industry}`
}

function frictionLine(input: MessageInput): string {
  if (!input.website || input.signals?.hasWebsite === false || input.signals?.hasCta === false) {
    return 'Cuando una persona compara opciones, suele avanzar con el negocio que le da más claridad y menos fricción.'
  }
  if (input.signals?.slowResponse || input.signals?.weakFollowup) {
    return 'Muchas consultas no se pierden de golpe; se enfrían cuando nadie las retoma en el momento correcto.'
  }
  if (input.signals?.hasBooking === false) {
    return 'Cada paso extra para coordinar hace que algunas personas lo dejen para después.'
  }
  if (input.signals?.manualWork) {
    return 'Cuando todo queda en mensajes sueltos o memoria, es fácil que algo importante se escape.'
  }
  return 'Son detalles pequeños, pero suelen influir antes de que la persona decida escribir o agendar.'
}

function diagnosticAsk(minutes = 15): string {
  return `Te propongo revisarlo ${minutes} min, gratis. Miramos el recorrido desde afuera, marco 2 o 3 puntos concretos y validamos si hay algo que realmente valga la pena mejorar.`
}

function maybeLowEvidencePrefix(input: MessageInput): string {
  return input.evidenceTier === 'LOW'
    ? 'No lo tomo como diagnóstico cerrado; solo como una primera señal para revisar. '
    : ''
}

function finalize(body: string): string {
  return makeClientSafeCopy(body)
}

function emailLow(input: MessageInput): GeneratedMessage {
  const loc = locationStr(input.city, input.country)
  return {
    channel: 'email',
    subject: `${input.companyName}: revisión gratuita de presencia y contacto`,
    body: finalize(`Hola equipo de ${input.companyName},

Soy Alejandro de Kronos Data. Estaba revisando negocios de ${input.industry} en ${loc} y me aparecio ${input.companyName}.

${maybeLowEvidencePrefix(input)}Hay un punto que quizas vale revisar: ${observedPain(input)}.

${diagnosticAsk(15)}

Si no vemos nada claro, igual les queda el diagnóstico.

Alejandro Bri
Kronos Data
${OFFICIAL_URL}`),
    evidenceTier: 'LOW',
    notes: 'Mensaje exploratorio. No afirma un problema cerrado; solo abre una conversación de diagnóstico.',
  }
}

function emailMedium(input: MessageInput): GeneratedMessage {
  return {
    channel: 'email',
    subject: `${input.companyName}: punto visible para revisar`,
    body: finalize(`Hola equipo de ${input.companyName},

Soy Alejandro de Kronos Data. Revisando ${input.companyName} desde afuera, vi un punto que puede estar afectando el primer contacto: ${observedPain(input)}.

${frictionLine(input)}

${diagnosticAsk(20)}

Si tiene sentido, seguimos conversando. Si no, les queda una lectura externa útil para ordenar prioridades.

Alejandro Bri
Kronos Data
${OFFICIAL_URL}`),
    evidenceTier: 'MEDIUM',
    notes: 'Mensaje con hipotesis concreta. Revisar el punto visible antes de enviarlo.',
  }
}

function emailHigh(input: MessageInput): GeneratedMessage {
  const problems = topProblems(input)
  const details = problems.length > 0
    ? `Puntos visibles:\n${problems.slice(0, 2).map(p => `- ${p}`).join('\n')}`
    : `Punto visible: ${observedPain(input)}`

  return {
    channel: 'email',
    subject: `${input.companyName}: diagnóstico gratuito de 20 min`,
    body: finalize(`Hola [Nombre],

Soy Alejandro de Kronos Data. Revise ${input.companyName} desde afuera y encontre algo puntual que vale validar con ustedes.

${details}

${frictionLine(input)}

${diagnosticAsk(20)}

Si no hay una oportunidad clara, no forzamos nada: les queda el diagnóstico y seguimos cada uno con lo suyo.

Alejandro Bri
Kronos Data
${OFFICIAL_URL}`),
    evidenceTier: 'HIGH',
    notes: `Mensaje con evidencia alta. Personaliza [Nombre] si tienes contacto. Base: ${problems.slice(0, 2).join('; ')}`,
  }
}

function whatsappLow(input: MessageInput): GeneratedMessage {
  return {
    channel: 'whatsapp',
    subject: null,
    body: finalize(`Hola, soy Alejandro de Kronos Data.

Vi a ${input.companyName} y hay un punto que quiza vale revisar: ${observedPain(input)}.

${diagnosticAsk(15)}

Si no hay nada claro, igual queda el diagnóstico.

${OFFICIAL_URL}`),
    evidenceTier: 'LOW',
    notes: 'Usar solo si el número es comercial/público o hubo contexto previo. No enviar masivamente.',
  }
}

function whatsappMedium(input: MessageInput): GeneratedMessage {
  return {
    channel: 'whatsapp',
    subject: null,
    body: finalize(`Hola equipo de ${input.companyName}, soy Alejandro de Kronos Data.

Vi un detalle concreto: ${observedPain(input)}.

${frictionLine(input)}

¿Les parece si lo revisamos 15 min esta semana? Es gratis y sin compromiso.

${OFFICIAL_URL}`),
    evidenceTier: 'MEDIUM',
    notes: 'Mensaje breve con dolor visible. Verificar que el contacto sea publico/comercial.',
  }
}

function whatsappHigh(input: MessageInput): GeneratedMessage {
  return {
    channel: 'whatsapp',
    subject: null,
    body: finalize(`Hola [Nombre], soy Alejandro de Kronos Data.

Revise ${input.companyName} desde afuera y vi esto: ${observedPain(input)}.

${frictionLine(input)}

Te propongo verlo 15 min por Meet/Zoom. Te muestro 2 o 3 puntos concretos y validamos si de verdad hay algo que mejorar.

¿Tienes un espacio esta semana?

${OFFICIAL_URL}`),
    evidenceTier: 'HIGH',
    notes: `Mensaje directo con evidencia alta. Personaliza [Nombre] si lo tienes. Base: ${topProblems(input).slice(0, 2).join('; ')}`,
  }
}

function linkedinLow(input: MessageInput): GeneratedMessage {
  return {
    channel: 'linkedin',
    subject: null,
    body: finalize(`Hola [Nombre], vi ${input.companyName} y me llamo la atencion lo que hacen en ${input.industry}.

Estoy revisando negocios donde pequeños puntos de presencia/contacto pueden frenar consultas.

Si te parece, puedo hacer una revisión gratuita de 15 min y compartirte 2 o 3 observaciones concretas.

${OFFICIAL_URL}`),
    evidenceTier: 'LOW',
    notes: 'Primer contacto suave para LinkedIn. Personalizar con nombre y un dato del perfil.',
  }
}

function linkedinMedium(input: MessageInput): GeneratedMessage {
  return {
    channel: 'linkedin',
    subject: null,
    body: finalize(`Hola [Nombre], revise ${input.companyName} desde afuera y note algo que quizas vale validar: ${observedPain(input)}.

No lo planteo como diagnóstico cerrado. Me gustaría revisarlo contigo 15 min y dejarte 2 o 3 puntos claros sobre presencia, contacto o seguimiento.

¿Te sirve coordinar esta semana?

${OFFICIAL_URL}`),
    evidenceTier: 'MEDIUM',
    notes: 'Mensaje semi-personalizado. Confirmar el punto visible antes de enviar.',
  }
}

function linkedinHigh(input: MessageInput): GeneratedMessage {
  return {
    channel: 'linkedin',
    subject: null,
    body: finalize(`Hola [Nombre], vi ${input.companyName} con más detalle y hay un punto que me parece accionable: ${observedPain(input)}.

${frictionLine(input)}

Si te parece, lo revisamos 20 min. Te muestro lo que vi, lo contrastamos con tu realidad y ves si vale priorizarlo.

${OFFICIAL_URL}`),
    evidenceTier: 'HIGH',
    notes: `Mensaje con evidencia alta. Personalizar [Nombre]. Base: ${topProblems(input).slice(0, 2).join('; ')}`,
  }
}

export function generateOutreachMessages(input: MessageInput): GeneratedMessage[] {
  const tier = input.evidenceTier
  if (tier === 'HIGH') return [emailHigh(input), whatsappHigh(input), linkedinHigh(input)]
  if (tier === 'MEDIUM') return [emailMedium(input), whatsappMedium(input), linkedinMedium(input)]
  return [emailLow(input), whatsappLow(input), linkedinLow(input)]
}

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
    warnings.push('WhatsApp sin opt-in ni canal comercial publico confirmado: alto riesgo de spam')
    risk = 'HIGH'
  } else if (channel === 'whatsapp' && !hasOptIn) {
    warnings.push('WhatsApp sin opt-in previo: usar solo si el número es claramente comercial/público')
    risk = 'MEDIUM'
  }

  if (evidenceTier === 'LOW' && channel !== 'email') {
    warnings.push('Evidencia baja: no afirmar problemas específicos sin verificación manual')
    if (risk === 'LOW') risk = 'MEDIUM'
  }

  if (country.toLowerCase() === 'spain') {
    warnings.push('Espana aplica RGPD/GDPR: asegurar base legal antes de contactar')
  }

  const channelGuidance: Record<OutreachChannel, string> = {
    email: 'Email B2B con fuente pública tiene menor riesgo. Incluir salida simple si piden no ser contactados.',
    whatsapp: 'WhatsApp debe usarse con número comercial público o interacción previa. Evitar números personales.',
    linkedin: 'LinkedIn funciona mejor con mensaje profesional, corto y personalizado. Evitar secuencias masivas de invitaciones.',
  }

  return { legalRisk: risk, warnings, channelGuidance: channelGuidance[channel] }
}
