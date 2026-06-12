// Discovery normalizer: merges HERE + OSM raw candidates, enriches with
// Prospect Fit Score, reranks by PFS, and applies mode filters.

import { prisma } from '@/lib/db'
import { estimateBusinessSizeFromDiscovery } from '@/lib/prospecting/business-size'
import { computeProspectFitScore }           from '@/lib/prospecting/prospect-fit'
import { SEARCH_MODE_CONFIGS }               from '@/lib/prospecting/config'
import type { RawCandidate, DiscoveryCandidate, SearchMode } from './types'

// ── Normalizer options ─────────────────────────────────────────────────────────

export interface NormalizerOptions {
  limit:               number
  mode:                SearchMode
  excludeChains?:      boolean
  excludeLarge?:       boolean
  requireContact?:     boolean
  minProspectFitScore?: number
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
    const slug   = slugify(c.name)
    const host   = c.website ? normalizeHost(c.website) : null
    const isDup  = kept.some(k => {
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
    // First 3 significant words of the name as a "name signature"
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

// ── Enrichment: raw → DiscoveryCandidate ──────────────────────────────────────

function enrich(
  raw: RawCandidate,
  domainFreq: Map<string, number>,
  nameFreq:   Map<string, number>,
  rankBefore: number,
): Omit<DiscoveryCandidate, 'rankAfterReranking'> {
  const host    = raw.website ? normalizeHost(raw.website) : null
  const sameDom = host ? (domainFreq.get(host) ?? 1) - 1 : 0

  const sig      = slugify(raw.name).split(' ').filter(w => w.length >= 3).slice(0, 3).join(' ')
  const sameName = sig.length >= 4 ? (nameFreq.get(sig) ?? 1) - 1 : 0

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

  return {
    ...raw,
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
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function normalizeAndDedup(
  here: RawCandidate[],
  osm:  RawCandidate[],
  options: NormalizerOptions,
): Promise<DiscoveryCandidate[]> {
  const modeConfig = SEARCH_MODE_CONFIGS[options.mode]

  const excludeChains = options.excludeChains ?? modeConfig.excludeChains
  const excludeLarge  = options.excludeLarge  ?? modeConfig.excludeLarge
  const requireContact = options.requireContact ?? modeConfig.requireContact
  const minPFS         = options.minProspectFitScore ?? modeConfig.minPFS

  // HERE first (higher confidence), OSM second
  const merged  = deduplicateRaw([...here, ...osm])

  // Build frequency maps from the full merged set (chain detection needs full context)
  const { domainFreq, nameFreq } = buildFrequencyMaps(merged)

  // Enrich each candidate with PFS and business size (assign pre-rerank positions 1-indexed)
  const enriched = merged.map((raw, i) =>
    enrich(raw, domainFreq, nameFreq, i + 1)
  )

  // Apply mode filters
  const filtered = enriched.filter(c => {
    if (c.prospectFitScore < minPFS)                          return false
    if (excludeChains && c.chainDetected)                     return false
    if (excludeLarge && c.estimatedBusinessSize === 'large')  return false
    if (requireContact && !c.website && !c.phone)             return false
    return true
  })

  // Rerank by PFS desc
  filtered.sort((a, b) => b.prospectFitScore - a.prospectFitScore)

  // Assign post-rerank positions and trim to requested limit
  const ranked: DiscoveryCandidate[] = filtered
    .slice(0, options.limit)
    .map((c, i) => ({ ...c, rankAfterReranking: i + 1 }))

  // Mark existing DB companies
  return markExisting(ranked)
}
