// Server-side URL analyzer for automated prospect research.
// Fetch + regex only — zero external dependencies, zero cost.

export type Confidence = 'high' | 'medium' | 'low' | 'none'

export interface SignalResult {
  value: boolean | null // null = manual input required
  confidence: Confidence
  source: string
}

export interface ResearchResult {
  success: boolean
  fetchedUrl: string
  httpStatus: number | null
  detectedName: string | null
  detectedPhone: string | null
  detectedWhatsapp: string | null
  detectedInstagram: string | null
  detectedLinkedin: string | null
  isSPA: boolean
  signals: {
    signalHasWebsite: SignalResult
    signalHasWhatsapp: SignalResult
    signalHasContactForm: SignalResult
    signalHasBookingSystem: SignalResult
    signalHasInstagram: SignalResult
    signalHasLinkedin: SignalResult
    signalHasGoogleBusiness: SignalResult
    signalHasReviews: SignalResult
    signalHasUnansweredReviews: SignalResult
    signalHasClearCta: SignalResult
    signalHasLeadCapture: SignalResult
    signalSlowResponse: SignalResult
    signalWeakFollowup: SignalResult
    signalManualWork: SignalResult
    signalWeakOnlinePresence: SignalResult
  }
  autoFilledCount: number
  manualRequiredCount: number
  warnings: string[]
  error?: string
}

const MANUAL: SignalResult = { value: null, confidence: 'none', source: 'requires_manual' }

function normalizeUrl(raw: string): string {
  const t = raw.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return 'https://' + t
}

// ── Extractors ────────────────────────────────────────────────────────────────

function extractName(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"'<]{2,80})["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"'<]{2,80})["'][^>]+property=["']og:title["']/i)
  if (og) return og[1].trim()
  const title = html.match(/<title[^>]*>([^<]{2,100})<\/title>/i)
  if (title) {
    // Strip common " | Site Name" suffixes
    const clean = title[1].trim().replace(/\s*[|\-–—]\s*.{0,50}$/, '').trim()
    return clean.length >= 2 ? clean.slice(0, 80) : null
  }
  return null
}

function extractPhone(html: string): string | null {
  // tel: href links are the most reliable source
  const tel = html.match(/href=["']tel:([+\d\s\-().]{7,20})["']/i)
  if (tel) return tel[1].trim().replace(/\s+/g, '')
  return null
}

function extractWhatsapp(html: string): { number: string | null; found: boolean } {
  const waMe = html.match(/wa\.me\/(\+?[\d]{7,15})/i)
  if (waMe) return { number: waMe[1], found: true }
  const apiWa = html.match(/api\.whatsapp\.com\/send\?phone=([\d+]{7,15})/i)
  if (apiWa) return { number: apiWa[1], found: true }
  const webWa = html.match(/web\.whatsapp\.com\/send\?phone=([\d+]{7,15})/i)
  if (webWa) return { number: webWa[1], found: true }
  if (/whatsapp/i.test(html)) return { number: null, found: true }
  return { number: null, found: false }
}

function extractInstagram(html: string): string | null {
  const match = html.match(
    /instagram\.com\/((?!p\/|reel\/|explore\/|stories\/|accounts\/|direct\/|tv\/|#)[a-zA-Z0-9._]{2,30})/i,
  )
  if (!match) return null
  const handle = match[1].replace(/\/$/, '')
  return `https://instagram.com/${handle}`
}

function extractLinkedin(html: string): string | null {
  const match = html.match(/linkedin\.com\/(company|in)\/([\w%-]{2,60})/i)
  if (!match) return null
  return `https://linkedin.com/${match[1]}/${match[2]}`
}

// ── Signal detectors ──────────────────────────────────────────────────────────

function detectContactForm(html: string): SignalResult {
  if (/<form[\s\S]{0,5000}?input[^>]+type=["']?(?:email|tel)["']?/i.test(html)) {
    return { value: true, confidence: 'high', source: 'form_email_or_tel_input' }
  }
  if (/href=["'][^"']*\/contact(?:o|us|\/|")/i.test(html)) {
    return { value: true, confidence: 'medium', source: 'contact_page_link' }
  }
  if (/formulario\s+de\s+contacto|env[íi]anos?\s+(?:un\s+)?mensaje|escr[íi]benos/i.test(html)) {
    return { value: true, confidence: 'medium', source: 'contact_keyword' }
  }
  return { value: false, confidence: 'medium', source: 'no_form_detected' }
}

function detectBookingSystem(html: string): SignalResult {
  if (/calendly\.com|simplybook\.me|acuityscheduling\.com|setmore\.com|appointy\.com|reservamos\.mx|doctolib\.es|booksy\.com|mindbodyonline\.com/i.test(html)) {
    return { value: true, confidence: 'high', source: 'booking_platform' }
  }
  if (/reservar?\s+(?:tu\s+)?cita|agendar?\s+(?:tu\s+)?cita|pidi?e?\s+(?:tu\s+)?cita|solicita\s+(?:tu\s+)?cita/i.test(html)) {
    return { value: true, confidence: 'high', source: 'booking_cta_phrase' }
  }
  if (/(?:book|schedule)\s+(?:an?\s+)?(?:appointment|call|demo|consultation)/i.test(html)) {
    return { value: true, confidence: 'medium', source: 'booking_english_keyword' }
  }
  return { value: false, confidence: 'medium', source: 'no_booking_detected' }
}

function detectClearCta(html: string): SignalResult {
  // Button/link with specific action verbs
  if (/<(?:button|a)[^>]*>(?:\s*(?:<[^>]+>)*\s*)?(?:llamar?(?:nos)?|cont[aá]ct(?:anos|a|o)\b|reservar?|cotizar?|pide?\s+(?:tu\s+)?cita|agenda\s+(?:aqu[íi]|ahora|tu))(?:\s*(?:<[^>]+>)*\s*)?<\/(?:button|a)>/i.test(html)) {
    return { value: true, confidence: 'high', source: 'explicit_cta_button' }
  }
  // Element with btn/cta class containing action text
  if (/class=["'][^"']*\b(?:btn|button|cta)\b[^"']*["'][^>]*>(?:[^<]{0,60}(?:contactar|reserv|llamar|whatsapp|agenda|cotiz)[^<]{0,60})</i.test(html)) {
    return { value: true, confidence: 'medium', source: 'cta_class_action_text' }
  }
  // tel: or mailto: links as minimum CTA
  if (/href=["'](?:tel:|mailto:)/i.test(html)) {
    return { value: true, confidence: 'low', source: 'tel_or_mailto_link' }
  }
  return { value: false, confidence: 'low', source: 'no_cta_detected' }
}

function detectLeadCapture(html: string): SignalResult {
  const emailIdx = html.search(/input[^>]+type=["']?email["']?/i)
  if (emailIdx !== -1) {
    const ctx = html.slice(Math.max(0, emailIdx - 500), emailIdx + 500)
    if (/suscr[íi]b|newsletter|recib[ei]\s+(?:novedades|noticias|información)|descarg[ae]\s+gratis|gu[íi]a\s+(?:gratu[íi]ta|libre)/i.test(ctx)) {
      return { value: true, confidence: 'high', source: 'newsletter_email_form' }
    }
  }
  if (/gu[íi]a\s+(?:gratu[íi]ta|libre)|recurso\s+gratu[íi]to|descarg[ae]\s+gratis/i.test(html)) {
    return { value: true, confidence: 'medium', source: 'lead_magnet_keyword' }
  }
  return { value: false, confidence: 'medium', source: 'no_lead_capture' }
}

function detectGoogleBusiness(html: string): SignalResult {
  if (/maps\.googleapis\.com\/maps\/api\/js|maps\.google\.com\/maps\?|google\.com\/maps\/embed/i.test(html)) {
    return { value: true, confidence: 'high', source: 'google_maps_embed' }
  }
  if (/(?:href|src)=["'][^"']*(?:maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(html)) {
    return { value: true, confidence: 'medium', source: 'google_maps_link' }
  }
  if (/business\.google\.com/i.test(html)) {
    return { value: true, confidence: 'high', source: 'google_business_link' }
  }
  // Absence is not conclusive — many businesses have GBP without linking to it
  return MANUAL
}

function detectSPA(html: string): boolean {
  if (!/<div\s+id=["'](?:root|app|__next|__nuxt)["']/i.test(html)) return false
  // Strip scripts and tags from body, check if meaningful text remains
  const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) ?? [])[1] ?? ''
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length < 250
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function analyzeUrl(rawUrl: string): Promise<ResearchResult> {
  const warnings: string[] = []
  const url = normalizeUrl(rawUrl)

  const emptySignals: ResearchResult['signals'] = {
    signalHasWebsite: { value: false, confidence: 'high', source: 'fetch_failed' },
    signalHasWhatsapp: MANUAL,
    signalHasContactForm: MANUAL,
    signalHasBookingSystem: MANUAL,
    signalHasInstagram: MANUAL,
    signalHasLinkedin: MANUAL,
    signalHasGoogleBusiness: MANUAL,
    signalHasReviews: MANUAL,
    signalHasUnansweredReviews: MANUAL,
    signalHasClearCta: MANUAL,
    signalHasLeadCapture: MANUAL,
    signalSlowResponse: MANUAL,
    signalWeakFollowup: MANUAL,
    signalManualWork: MANUAL,
    signalWeakOnlinePresence: MANUAL,
  }

  const fail = (error: string, status: number | null = null): ResearchResult => ({
    success: false,
    fetchedUrl: url,
    httpStatus: status,
    detectedName: null,
    detectedPhone: null,
    detectedWhatsapp: null,
    detectedInstagram: null,
    detectedLinkedin: null,
    isSPA: false,
    signals: emptySignals,
    autoFilledCount: 0,
    manualRequiredCount: 15,
    warnings,
    error,
  })

  let html = ''
  let httpStatus: number | null = null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)
    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es,es-419;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      })
    } finally {
      clearTimeout(timeoutId)
    }

    httpStatus = response.status

    if (!response.ok) {
      return fail(`El sitio respondió con HTTP ${httpStatus}`, httpStatus)
    }

    const ct = response.headers.get('content-type') ?? ''
    if (ct && !ct.includes('text/html') && !ct.includes('text/plain')) {
      return fail(`Contenido no analizable: ${ct.split(';')[0]}`, httpStatus)
    }

    html = await response.text()
    if (html.length > 600_000) {
      html = html.slice(0, 600_000)
      warnings.push('Página muy grande — análisis limitado a primeros 600 KB')
    }
  } catch (e) {
    const isAbort = e instanceof Error && (e.name === 'AbortError' || e.message.includes('abort'))
    return fail(isAbort
      ? 'El sitio tardó más de 8 segundos en responder'
      : 'No se pudo conectar al sitio')
  }

  // ── Analyze ──────────────────────────────────────────────────────────────────

  const isSPA = detectSPA(html)
  if (isSPA) {
    warnings.push('El sitio renderiza contenido con JavaScript — los datos detectados pueden ser incompletos')
  }

  const wa = extractWhatsapp(html)
  const ig = extractInstagram(html)
  const li = extractLinkedin(html)

  const signalHasWebsite: SignalResult = { value: true, confidence: 'high', source: 'http_200' }
  const signalHasWhatsapp: SignalResult = wa.found
    ? { value: true, confidence: 'high', source: wa.number ? 'wa_me_link' : 'whatsapp_mention' }
    : { value: false, confidence: 'high', source: 'no_whatsapp_link' }
  const signalHasInstagram: SignalResult = ig
    ? { value: true, confidence: 'high', source: 'instagram_profile_link' }
    : { value: false, confidence: 'high', source: 'no_instagram_link' }
  const signalHasLinkedin: SignalResult = li
    ? { value: true, confidence: 'high', source: 'linkedin_profile_link' }
    : { value: false, confidence: 'high', source: 'no_linkedin_link' }

  const signalHasContactForm = detectContactForm(html)
  const signalHasBookingSystem = detectBookingSystem(html)
  const signalHasClearCta = detectClearCta(html)
  const signalHasLeadCapture = detectLeadCapture(html)
  const signalHasGoogleBusiness = detectGoogleBusiness(html)

  const hasChannels = signalHasInstagram.value || signalHasLinkedin.value || signalHasWhatsapp.value
  const signalWeakOnlinePresence: SignalResult = !hasChannels
    ? { value: true, confidence: 'medium', source: 'inferred_no_channels_detected' }
    : { value: false, confidence: 'medium', source: 'inferred_has_channels' }

  const autoDetected: SignalResult[] = [
    signalHasWebsite, signalHasWhatsapp, signalHasInstagram, signalHasLinkedin,
    signalHasContactForm, signalHasBookingSystem, signalHasClearCta,
    signalHasLeadCapture, signalHasGoogleBusiness, signalWeakOnlinePresence,
  ]
  const autoFilledCount = autoDetected.filter(s => s.value !== null && s.confidence !== 'none').length

  return {
    success: true,
    fetchedUrl: url,
    httpStatus,
    detectedName: extractName(html),
    detectedPhone: extractPhone(html),
    detectedWhatsapp: wa.number,
    detectedInstagram: ig,
    detectedLinkedin: li,
    isSPA,
    signals: {
      signalHasWebsite,
      signalHasWhatsapp,
      signalHasContactForm,
      signalHasBookingSystem,
      signalHasInstagram,
      signalHasLinkedin,
      signalHasGoogleBusiness,
      signalHasReviews: MANUAL,
      signalHasUnansweredReviews: MANUAL,
      signalHasClearCta,
      signalHasLeadCapture,
      signalSlowResponse: MANUAL,
      signalWeakFollowup: MANUAL,
      signalManualWork: MANUAL,
      signalWeakOnlinePresence,
    },
    autoFilledCount,
    manualRequiredCount: 5,
    warnings,
  }
}
