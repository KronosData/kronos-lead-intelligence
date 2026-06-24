export type CommercialStateV2 = 'OFFER_AUDIT' | 'CONTACT_READY' | 'RESEARCH_REQUIRED' | 'DISQUALIFIED'

export type IcpTier = 'STRONG' | 'GOOD' | 'MARGINAL' | 'NONE'

export interface VisibleSymptom {
  key: string
  label: string
  source: 'web_confirmed' | 'data_confirmed' | 'inferred'
  confidence: 'high' | 'medium' | 'low'
}

export interface AuditQuestion {
  symptomKey: string
  question: string
  area: string
}

export interface SignalEvidenceEntry {
  status: 'positive' | 'negative' | 'unknown' | 'inferred'
  confidence: 'high' | 'medium' | 'low' | 'none'
  source: string
}

export type SignalEvidenceMap = Record<string, SignalEvidenceEntry>

export interface ProspectSignalInput {
  name: string
  industry: string
  country: string
  city?: string | null
  website?: string | null

  isCommercial: boolean
  entityType?: string | null
  entityExclusionReason?: string | null

  evidence: SignalEvidenceMap
  evidenceCoverage: number  // 0-100

  websiteVerificationStatus?: string | null  // VERIFIED|UNVERIFIED|UNREACHABLE|MISMATCH|NOT_PROVIDED|UNKNOWN

  hasPhone: boolean
  hasWhatsapp: boolean
  hasEmail?: boolean
  hasInstagram?: boolean
  hasLinkedin?: boolean
}

export interface ProspectSignals {
  icpFitScore: number
  icpFitTier: IcpTier
  visibleSymptomsScore: number
  contactabilityScore: number
  auditPriorityScore: number

  commercialState: CommercialStateV2
  confirmedSymptoms: VisibleSymptom[]
  auditHook: string | null
  auditQuestions: AuditQuestion[]
  disqualificationReason: string | null

  evidenceCoverage: number
  isCommercial: boolean
}
