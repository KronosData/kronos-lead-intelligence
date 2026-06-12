// Typed fetch wrappers for all backend endpoints.
// Used exclusively by the frontend — do not import in API routes.

const BASE = '/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  industry: string
  country: string
  city: string | null
  website: string | null
  whatsapp: string | null
  instagram: string | null
  linkedin: string | null
  googleBusinessUrl: string | null
  status: string
  leadSource: string | null
  latestOpportunityScore: number
  latestPriorityLevel: string
  latestEvaluatedAt: string | null
  latestPackageSlug: string | null
  latestPrimaryService: string | null
  latestScoreConfidence: string | null
  // Phase 3.8 — Prospect fit fields
  prospectFitScore: number | null
  salesPriorityScore: number | null
  estimatedBusinessSize: string | null
  businessSizeConfidence: string | null
  chainDetected: boolean
  prospectProfile: string | null
  contactabilityScore: number | null
  opportunityReasons: string[]
  prospectRisks: string[]
  discoverySearchCountry: string | null
  discoverySearchCity: string | null
  discoverySearchDistrict: string | null
  discoveryMode: string | null
  discoveryRankBefore: number | null
  discoveryRankAfter: number | null
  // Phase 3.9 — Commercial qualification
  entityType: string | null
  entityIsCommercial: boolean
  entityExclusionReason: string | null
  commercialQualification: string | null
  salesQualificationScore: number | null
  sellabilityClass: string | null
  roiFitScore: number | null
  roiFitLabel: string | null
  roiMultiple: number | null
  paybackMonths: number | null
  budgetCapacityScore: number | null
  budgetCapacityLabel: string | null
  economicModelType: string | null
  primaryProblem: string | null
  whyContact: string[]
  whyNotContact: string[]
  qualificationQuestions: string[]
  createdAt: string
  updatedAt: string
}

export interface Evaluation {
  id: string
  companyId: string
  evaluatedBy: string
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
  scoreLeadGeneration: number
  scoreFollowUp: number
  scoreConversionProcess: number
  scoreAutomationOpportunity: number
  scoreOnlinePresence: number
  scoreReputation: number
  opportunityScore: number
  priorityLevel: string
  detectedProblems: string[]
  probablePainPoint: string
  recommendedSolution: string
  estimatedValueMin: number
  estimatedValueMax: number
  estimatedLeadsLostPerMonth: number
  estimatedRevenueLostPerMonth: number
  estimatedRoiPotential: number
  recommendedServices: string[]
  primaryService: string | null
  complementaryServices: string[]
  futureServices: string[]
  implementationDifficulty: string
  implementationTimeEstimate: string
  estimatedProjectPriceMin: number
  estimatedProjectPriceMax: number
  priceLabel: string | null
  signalEvidence: Record<string, { status: string; source: string; confidence: string; evidence: string | null }> | null
  researchCoverage: number | null
  scoreConfidence: string | null
  evaluationStatus: string | null
  // Package recommendation fields
  recommendedPackageSlug: string | null
  recommendedPackageName: string | null
  alternativePackageSlug: string | null
  alternativePackageName: string | null
  packageReason: string | null
  packageEvidence: string[]
  packageConfidence: string | null
  packageCoverage: number | null
  packagePriceMin: number | null
  packagePriceMax: number | null
  packageTimelineMin: number | null
  packageTimelineMax: number | null
  officialSourceUrl: string | null
  catalogVersion: string | null
  evaluatedAt: string
  updatedAt: string
}

export interface SalesNote {
  id: string
  companyId: string
  contactName: string | null
  contactRole: string | null
  contactPhone: string | null
  contactEmail: string | null
  contactStatus: string
  meetingStatus: string
  meetingDate: string | null
  meetingNotes: string | null
  budgetMin: number | null
  budgetMax: number | null
  budgetCurrency: string
  objections: string | null
  followUpNotes: string | null
  salesObservations: string | null
  nextAction: string | null
  nextActionDate: string | null
  assignedTo: string | null
  closeProbability: number | null
  lostReason: string | null
  createdAt: string
  updatedAt: string
}

export interface OutreachRecord {
  id: string
  companyId: string
  channel: string
  messageSent: string | null
  sentBy: string | null
  sentAt: string
  responseReceived: boolean
  responseType: string | null
  responseNotes: string | null
  repliedAt: string | null
  nextFollowUpAt: string | null
  sequenceNumber: number
  templateUsed: string | null
  channelAccount: string | null
  isAutomated: boolean
  createdAt: string
  updatedAt: string
}

export interface CompanyDetail extends Company {
  latestEvaluation: Evaluation | null
  salesNote: SalesNote | null
}

export interface CompanyListParams {
  country?: string
  industry?: string
  priority?: string
  status?: string
  minScore?: number
  maxScore?: number
  package?: string
  confidence?: string
  minCoverage?: number
  evaluationStatus?: string
  prospectProfile?: string
  estimatedBusinessSize?: string
  chainDetected?: boolean
  minProspectFitScore?: number
  minSalesPriorityScore?: number
  // Phase 3.9
  sellabilityClass?: string
  entityType?: string
  minSalesQualScore?: number
  entityIsCommercial?: boolean
  sort?: string
  limit?: number
  offset?: number
}

// ─── Companies ────────────────────────────────────────────────────────────────

export async function listCompanies(params: CompanyListParams = {}): Promise<{
  data: Company[]
  total: number
  limit: number
  offset: number
}> {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v))
  })
  return req(`/companies?${q}`)
}

export async function getCompany(id: string): Promise<CompanyDetail> {
  return req(`/companies/${id}`)
}

export async function createCompany(data: Record<string, unknown>): Promise<Company> {
  return req('/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateCompany(id: string, data: Record<string, unknown>): Promise<Company> {
  return req(`/companies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteCompany(id: string): Promise<void> {
  return req(`/companies/${id}`, { method: 'DELETE' })
}

// ─── Evaluations ──────────────────────────────────────────────────────────────

export async function evaluateCompany(
  id: string,
  data: Record<string, unknown>,
): Promise<Evaluation> {
  return req(`/companies/${id}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function listEvaluations(id: string): Promise<{ data: Evaluation[]; total: number }> {
  return req(`/companies/${id}/evaluations`)
}

export async function reprocessCompany(id: string): Promise<Record<string, unknown>> {
  return req(`/companies/${id}/reprocess`, { method: 'POST' })
}

// ─── Outreach ─────────────────────────────────────────────────────────────────

export async function listOutreach(id: string): Promise<{ data: OutreachRecord[]; total: number }> {
  return req(`/companies/${id}/outreach`)
}

export async function createOutreach(
  id: string,
  data: Record<string, unknown>,
): Promise<OutreachRecord> {
  return req(`/companies/${id}/outreach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// ─── Research ─────────────────────────────────────────────────────────────────

export type ResearchConfidence = 'high' | 'medium' | 'low' | 'none'

export interface ResearchSignal {
  value: boolean | null
  confidence: ResearchConfidence
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
  signals: Record<string, ResearchSignal>
  autoFilledCount: number
  manualRequiredCount: number
  warnings: string[]
  error?: string
}

export async function researchUrl(url: string): Promise<ResearchResult> {
  return req('/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
}

// ─── Sales Note ───────────────────────────────────────────────────────────────

export async function getSalesNote(id: string): Promise<SalesNote | null> {
  return req(`/companies/${id}/sales-note`)
}

export async function upsertSalesNote(
  id: string,
  data: Record<string, unknown>,
): Promise<SalesNote> {
  return req(`/companies/${id}/sales-note`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
