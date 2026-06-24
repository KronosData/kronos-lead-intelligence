import type { EntryPackageRecommendation } from '@/lib/recommendations/entry-package'

// Persuasive copy for the phase-1 "Cómo acercarnos" message.
//
// Structure follows classic direct-response copywriting (PAS — Problem,
// Agitate, Solution) plus a few well-established principles instead of
// generic feature pitches:
//   - Loss aversion (Kahneman/Tversky): frame the pain as a silent,
//     ongoing loss, not a one-time inconvenience — losses motivate ~2x
//     more than equivalent gains.
//   - Specificity bias: a concrete, vivid mechanism ("escribe al
//     siguiente negocio de la lista") reads as truer and more painful
//     than an abstract claim ("baja conversión").
//   - Sell the outcome, not the deliverable (Hormozi's value-equation
//     framing): never lead with the tool name — lead with what stops
//     happening once it's in place.
//   - Low-friction, curiosity-based CTA (Belfort's certainty-building):
//     ask for a small "see how it'd look", not a purchase decision.
//
// IMPORTANT: hooks describe a *general, relatable mechanism* of how
// the confirmed symptom costs the business money — they never invent
// company-specific numbers (counts, percentages, revenue) we have no
// evidence for. That constraint is load-bearing: this product's
// credibility (and the legal/compliance posture already enforced in
// lib/outreach/message-generator.ts) depends on never fabricating
// facts about a specific prospect.

const HOOK_BY_SYMPTOM: Record<string, (name: string) => string> = {
  signalHasWebsite: (name) =>
    `Antes de comprar, casi todos buscan en internet primero. Si ${name} no aparece ahí, la gente no piensa "están ocupados" — piensa "este negocio no existe" y elige al siguiente que sí aparece. No es que falten clientes: se pierden en silencio, antes de llegar a escribirte.`,
  websiteUnreachable: (name) =>
    `Cuando alguien intenta entrar al sitio de ${name} y no carga, no espera ni reintenta — cierra la pestaña y busca al siguiente. Cada visita así es un cliente que ya tenía intención de comprar y se fue sin que nadie se entere.`,
  websiteMismatch: (name) =>
    `Cuando el sitio que aparece no coincide con lo que ${name} realmente ofrece, genera duda — y la duda casi siempre termina en "mejor sigo buscando". Esa desconfianza de unos segundos cuesta clientes que nunca llegan a escribir.`,
  signalHasGoogleBusiness: (name) =>
    `Cuando alguien busca "${name}" o un negocio como el tuyo cerca, Google Business suele ser lo primero que ve — antes incluso que tu sitio web. Sin ese perfil, sencillamente no apareces en esa búsqueda, y la gente elige entre las opciones que sí ve.`,
  signalWeakOnlinePresence: (name) =>
    `Cuando alguien investiga ${name} antes de decidir y encuentra poca información o presencia digital, asume lo peor por defecto — no porque ${name} sea mal negocio, sino porque no hay nada ahí que diga lo contrario. Esa duda silenciosa aleja gente que nunca te dice por qué se fue.`,
  signalHasReviews: (name) =>
    `Sin reseñas visibles, un cliente nuevo no tiene forma de confirmar que ${name} cumple lo que promete — y ante la duda, la mayoría prefiere ir a lo seguro: el que sí tiene reseñas, aunque sea más caro.`,
  signalHasUnansweredReviews: (name) =>
    `Una reseña sin responder no se queda ahí — la ve cada persona nueva que investiga a ${name} antes de decidir. El silencio se lee como "no les importa", y eso aleja gente que ni siquiera llegó a escribirte.`,
  signalHasInstagram: (name) =>
    `Mucha gente, antes de escribirte, revisa tus redes para confirmar que el negocio es real y activo. Sin ese rastro visible, ${name} pierde esa pequeña confirmación que convierte la curiosidad en mensaje.`,
  signalHasLinkedin: (name) =>
    `Para clientes B2B, no tener presencia profesional visible genera la misma duda que un local sin letrero: ¿esto sigue funcionando? Esa duda basta para que elijan a la competencia que sí se ve activa.`,

  signalHasWhatsapp: (name) =>
    `Cuando alguien le escribe a ${name} y no ve respuesta rápido, no espera — prueba con el siguiente negocio de la lista. Ese cliente no se fue porque no quería comprar: se fue porque nadie contestó a tiempo, y eso pasa todos los días sin que se note.`,
  signalWeakFollowup: (name) =>
    `La mayoría de las ventas no se pierden en el primer mensaje — se pierden en el silencio después. Un cliente que preguntó y no recibió seguimiento simplemente se enfría: no se queja, no avisa, solo deja de responder.`,
  signalSlowResponse: (name) =>
    `Cuando ${name} tarda en responder, el cliente no espera pacientemente — empieza a mirar otras opciones mientras espera. Para cuando llega tu respuesta, a veces ya decidió con otro.`,

  signalManualWork: (name) =>
    `Cuando todo se maneja a mano, es fácil perder de vista a alguien sin darte cuenta — no porque a ${name} le falten clientes, sino porque se pierden en el camino antes de cerrar, y nadie nota el hueco hasta que ya es tarde.`,
  signalHasLeadCapture: (name) =>
    `Cada visita o mensaje que no queda registrado en ningún lado es una oportunidad que ${name} no puede recuperar después — no hay a quién darle seguimiento si no quedó guardado en primer lugar.`,
  signalHasBookingSystem: (name) =>
    `Sin un sistema de reservas claro, coordinar una cita se vuelve ida y vuelta de mensajes — y en ese ida y vuelta, una buena parte de la gente simplemente se cansa y desiste antes de confirmar.`,
  signalHasClearCta: (name) =>
    `Cuando un cliente llega interesado y no encuentra un siguiente paso claro — a quién escribir, cómo agendar — se queda esperando una señal que nunca llega, y termina yéndose sin avisar.`,
}

const OUTCOME_BY_SLUG: Record<string, string> = {
  whatsapp_followup: 'que ningún mensaje se quede sin respuesta y dejes de perder clientes por el camino',
  lead_tracking_crm: 'que ningún cliente se pierda de vista antes de cerrar, sin que tengas que llevar la cuenta a mano',
  website_seo: 'que te encuentren primero — y que lo que vean genere confianza, no dudas',
}

const FALLBACK_HOOK = (name: string, painLabel: string) =>
  `Vimos algo concreto en ${name}: ${painLabel.toLowerCase()}. Es el tipo de detalle que el cliente sí nota, aunque el negocio nunca llegue a saber que por eso lo perdió.`

export function buildApproachMessage(companyName: string, pkg: EntryPackageRecommendation): string {
  const hook = HOOK_BY_SYMPTOM[pkg.painKey]?.(companyName) ?? FALLBACK_HOOK(companyName, pkg.painDetected)
  const outcome = OUTCOME_BY_SLUG[pkg.slug] ?? 'resolver justo eso, de forma simple y rápida'
  const [low, high] = pkg.setupPriceUSD

  return (
    `Hola 👋\n\n` +
    `${hook}\n\n` +
    `En Kronos Data nos enfocamos en ${outcome}. Lo implementamos en ${pkg.implementationTime}, sin que tengas que cambiar tu forma de trabajar — desde $${low} hasta $${high} de instalación + $${pkg.monthlyMaintenanceUSD}/mes de mantenimiento.\n\n` +
    `¿Te interesa una llamada de 15 min para mostrarte exactamente cómo se vería para ${companyName}?\n\n` +
    `Más sobre nosotros: https://www.kronosdata.tech/`
  )
}
