// Discovery normalizer: merges HERE + OSM raw candidates, runs the full Phase 3.9
// qualification pipeline, sorts by SQS (not PFS), and applies mode filters.
//
// Pipeline per candidate:
//   1. estimateBusinessSize
//   2. computeProspectFitScore (PFS + raw components)
//   3. classifyEntity
//   4. computeRoiFit
//   5. computeBudgetCapacity
//   6. evaluateCommercialGate
//   7. computeSalesQualificationScore (SQS — primary sort key)

import { prisma }                          from '@/lib/db'
import { estimateBusinessSizeFromDiscovery } from '@/lib/prospecting/business-size'
import { computeProspectFitScore }           from '@/lib/prospecting/prospect-fit'
import { SEARCH_MODE_CONFIGS }               from '@/lib/prospecting/config'
import { classifyEntity }                    from '@/lib/qualification/entity-classifier'
import { computeRoiFit }                     from '@/lib/qualification/roi-fit'
import { computeBudgetCapacity }             from '@/lib/qualification/budget-capacity'
import { evaluateCommercialGate }            from '@/lib/qualification/commercial-gate'
import { computeSalesQualificationScore }    from '@/lib/qualification/sales-qualification'
import { getIndustryProfile }                from '@/lib/economics/industry-models'
import type { RawCandidate, DiscoveryCandidate, SearchMode } from './types'

// ── Normalizer options ─────────────────────────────────────────────────────────

export interface NormalizerOptions {
  limit:                number
  mode:                 SearchMode
  excludeChains?:       boolean
  excludeLarge?:        boolean
  requireContact?:      boolean
  minProspectFitScore?: number
  minSalesQualScore?:   number    // Phase 3.9
  privateBusiness?:     boolean   // Phase 3.9: only private_business entities
  excludePublicProjects?: boolean // Phase 3.9: filter infrastructure/gov
}

// ── Name similarity ────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>()
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
  return set
}

function similarity(a: string, b: string): number {
  if (a === b) return 1
  const sa = bigrams(a)
  const sb = bigrams(b)
  if (sa.size === 0 || sb.size === 0) return 0
  let inter = 0
  for (const bg of sa) if (sb.has(bg)) inter++
  return inter / (sa.size + sb.size - inter)
}

const NAME_THRESHOLD = 0.72

function normalizeHost(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return url.toLowerCase().replace(/^www\./, '')
  }
}

// ── Cross-source deduplication ─────────────────────────────────────────────────

function deduplicateRaw(candidates: RawCandidate[]): RawCandidate[] {
  const kept: RawCandidate[] = []
  for (const c of candidates) {
    const slug  = slugify(c.name)
    const host  = c.website ? normalizeHost(c.website) : null
    const isDup = kept.some(k => {
      if (k.country !== c.country) return false
      if (host && k.website && normalizeHost(k.website) === host) return true
      return similarity(slugify(k.name), slug) >= NAME_THRESHOLD
    })
    if (!isDup) kept.push(c)
  }
  return kept
}

// ── Domain / name frequency maps (for chain detection) ────────────────────────

function buildFrequencyMaps(candidates: RawCandidate[]): {
  domainFreq: Map<string, number>
  nameFreq:   Map<string, number>
} {
  const domainFreq = new Map<string, number>()
  const nameFreq   = new Map<string, number>()

  for (const c of candidates) {
    if (c.website) {
      const host = normalizeHost(c.website)
      domainFreq.set(host, (domainFreq.get(host) ?? 0) + 1)
    }
    const sig = slugify(c.name).split(' ').filter(w => w.length >= 3).slice(0, 3).join(' ')
    if (sig.length >= 4) {
      nameFreq.set(sig, (nameFreq.get(sig) ?? 0) + 1)
    }
  }

  return { domainFreq, nameFreq }
}

// ── Existing-company check ─────────────────────────────────────────────────────

type DbCompany = { id: string; name: string; country: string; website: string | null }

async function markExisting(
  candidates: DiscoveryCandidate[],
): Promise<DiscoveryCandidate[]> {
  if (candidates.length === 0) return candidates

  const countries = [...new Set(candidates.map(c => c.country))]
  const existing: DbCompany[] = await prisma.company.findMany({
    where: { country: { in: countries } },
    select: { id: true, name: true, country: true, website: true },
  })

  return candidates.map(c => {
    const slug = slugify(c.name)

    if (c.website) {
      const cHost = normalizeHost(c.website)
      const byWeb = existing.find(e => e.website && normalizeHost(e.website) === cHost)
      if (byWeb) return { ...c, alreadyExists: true, duplicateReason: 'website', existingCompanyId: byWeb.id }
    }

    const byName = existing.find(e =>
      e.country === c.country && similarity(slugify(e.name), slug) >= NAME_THRESHOLD
    )
    if (byName) return { ...c, alreadyExists: true, duplicateReason: 'name', existingCompanyId: byName.id }

    return c
  })
}

// ── Full enrichment pipeline: raw → DiscoveryCandidate ────────────────────────

const NON_COMMERCIAL_ENTITY_TYPES = [
  'government_entity',
  'public_project',
  'infrastructure_project',
  'nonprofit',
  'educational_public',
  'healthcare_public',
  'association',
  'place_landmark',
  'branch_large_chain',
]

function enrich(
  raw: RawCandidate,
  domainFreq: Map<string, number>,
  nameFreq:   Map<string, number>,
  rankBefore: number,
): Omit<DiscoveryCandidate, 'rankAfterReranking'> {
  const host    = raw.website ? normalizeHost(raw.website) : null
  const sameDom = host ? (domainFreq.get(host) ?? 1) - 1 : 0
  const sig     = slugify(raw.name).split(' ').filter(w => w.length >= 3).slice(0, 3).join(' ')
  const sameName = sig.length >= 4 ? (nameFreq.get(sig) ?? 1) - 1 : 0

  // Phase 3.8: business size + PFS
  const businessSize = estimateBusinessSizeFromDiscovery(
    raw.name, raw.website, raw.industry, sameDom, sameName,
  )
  const pfs = computeProspectFitScore({
    name:         raw.name,
    industry:     raw.industry,
    website:      raw.website,
    phone:        raw.phone,
    address:      raw.address,
    businessSize,
  })

  // Phase 3.9: entity classification
  const entityClass = classifyEntity(raw.name, raw.industry, raw.address, raw.website)

  // Phase 3.9: ROI Fit
  const roiFit = computeRoiFit({
    industry:            raw.industry,
    name:                raw.name,
    businessSize:        businessSize.size,
    hasWebsite:          !!raw.website,
    isCommerciallyViable: entityClass.isCommerciallyViable,
  })

  // Phase 3.9: Budget Capacity
  const budgetCapacity = computeBudgetCapacity({
    industry:     raw.industry,
    name:         raw.name,
    businessSize: businessSize.size,
    hasWebsite:   !!raw.website,
    hasPhone:     !!raw.phone,
  })

  // Phase 3.9: Commercial Gate
  const hasOpportunity = pfs.opportunityVisibleRaw >= 30
  const commercialGate = evaluateCommercialGate({
    entityType:           entityClass.entityType,
    isCommerciallyViable: entityClass.isCommerciallyViable,
    hasContact:           !!(raw.website || raw.phone),
    hasOpportunity,
    roiFitLabel:          roiFit.label,
    budgetCapacityLabel:  budgetCapacity.label,
  })

  // Phase 3.9: Industry profile for problem + questions
  const industryProfile = getIndustryProfile(raw.industry, raw.name)

  // Phase 3.9: Sales Qualification Score (SQS)
  const sqs = computeSalesQualificationScore({
    pfsScore:            pfs.score,
    opportunityRaw:      pfs.opportunityVisibleRaw,
    contactabilityRaw:   pfs.contactabilityRaw,
    evidenceQualityRaw:  pfs.evidenceQualityRaw,
    roiFit,
    budgetCapacity,
    commercialGate,
    entityClass,
    industryProfile,
    hasWebsite:          !!raw.website,
    hasPhone:            !!raw.phone,
    opportunityReasons:  pfs.opportunityReasons,
    prospectRisks:       pfs.prospectRisks,
  })

  return {
    ...raw,
    // Phase 3.8
    prospectFitScore:       pfs.score,
    estimatedBusinessSize:  businessSize.size,
    businessSizeConfidence: businessSize.confidence,
    chainDetected:          businessSize.chainDetected,
    chainEvidence:          businessSize.chainEvidence,
    prospectProfile:        pfs.profile,
    contactabilityScore:    pfs.contactabilityScore,
    opportunityReasons:     pfs.opportunityReasons,
    prospectRisks:          pfs.prospectRisks,
    potentialPackageSlug:   pfs.potentialPackageSlug,
    rankBeforeReranking:    rankBefore,
    // Phase 3.9
    entityType:             entityClass.entityType,
    entityIsCommercial:     entityClass.isCommerciallyViable,
    entityExclusionReason:  entityClass.exclusionReason,
    commercialQualification: commercialGate.qualification,
    salesQualificationScore: sqs.score,
    sellabilityClass:       sqs.sellabilityClass,
    roiFitScore:            roiFit.score,
    roiFitLabel:            roiFit.label,
    roiMultiple:            roiFit.roiMultiple,
    paybackMonths:          roiFit.paybackMonths,
    budgetCapacityScore:    budgetCapacity.score,
    budgetCapacityLabel:    budgetCapacity.label,
    economicModelType:      sqs.economicModelType,
    primaryProblem:         sqs.primaryProblem,
    whyContact:             sqs.whyContact,
    whyNotContact:          sqs.whyNotContact,
    qualificationQuestions: sqs.qualificationQuestions,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function normalizeAndDedup(
  here: RawCandidate[],
  osm:  RawCandidate[],
  options: NormalizerOptions,
): Promise<DiscoveryCandidate[]> {
  const modeConfig = SEARCH_MODE_CONFIGS[options.mode]

  const excludeChains       = options.excludeChains     ?? modeConfig.excludeChains
  const excludeLarge        = options.excludeLarge       ?? modeConfig.excludeLarge
  const requireContact      = options.requireContact     ?? modeConfig.requireContact
  const minPFS              = options.minProspectFitScore ?? modeConfig.minPFS
  const minSQS              = options.minSalesQualScore  ?? modeConfig.minSQS
  const requirePrivate      = options.privateBusiness    ?? modeConfig.requirePrivate
  const excludePublicProjects = options.excludePublicProjects ?? true

  // HERE first (higher confidence), OSM second
  const merged = deduplicateRaw([...here, ...osm])

  // Build frequency maps from full merged set (chain detection needs full context)
  const { domainFreq, nameFreq } = buildFrequencyMaps(merged)

  // Enrich each candidate with full qualification pipeline
  const enriched = merged.map((raw, i) =>
    enrich(raw, domainFreq, nameFreq, i + 1)
  )

  // Apply mode filters
  const filtered = enriched.filter(c => {
    // Phase 3.9: commercial entity gate
    if (requirePrivate && !c.entityIsCommercial)              return false
    if (excludePublicProjects && NON_COMMERCIAL_ENTITY_TYPES.includes(c.entityType)) return false

    // Phase 3.9: SQS threshold (primary)
    if (c.salesQualificationScore < minSQS)                   return false

    // Phase 3.8: PFS threshold (secondary guard)
    if (c.prospectFitScore < minPFS)                          return false

    // Phase 3.8: size and chain filters
    if (excludeChains && c.chainDetected)                     return false
    if (excludeLarge && c.estimatedBusinessSize === 'large')  return false
    if (requireContact && !c.website && !c.phone)             return false

    return true
  })

  // Sort by SQS desc (Phase 3.9 primary), then PFS desc as tiebreaker
  filtered.sort((a, b) =>
    b.salesQualificationScore - a.salesQualificationScore ||
    b.prospectFitScore - a.prospectFitScore
  )

  // Assign post-rerank positions and trim to requested limit
  const ranked: DiscoveryCandidate[] = filtered
    .slice(0, options.limit)
    .map((c, i) => ({ ...c, rankAfterReranking: i + 1 }))

  // Mark existing DB companies
  return markExisting(ranked)
}
