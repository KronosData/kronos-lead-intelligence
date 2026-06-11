import { z } from 'zod'

// ─── Shared primitives ─────────────────────────────────────────────────────────

const Country = z.enum(['peru', 'mexico', 'colombia', 'chile', 'spain'])

const CompanyStatus = z.enum(['active', 'contacted', 'client', 'archived'])

const LeadSource = z.enum([
  'google_maps', 'linkedin', 'instagram', 'facebook',
  'referral', 'website', 'cold_outreach', 'event', 'other',
])

const ContactStatus = z.enum([
  'not_contacted', 'attempted', 'contacted', 'in_conversation',
  'proposal_sent', 'negotiating', 'closed_won', 'closed_lost',
])

const MeetingStatus = z.enum([
  'not_scheduled', 'scheduled', 'completed', 'no_show', 'rescheduled',
])

const OutreachChannel = z.enum([
  'linkedin', 'email', 'whatsapp', 'instagram', 'call', 'other',
])

const ResponseType = z.enum([
  'interested', 'not_interested', 'no_response',
  'asked_to_follow_up', 'booked_call', 'closed_won', 'closed_lost',
])

// ─── Company schemas ───────────────────────────────────────────────────────────

export const CompanyCreateSchema = z.object({
  name:               z.string().min(1).max(255),
  industry:           z.string().min(1).max(255),
  country:            Country,
  city:               z.string().max(255).optional(),
  website:            z.string().url().optional().or(z.literal('')).transform(v => v || undefined),
  whatsapp:           z.string().max(50).optional(),
  instagram:          z.string().max(255).optional(),
  linkedin:           z.string().max(255).optional(),
  googleBusinessUrl:  z.string().url().optional().or(z.literal('')).transform(v => v || undefined),
  status:             CompanyStatus.default('active'),
  leadSource:         LeadSource.optional(),
})

export const CompanyUpdateSchema = CompanyCreateSchema.partial()

// ─── Evaluation schema ─────────────────────────────────────────────────────────

const SignalFlagsSchema = z.object({
  signalHasWebsite:           z.boolean(),
  signalHasWhatsapp:          z.boolean(),
  signalHasContactForm:       z.boolean(),
  signalHasBookingSystem:     z.boolean(),
  signalHasInstagram:         z.boolean(),
  signalHasLinkedin:          z.boolean(),
  signalHasGoogleBusiness:    z.boolean(),
  signalHasReviews:           z.boolean(),
  signalHasUnansweredReviews: z.boolean(),
  signalHasClearCta:          z.boolean(),
  signalHasLeadCapture:       z.boolean(),
  signalSlowResponse:         z.boolean(),
  signalWeakFollowup:         z.boolean(),
  signalManualWork:           z.boolean(),
  signalWeakOnlinePresence:   z.boolean(),
})

export const EvaluationSchema = SignalFlagsSchema.extend({
  evaluatedBy: z.string().min(1).max(255),
})

// ─── Sales note schema ─────────────────────────────────────────────────────────

export const SalesNoteSchema = z.object({
  contactName:       z.string().max(255).optional(),
  contactRole:       z.string().max(255).optional(),
  contactPhone:      z.string().max(50).optional(),
  contactEmail:      z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  contactStatus:     ContactStatus.optional(),
  meetingStatus:     MeetingStatus.optional(),
  meetingDate:       z.coerce.date().optional(),
  meetingNotes:      z.string().optional(),
  budgetMin:         z.number().int().nonnegative().optional(),
  budgetMax:         z.number().int().nonnegative().optional(),
  budgetCurrency:    z.string().length(3).default('USD'),
  objections:        z.string().optional(),
  followUpNotes:     z.string().optional(),
  salesObservations: z.string().optional(),
  nextAction:        z.string().optional(),
  nextActionDate:    z.coerce.date().optional(),
  assignedTo:        z.string().max(255).optional(),
  closeProbability:  z.number().int().min(0).max(100).optional(),
  lostReason:        z.string().optional(),
})

// ─── Outreach history schema ───────────────────────────────────────────────────

export const OutreachHistorySchema = z.object({
  channel:          OutreachChannel,
  messageSent:      z.string().optional(),
  sentBy:           z.string().max(255).optional(),
  sentAt:           z.coerce.date().optional(),
  responseReceived: z.boolean().default(false),
  responseType:     ResponseType.optional(),
  responseNotes:    z.string().optional(),
  repliedAt:        z.coerce.date().optional(),
  nextFollowUpAt:   z.coerce.date().optional(),
  sequenceNumber:   z.number().int().positive().default(1),
  templateUsed:     z.string().max(255).optional(),
  channelAccount:   z.string().max(255).optional(),
  isAutomated:      z.boolean().default(false),
})

// ─── Query param schemas ───────────────────────────────────────────────────────

export const CompanyListQuerySchema = z.object({
  country:   Country.optional(),
  industry:  z.string().optional(),
  priority:  z.enum(['hot', 'high', 'medium', 'low']).optional(),
  status:    CompanyStatus.optional(),
  minScore:  z.coerce.number().int().min(0).max(100).optional(),
  maxScore:  z.coerce.number().int().min(0).max(100).optional(),
  sort:      z.enum(['score_desc', 'score_asc', 'created_asc', 'updated_desc']).default('score_desc'),
  limit:     z.coerce.number().int().positive().max(200).default(100),
  offset:    z.coerce.number().int().nonnegative().default(0),
})

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CompanyCreateInput  = z.infer<typeof CompanyCreateSchema>
export type CompanyUpdateInput  = z.infer<typeof CompanyUpdateSchema>
export type EvaluationInput     = z.infer<typeof EvaluationSchema>
export type SalesNoteInput      = z.infer<typeof SalesNoteSchema>
export type OutreachHistoryInput = z.infer<typeof OutreachHistorySchema>
export type CompanyListQuery    = z.infer<typeof CompanyListQuerySchema>
