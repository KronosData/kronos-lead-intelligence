export type DiscoverySource = 'here' | 'osm'

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
  confidence: number // 0–100
  alreadyExists: boolean
  duplicateReason: string | null
  existingCompanyId: string | null
}

export interface DiscoverySearchParams {
  query: string
  city: string
  country: string
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
