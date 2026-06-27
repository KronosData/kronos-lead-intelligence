import type { EntryPackageRecommendation } from '@/lib/recommendations/entry-package'
import { calendarCta, senderSignature } from '@/lib/outreach/kronos-contact'

export interface ApproachMessageContext {
  industry?: string | null
  city?: string | null
  country?: string | null
  website?: string | null
  whatsapp?: string | null
  contactName?: string | null
}

type PainFamily =
  | 'online_visibility'
  | 'trust'
  | 'response'
  | 'followup'
  | 'booking'
  | 'lead_capture'
  | 'manual_work'

interface PainProfile {
  family: PainFamily
  observation: string
  consequence: string
  diagnosisFocus: string
}

const PAIN_BY_SYMPTOM: Record<string, PainFamily> = {
  signalHasWebsite: 'online_visibility',
  websiteUnreachable: 'online_visibility',
  websiteMismatch: 'trust',
  signalHasGoogleBusiness: 'online_visibility',
  signalWeakOnlinePresence: 'online_visibility',
  signalHasReviews: 'trust',
  signalHasUnansweredReviews: 'trust',
  signalHasInstagram: 'online_visibility',
  signalHasLinkedin: 'online_visibility',
  signalHasWhatsapp: 'response',
  signalWeakFollowup: 'followup',
  signalSlowResponse: 'response',
  signalManualWork: 'manual_work',
  signalHasLeadCapture: 'lead_capture',
  signalHasBookingSystem: 'booking',
  signalHasClearCta: 'lead_capture',
}

const FAMILY_BY_PACKAGE: Record<string, PainFamily> = {
  whatsapp_followup: 'followup',
  lead_tracking_crm: 'lead_capture',
  website_seo: 'online_visibility',
}

function businessLabel(industry?: string | null): string {
  const clean = industry?.trim()
  return clean ? `un negocio de ${clean}` : 'un negocio local'
}

function locationLabel(ctx: ApproachMessageContext): string {
  const city = ctx.city?.trim()
  const country = ctx.country?.trim()
  if (city && country) return ` en ${city}, ${country}`
  if (city) return ` en ${city}`
  if (country) return ` en ${country}`
  return ''
}

function painProfile(companyName: string, family: PainFamily, ctx: ApproachMessageContext): PainProfile {
  const type = businessLabel(ctx.industry)
  const place = locationLabel(ctx)

  switch (family) {
    case 'online_visibility':
      return {
        family,
        observation: `al buscar ${type}${place}, la presencia digital de ${companyName} no queda tan clara como podría quedar`,
        consequence: 'cuando una persona compara opciones, suele avanzar con el negocio que le da más confianza y un siguiente paso más fácil',
        diagnosisFocus: 'visibilidad, confianza y camino de contacto',
      }
    case 'trust':
      return {
        family,
        observation: `hay detalles visibles que pueden generar duda antes de que una persona contacte a ${companyName}`,
        consequence: 'esa duda casi nunca aparece como queja; simplemente hace que la persona siga comparando',
        diagnosisFocus: 'confianza digital y primeras impresiones',
      }
    case 'response':
      return {
        family,
        observation: `el punto crítico parece estar en que una consulta llegue y reciba una respuesta clara a tiempo`,
        consequence: 'si la respuesta no es rápida o no orienta bien, la persona interesada normalmente no insiste',
        diagnosisFocus: 'primer contacto y velocidad de respuesta',
      }
    case 'followup':
      return {
        family,
        observation: `el riesgo visible no está solo en recibir consultas, sino en que algunas se enfríen después del primer mensaje`,
        consequence: 'muchas oportunidades no se pierden de golpe; se pierden cuando nadie las retoma en el momento correcto',
        diagnosisFocus: 'seguimiento y recuperación de interesados',
      }
    case 'booking':
      return {
        family,
        observation: `agendar o confirmar parece depender de demasiados pasos manuales`,
        consequence: 'cada paso extra aumenta la probabilidad de que una persona interesada lo deje para después',
        diagnosisFocus: 'reservas, confirmaciones y fricción para agendar',
      }
    case 'lead_capture':
      return {
        family,
        observation: `no se ve un camino suficientemente claro para que una persona interesada deje sus datos o pida información`,
        consequence: 'si una consulta no queda registrada, después es difícil retomarla con orden',
        diagnosisFocus: 'captura de interesados y siguientes pasos',
      }
    case 'manual_work':
      return {
        family,
        observation: `hay señales de trabajo repetitivo que probablemente consume tiempo operativo`,
        consequence: 'cuando todo depende de memoria o mensajes sueltos, algunas oportunidades se pierden sin que se note',
        diagnosisFocus: 'orden operativo y ahorro de tiempo',
      }
  }
}

function firstNameOrTeam(name?: string | null): string {
  const clean = name?.trim()
  if (!clean) return 'equipo'
  return clean.split(/\s+/)[0]
}

export function makeClientSafeCopy(text: string): string {
  return text
    .replace(/\b(vender|venderte|venderles|vendo|vendemos|venta|ventas)\b/gi, 'ofrecer algo sin contexto')
    .replace(/\bautomatizaciones?\b/gi, 'mejoras operativas')
    .replace(/\bsistemas?\b/gi, 'procesos')
    .replace(/\bIA\b/g, 'tecnología')
    .replace(/\binteligencia artificial\b/gi, 'tecnología')
}

export function buildApproachMessage(
  companyName: string,
  pkg: EntryPackageRecommendation,
  ctx: ApproachMessageContext = {},
): string {
  const family = PAIN_BY_SYMPTOM[pkg.painKey] ?? FAMILY_BY_PACKAGE[pkg.slug] ?? 'lead_capture'
  const pain = painProfile(companyName, family, ctx)
  const greeting = ctx.contactName ? `Hola ${firstNameOrTeam(ctx.contactName)},` : `Hola equipo de ${companyName},`

  return makeClientSafeCopy(
    `${greeting}\n\n` +
    `Vi algo puntual en ${companyName}: ${pain.observation}.\n\n` +
    `El detalle es que ${pain.consequence}.\n\n` +
    `Te propongo una revisión gratuita de 15 min. Miramos desde afuera el recorrido de un cliente, marcamos 2 o 3 puntos concretos sobre ${pain.diagnosisFocus}, y validamos si de verdad hay algo que valga la pena mejorar.\n\n` +
    `Si no vemos nada claro, igual te queda el diagnóstico.\n\n` +
    `${calendarCta(15)}\n\n` +
    senderSignature(),
  )
}
