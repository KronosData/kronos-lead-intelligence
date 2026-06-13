import type { BusinessSize, ProspectProfile, SearchMode, SellabilityClass, CommercialQualification } from '@/lib/prospecting/config'

export type { BusinessSize, ProspectProfile, SearchMode, SellabilityClass, CommercialQualification }

export type DiscoverySource = 'here' | 'osm'

// Enriched candidate returned by normalizeAndDedup (after full qualification pipeline).
export interface DiscoveryCandidate {
  source: DiscoverySource
  externalId: string
  name: string
  industry: string
  country: string
  city: string
  address: string
  website: string | null
  phone: string | null
  latitude: number | null
  longitude: number | null
  googleBusinessUrl: string | null
  confidence: number              // 0–100 source quality
  alreadyExists: boolean
  duplicateReason: string | null
  existingCompanyId: string | null

  // Phase 3.8 — Prospect analysis (computed in normalizer)
  prospectFitScore: number
  estimatedBusinessSize: BusinessSize
  businessSizeConfidence: 'high' | 'medium' | 'low'
  chainDetected: boolean
  chainEvidence: string[]
  prospectProfile: ProspectProfile
  contactabilityScore: number
  opportunityReasons: string[]
  prospectRisks: string[]
  potentialPackageSlug: string | null
  rankBeforeReranking: number    // position in merged+deduped list (pre-rerank)
  rankAfterReranking: number     // position after sorting by SQS

  // Phase 3.9 — Commercial qualification
  entityType: string                          // EntityType value
  entityIsCommercial: boolean
  entityExclusionReason: string | null
  commercialQualification: CommercialQualification
  salesQualificationScore: number            // SQS 0-100 (primary sort key)
  sellabilityClass: SellabilityClass
  roiFitScore: number                        // 0-100
  roiFitLabel: string                        // excellent | good | limited | not_defensible
  roiMultiple: number                        // annual benefit / project cost
  paybackMonths: number
  budgetCapacityScore: number                // 0-100
  budgetCapacityLabel: string                // low | medium | high | unknown
  economicModelType: string                  // appointment_based | quote_based | etc.
  primaryProblem: string | null
  whyContact: string[]                       // positive signals (max 4)
  whyNotContact: string[]                    // red flags (max 4)
  qualificationQuestions: string[]           // for sales call prep (max 3)

  // Evidence qualification
  candidateTier: 1 | 2 | 3 | 4              // 1=best: ICP+contact+pain; 4=discard
  websiteVerificationStatus: string          // NOT_PROVIDED | VERIFIED | MISMATCH | UNVERIFIED | UNREACHABLE | UNKNOWN
  commercialState: string                    // READY_TO_CONTACT | OFFER_AUDIT | RESEARCH_REQUIRED | NURTURE | DISQUALIFIED
}

// Raw candidate produced by adapters (before any enrichment).
export type RawCandidate = Omit<DiscoveryCandidate,
  | 'prospectFitScore'
  | 'estimatedBusinessSize'
  | 'businessSizeConfidence'
  | 'chainDetected'
  | 'chainEvidence'
  | 'prospectProfile'
  | 'contactabilityScore'
  | 'opportunityReasons'
  | 'prospectRisks'
  | 'potentialPackageSlug'
  | 'rankBeforeReranking'
  | 'rankAfterReranking'
  // Phase 3.9
  | 'entityType'
  | 'entityIsCommercial'
  | 'entityExclusionReason'
  | 'commercialQualification'
  | 'salesQualificationScore'
  | 'sellabilityClass'
  | 'roiFitScore'
  | 'roiFitLabel'
  | 'roiMultiple'
  | 'paybackMonths'
  | 'budgetCapacityScore'
  | 'budgetCapacityLabel'
  | 'economicModelType'
  | 'primaryProblem'
  | 'whyContact'
  | 'whyNotContact'
  | 'qualificationQuestions'
  | 'candidateTier'
  | 'websiteVerificationStatus'
  | 'commercialState'
>

// Search params from the frontend (API route schema).
export interface DiscoverySearchParams {
  query: string
  city: string
  country: string
  district?: string
  radiusKm?: number
  limit: number
  mode?: SearchMode
  excludeChains?: boolean
  excludeLarge?: boolean
  requireContact?: boolean
  minProspectFitScore?: number
  minSalesQualScore?: number   // Phase 3.9
  privateBusiness?: boolean    // Phase 3.9: only private_business entities
  excludePublicProjects?: boolean // Phase 3.9: always filter infrastructure/gov
}

// Params passed to HERE adapter (pre-geocoded).
export interface HereAdapterParams {
  query: string
  country: string
  city: string                              // for fallback city name in normalization
  position: { lat: number; lng: number }
  grid: Array<{ lat: number; lng: number }>
  limit: number                             // per-point limit
  countryIso3: string                       // e.g. 'PER'
}

// Params passed to OSM adapter (pre-geocoded).
export interface OsmAdapterParams {
  query: string
  country: string
  city: string
  position: { lat: number; lng: number }
  bbox: [south: number, north: number, west: number, east: number] | null
  limit: number
}

export interface ImportedCompanyResult {
  candidateExternalId: string
  status: 'imported' | 'duplicate' | 'failed'
  companyId: string | null
  companyName: string
  opportunityScore: number | null
  priorityLevel: string | null
  hasWebsite: boolean
  webAnalyzed: boolean
  detectedPhone: string | null
  error: string | null
}
