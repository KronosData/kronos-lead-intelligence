// ─── Core domain types for Kronos Lead Intelligence ───────────────────────────

export type Industry = string // free text — no enum restriction

export type Country =
  | 'peru' | 'mexico' | 'colombia' | 'chile' | 'spain'
  | 'argentina' | 'ecuador' | 'bolivia' | 'uruguay' | 'paraguay'
  | 'costa_rica' | 'panama' | 'guatemala' | 'honduras' | 'el_salvador' | 'nicaragua'

export type CompanyStatus = 'active' | 'contacted' | 'client' | 'archived'

export type LeadSource =
  | 'google_maps'
  | 'linkedin'
  | 'instagram'
  | 'facebook'
  | 'referral'
  | 'website'
  | 'cold_outreach'
  | 'event'
  | 'other'

export type PriorityLevel = 'hot' | 'high' | 'medium' | 'low'

export type ImplementationDifficulty = 'low' | 'medium' | 'high'

export type ContactStatus =
  | 'not_contacted'
  | 'attempted'
  | 'contacted'
  | 'in_conversation'
  | 'proposal_sent'
  | 'negotiating'
  | 'closed_won'
  | 'closed_lost'

export type MeetingStatus =
  | 'not_scheduled'
  | 'scheduled'
  | 'completed'
  | 'no_show'
  | 'rescheduled'

export type OutreachChannel =
  | 'linkedin'
  | 'email'
  | 'whatsapp'
  | 'instagram'
  | 'call'
  | 'other'

export type ResponseType =
  | 'interested'
  | 'not_interested'
  | 'no_response'
  | 'asked_to_follow_up'
  | 'booked_call'
  | 'closed_won'
  | 'closed_lost'

// ─── Signal flags input ────────────────────────────────────────────────────────

export interface SignalFlags {
  signalHasWebsite: boolean
  signalHasWhatsapp: boolean
  signalHasContactForm: boolean
  signalHasBookingSystem: boolean
  signalHasInstagram: boolean
  signalHasLinkedin: boolean
  signalHasGoogleBusiness: boolean
  signalHasReviews: boolean
  signalHasUnansweredReviews: boolean
  signalHasClearCta: boolean
  signalHasLeadCapture: boolean
  signalSlowResponse: boolean
  signalWeakFollowup: boolean
  signalManualWork: boolean
  signalWeakOnlinePresence: boolean
}

// ─── Scoring output ────────────────────────────────────────────────────────────

export interface CategoryScores {
  scoreLeadGeneration: number
  scoreFollowUp: number
  scoreConversionProcess: number
  scoreAutomationOpportunity: number
  scoreOnlinePresence: number
  scoreReputation: number
  opportunityScore: number
  priorityLevel: PriorityLevel
  // Evidence-aware fields (optional — absent in pre-evidence evaluations)
  researchCoverage?: number
  scoreConfidence?: 'high' | 'medium' | 'low'
  evaluationStatus?: 'complete' | 'preliminary' | 'manual_review_required'
}

// ─── Diagnosis output ──────────────────────────────────────────────────────────

export interface DiagnosisOutput {
  detectedProblems: string[]
  probablePainPoint: string
  recommendedSolution: string
  estimatedValueMin: number
  estimatedValueMax: number
}

// ─── Revenue Opportunity Module output ────────────────────────────────────────

export interface RevenueOpportunityOutput {
  estimatedLeadsLostPerMonth: number
  estimatedRevenueLostPerMonth: number
  estimatedRoiPotential: number
}

// ─── Service Match Engine output ──────────────────────────────────────────────

export interface ServiceMatchOutput {
  recommendedServices: string[]      // primary + complementary (backward compat)
  primaryService: string             // primary service name
  complementaryServices: string[]    // max 2 complementary service names
  futureServices: string[]           // remaining matched services
  implementationDifficulty: ImplementationDifficulty
  implementationTimeEstimate: string // primary service time estimate
  estimatedProjectPriceMin: number   // primary + complementary only
  estimatedProjectPriceMax: number
  priceLabel: string                 // "Rango preliminar" | "Estimado" | ""
}

// ─── Full evaluation computation result ───────────────────────────────────────

export interface EvaluationComputedResult
  extends CategoryScores,
    DiagnosisOutput,
    RevenueOpportunityOutput,
    ServiceMatchOutput {}

// ─── Company create input ──────────────────────────────────────────────────────

export interface CreateCompanyInput {
  name: string
  industry: string
  country: string
  city?: string
  website?: string
  whatsapp?: string
  instagram?: string
  linkedin?: string
  googleBusinessUrl?: string
  status?: CompanyStatus
  leadSource?: LeadSource
}

// ─── Evaluation create input ───────────────────────────────────────────────────

export interface CreateEvaluationInput extends SignalFlags {
  evaluatedBy: string
}

// ─── Dashboard list item ───────────────────────────────────────────────────────

export interface CompanyListItem {
  id: string
  name: string
  industry: string
  country: string
  status: string
  leadSource: string | null
  latestOpportunityScore: number
  latestPriorityLevel: string
  latestEvaluatedAt: Date | null
  createdAt: Date
}

// ─── Kronos service definition ────────────────────────────────────────────────

export interface KronosService {
  name: string
  difficulty: ImplementationDifficulty
  timeEstimate: string
  priceMin: number
  priceMax: number
}

// ─── Package recommendation output ───────────────────────────────────────────

export interface PackageRecommendation {
  recommendedPackageSlug: string
  recommendedPackageName: string
  alternativePackageSlug: string | null
  alternativePackageName: string | null
  packageReason: string
  packageEvidence: string[]
  packageConfidence: 'high' | 'medium' | 'low'
  packageCoverage: number
  packagePriceMin: number
  packagePriceMax: number
  packageTimelineMin: number
  packageTimelineMax: number
  officialSourceUrl: string
  catalogVersion: string
}

// ─── Outreach template type ───────────────────────────────────────────────────

export type OutreachTemplateType = 'package' | 'individual_service' | 'free_audit' | 'exploratory'
