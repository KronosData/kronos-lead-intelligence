import type { BusinessSize, ProspectProfile, SearchMode } from '@/lib/prospecting/config'

export type { BusinessSize, ProspectProfile, SearchMode }

export type DiscoverySource = 'here' | 'osm'

// Enriched candidate returned by normalizeAndDedup (after PFS computation).
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
  rankAfterReranking: number     // position after sorting by PFS
}

// Raw candidate produced by adapters (before PFS enrichment).
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
