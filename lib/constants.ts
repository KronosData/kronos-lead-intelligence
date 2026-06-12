import type { KronosService, Country, LeadSource } from './types'

// ─── Countries ────────────────────────────────────────────────────────────────

export const COUNTRIES: { value: Country; label: string }[] = [
  { value: 'peru', label: 'Perú' },
  { value: 'mexico', label: 'México' },
  { value: 'colombia', label: 'Colombia' },
  { value: 'chile', label: 'Chile' },
  { value: 'argentina', label: 'Argentina' },
  { value: 'ecuador', label: 'Ecuador' },
  { value: 'bolivia', label: 'Bolivia' },
  { value: 'uruguay', label: 'Uruguay' },
  { value: 'paraguay', label: 'Paraguay' },
  { value: 'costa_rica', label: 'Costa Rica' },
  { value: 'panama', label: 'Panamá' },
  { value: 'guatemala', label: 'Guatemala' },
  { value: 'honduras', label: 'Honduras' },
  { value: 'el_salvador', label: 'El Salvador' },
  { value: 'nicaragua', label: 'Nicaragua' },
  { value: 'spain', label: 'España' },
]

// ─── Industry suggestions (free text — not enforced as enum) ─────────────────

export const INDUSTRY_SUGGESTIONS: string[] = [
  'Dental / Odontología',
  'Inmobiliaria / Real Estate',
  'Estudio Jurídico / Law Firm',
  'Construcción',
  'Logística',
  'Agencia de Marketing',
  'Salud / Healthcare',
  'Educación',
  'Consultoría',
  'Automotriz',
  'Restaurante / Food & Beverage',
  'Retail / Comercio',
  'Tecnología',
  'Otro',
]

// ─── Lead sources ─────────────────────────────────────────────────────────────

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'referral', label: 'Referido' },
  { value: 'website', label: 'Sitio web' },
  { value: 'cold_outreach', label: 'Prospección en frío' },
  { value: 'event', label: 'Evento' },
  { value: 'other', label: 'Otro' },
]

// ─── Company statuses ─────────────────────────────────────────────────────────

export const COMPANY_STATUSES = [
  { value: 'active', label: 'Activo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'client', label: 'Cliente' },
  { value: 'archived', label: 'Archivado' },
]

// ─── Contact statuses ─────────────────────────────────────────────────────────

export const CONTACT_STATUSES = [
  { value: 'not_contacted', label: 'Sin contactar' },
  { value: 'attempted', label: 'Intento fallido' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'in_conversation', label: 'En conversación' },
  { value: 'proposal_sent', label: 'Propuesta enviada' },
  { value: 'negotiating', label: 'Negociando' },
  { value: 'closed_won', label: 'Cerrado — Ganado' },
  { value: 'closed_lost', label: 'Cerrado — Perdido' },
]

// ─── Meeting statuses ─────────────────────────────────────────────────────────

export const MEETING_STATUSES = [
  { value: 'not_scheduled', label: 'Sin agendar' },
  { value: 'scheduled', label: 'Agendada' },
  { value: 'completed', label: 'Completada' },
  { value: 'no_show', label: 'No asistió' },
  { value: 'rescheduled', label: 'Reprogramada' },
]

// ─── Outreach channels ────────────────────────────────────────────────────────

export const OUTREACH_CHANNELS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'call', label: 'Llamada' },
  { value: 'other', label: 'Otro' },
]

// ─── Response types ───────────────────────────────────────────────────────────

export const RESPONSE_TYPES = [
  { value: 'interested', label: 'Interesado' },
  { value: 'not_interested', label: 'No interesado' },
  { value: 'no_response', label: 'Sin respuesta' },
  { value: 'asked_to_follow_up', label: 'Pidió seguimiento' },
  { value: 'booked_call', label: 'Agendó llamada' },
  { value: 'closed_won', label: 'Cerrado — Ganado' },
  { value: 'closed_lost', label: 'Cerrado — Perdido' },
]

// ─── Signal definitions ───────────────────────────────────────────────────────
// Used to render the checklist UI with labels and descriptions

export const SIGNAL_DEFINITIONS = [
  {
    key: 'signalHasWebsite',
    label: 'Tiene sitio web activo',
    category: 'online_presence',
    problemWhen: false,
  },
  {
    key: 'signalHasWhatsapp',
    label: 'Tiene WhatsApp visible',
    category: 'lead_generation',
    problemWhen: false,
  },
  {
    key: 'signalHasContactForm',
    label: 'Tiene formulario de contacto',
    category: 'lead_generation',
    problemWhen: false,
  },
  {
    key: 'signalHasBookingSystem',
    label: 'Tiene sistema de reservas / citas',
    category: 'automation',
    problemWhen: false,
  },
  {
    key: 'signalHasInstagram',
    label: 'Tiene Instagram activo',
    category: 'online_presence',
    problemWhen: false,
  },
  {
    key: 'signalHasLinkedin',
    label: 'Tiene LinkedIn',
    category: 'online_presence',
    problemWhen: false,
  },
  {
    key: 'signalHasGoogleBusiness',
    label: 'Tiene Google Business Profile',
    category: 'reputation',
    problemWhen: false,
  },
  {
    key: 'signalHasReviews',
    label: 'Tiene reseñas en Google',
    category: 'reputation',
    problemWhen: false,
  },
  {
    key: 'signalHasUnansweredReviews',
    label: 'Tiene reseñas sin responder',
    category: 'reputation',
    problemWhen: true,
  },
  {
    key: 'signalHasClearCta',
    label: 'Tiene CTA claro y visible',
    category: 'conversion',
    problemWhen: false,
  },
  {
    key: 'signalHasLeadCapture',
    label: 'Tiene captura de leads clara',
    category: 'conversion',
    problemWhen: false,
  },
  {
    key: 'signalSlowResponse',
    label: 'Señales de respuesta lenta',
    category: 'follow_up',
    problemWhen: true,
  },
  {
    key: 'signalWeakFollowup',
    label: 'Señales de seguimiento débil',
    category: 'follow_up',
    problemWhen: true,
  },
  {
    key: 'signalManualWork',
    label: 'Señales de trabajo manual repetitivo',
    category: 'automation',
    problemWhen: true,
  },
  {
    key: 'signalWeakOnlinePresence',
    label: 'Señales de presencia online débil',
    category: 'lead_generation',
    problemWhen: true,
  },
]

// ─── Kronos Services Catalog ──────────────────────────────────────────────────

// Prices calibrated for LATAM SMB market (USD).
// Total proposal = primary + complementary services only (not all matched).
export const KRONOS_SERVICES: Record<string, KronosService> = {
  whatsapp_automation: {
    name: 'Automatización de WhatsApp',
    difficulty: 'low',
    timeEstimate: '1–2 semanas',
    priceMin: 500,
    priceMax: 1200,
  },
  appointment_booking: {
    name: 'Sistema de Reservas y Citas',
    difficulty: 'medium',
    timeEstimate: '2–3 semanas',
    priceMin: 500,
    priceMax: 1500,
  },
  lead_capture_funnel: {
    name: 'Funnel de Captura de Leads',
    difficulty: 'medium',
    timeEstimate: '2–3 semanas',
    priceMin: 500,
    priceMax: 1200,
  },
  crm_followup_automation: {
    name: 'CRM y Automatización de Seguimiento',
    difficulty: 'medium',
    timeEstimate: '3–5 semanas',
    priceMin: 800,
    priceMax: 2000,
  },
  google_business_setup: {
    name: 'Configuración de Google Business',
    difficulty: 'low',
    timeEstimate: '1 semana',
    priceMin: 150,
    priceMax: 400,
  },
  review_management: {
    name: 'Gestión de Reseñas',
    difficulty: 'low',
    timeEstimate: '1–2 semanas',
    priceMin: 200,
    priceMax: 500,
  },
  social_media_presence: {
    name: 'Paquete de Presencia en Redes Sociales',
    difficulty: 'medium',
    timeEstimate: '3–4 semanas',
    priceMin: 400,
    priceMax: 900,
  },
  website_development: {
    name: 'Desarrollo de Sitio Web',
    difficulty: 'high',
    timeEstimate: '6–10 semanas',
    priceMin: 800,
    priceMax: 2500,
  },
  sales_process_automation: {
    name: 'Automatización del Proceso de Ventas',
    difficulty: 'high',
    timeEstimate: '4–8 semanas',
    priceMin: 1200,
    priceMax: 3500,
  },
  digital_presence_audit: {
    name: 'Auditoría de Presencia Digital',
    difficulty: 'low',
    timeEstimate: '1 semana',
    priceMin: 150,
    priceMax: 350,
  },
}

// ─── Industry baseline data for Revenue Opportunity calculations ──────────────

export const INDUSTRY_BASELINES: Record<
  string,
  { monthlyContacts: number; averageDealValue: number }
> = {
  dental: { monthlyContacts: 80, averageDealValue: 200 },
  real_estate: { monthlyContacts: 40, averageDealValue: 3000 },
  law_firm: { monthlyContacts: 30, averageDealValue: 1500 },
  default: { monthlyContacts: 50, averageDealValue: 500 },
}

// ─── Priority thresholds ──────────────────────────────────────────────────────

export const PRIORITY_THRESHOLDS = {
  hot: 80,
  high: 60,
  medium: 40,
} as const
