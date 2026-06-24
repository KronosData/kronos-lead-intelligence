import type { VisibleSymptom } from '@/lib/signal-engine/types'

// Phase 1 of the "land and expand" sales motion: don't pitch a full
// diagnosis — pitch one small, affordable, tangible fix for the most
// visible confirmed pain, then upsell bigger/automated packages later
// once the client is happy. Only confirmed symptoms (not 'unknown')
// ever reach this function — see computeVisibleSymptoms.

export type EntryPackageSlug = 'whatsapp_followup' | 'lead_tracking_crm' | 'website_seo'

export interface EntryPackageRecommendation {
  slug: EntryPackageSlug
  name: string
  painDetected: string
  setupPriceUSD: [number, number]
  monthlyMaintenanceUSD: number
  pitch: string
}

const PACKAGE_BY_SYMPTOM: Record<string, EntryPackageSlug> = {
  signalHasWhatsapp:   'whatsapp_followup',
  signalWeakFollowup:  'whatsapp_followup',
  signalSlowResponse:  'whatsapp_followup',

  signalManualWork:        'lead_tracking_crm',
  signalHasLeadCapture:    'lead_tracking_crm',
  signalHasBookingSystem:  'lead_tracking_crm',
  signalHasClearCta:       'lead_tracking_crm',

  signalHasWebsite:           'website_seo',
  websiteUnreachable:         'website_seo',
  websiteMismatch:            'website_seo',
  signalHasGoogleBusiness:    'website_seo',
  signalWeakOnlinePresence:   'website_seo',
  signalHasReviews:           'website_seo',
  signalHasUnansweredReviews: 'website_seo',
  signalHasInstagram:         'website_seo',
  signalHasLinkedin:          'website_seo',
}

const PACKAGE_INFO: Record<EntryPackageSlug, Omit<EntryPackageRecommendation, 'painDetected' | 'pitch'>> = {
  whatsapp_followup: {
    slug: 'whatsapp_followup',
    name: 'Sistema de Seguimiento por WhatsApp',
    setupPriceUSD: [150, 300],
    monthlyMaintenanceUSD: 50,
  },
  lead_tracking_crm: {
    slug: 'lead_tracking_crm',
    name: 'Sistema de Seguimiento de Leads',
    setupPriceUSD: [200, 400],
    monthlyMaintenanceUSD: 60,
  },
  website_seo: {
    slug: 'website_seo',
    name: 'Página Web + Posicionamiento SEO',
    setupPriceUSD: [300, 600],
    monthlyMaintenanceUSD: 80,
  },
}

const PITCH_BY_SLUG: Record<EntryPackageSlug, (name: string) => string> = {
  whatsapp_followup: (name) =>
    `Implementar un sistema simple de seguimiento por WhatsApp para que ${name} no pierda clientes por falta de respuesta o seguimiento.`,
  lead_tracking_crm: (name) =>
    `Implementar un sistema simple de seguimiento de leads para que ${name} no pierda oportunidades por procesos manuales o falta de organización.`,
  website_seo: (name) =>
    `Crear o mejorar la presencia digital de ${name} con una página web y posicionamiento SEO básico para que sea más fácil de encontrar y contactar.`,
}

const CONFIDENCE_WEIGHT: Record<VisibleSymptom['confidence'], number> = { high: 3, medium: 2, low: 1 }

export function recommendEntryPackage(
  companyName: string,
  symptoms: VisibleSymptom[],
): EntryPackageRecommendation | null {
  const weight: Record<EntryPackageSlug, number> = { whatsapp_followup: 0, lead_tracking_crm: 0, website_seo: 0 }
  const topSymptom: Record<EntryPackageSlug, VisibleSymptom | null> = {
    whatsapp_followup: null, lead_tracking_crm: null, website_seo: null,
  }

  for (const s of symptoms) {
    const slug = PACKAGE_BY_SYMPTOM[s.key]
    if (!slug) continue
    const w = CONFIDENCE_WEIGHT[s.confidence] ?? 1
    weight[slug] += w
    const current = topSymptom[slug]
    if (!current || w > CONFIDENCE_WEIGHT[current.confidence]) topSymptom[slug] = s
  }

  let winner: EntryPackageSlug | null = null
  let max = 0
  for (const slug of Object.keys(weight) as EntryPackageSlug[]) {
    if (weight[slug] > max) { max = weight[slug]; winner = slug }
  }
  if (!winner) return null

  return {
    ...PACKAGE_INFO[winner],
    painDetected: topSymptom[winner]?.label ?? 'Oportunidad de mejora detectada',
    pitch: PITCH_BY_SLUG[winner](companyName),
  }
}

// ─── Channel recommendation ─────────────────────────────────────────────────

export type OutreachChannel = 'whatsapp' | 'email' | 'linkedin' | 'instagram'

export function recommendChannel(company: {
  whatsapp?: string | null
  contactEmail?: string | null
  linkedin?: string | null
  instagram?: string | null
  preferredChannel?: string | null
}): OutreachChannel {
  const pref = company.preferredChannel?.toLowerCase()
  if (pref === 'whatsapp' || pref === 'email' || pref === 'linkedin' || pref === 'instagram') return pref
  if (company.whatsapp) return 'whatsapp'
  if (company.contactEmail) return 'email'
  if (company.linkedin) return 'linkedin'
  if (company.instagram) return 'instagram'
  return 'email'
}
