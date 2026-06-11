// Deduplicates candidates within a batch and marks ones that already exist in DB.

import { prisma } from '@/lib/db'
import type { DiscoveryCandidate } from './types'

// ── Name similarity ────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Jaccard similarity over 2-char bigrams
function similarity(a: string, b: string): number {
  if (a === b) return 1
  const bigrams = (s: string) => {
    const set = new Set<string>()
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
    return set
  }
  const sa = bigrams(a)
  const sb = bigrams(b)
  if (sa.size === 0 || sb.size === 0) return 0
  let intersection = 0
  for (const bg of sa) if (sb.has(bg)) intersection++
  return intersection / (sa.size + sb.size - intersection)
}

const NAME_THRESHOLD = 0.72

// ── Within-batch deduplication ─────────────────────────────────────────────

function deduplicateBatch(candidates: DiscoveryCandidate[]): DiscoveryCandidate[] {
  const kept: DiscoveryCandidate[] = []
  for (const c of candidates) {
    const slug = slugify(c.name)
    const isDup = kept.some(k => {
      if (k.country !== c.country) return false
      const sim = similarity(slugify(k.name), slug)
      return sim >= NAME_THRESHOLD
    })
    if (!isDup) kept.push(c)
  }
  return kept
}

// ── Existing-company check ─────────────────────────────────────────────────

type DbCompany = { id: string; name: string; country: string; website: string | null }

async function markExisting(candidates: DiscoveryCandidate[]): Promise<DiscoveryCandidate[]> {
  if (candidates.length === 0) return candidates

  // Fetch companies from same countries
  const countries = [...new Set(candidates.map(c => c.country))]
  const existing: DbCompany[] = await prisma.company.findMany({
    where: { country: { in: countries } },
    select: { id: true, name: true, country: true, website: true },
  })

  return candidates.map(c => {
    const slug = slugify(c.name)

    // Website exact match
    if (c.website) {
      const webHost = normalizeHost(c.website)
      const byWeb = existing.find(e => e.website && normalizeHost(e.website) === webHost)
      if (byWeb) {
        return { ...c, alreadyExists: true, duplicateReason: 'website', existingCompanyId: byWeb.id }
      }
    }

    // Name fuzzy match within same country
    const byName = existing.find(e =>
      e.country === c.country && similarity(slugify(e.name), slug) >= NAME_THRESHOLD
    )
    if (byName) {
      return { ...c, alreadyExists: true, duplicateReason: 'name', existingCompanyId: byName.id }
    }

    return c
  })
}

function normalizeHost(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return url.toLowerCase().replace(/^www\./, '')
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function normalizeAndDedup(
  hereResults: DiscoveryCandidate[],
  osmResults:  DiscoveryCandidate[],
  limit: number,
): Promise<DiscoveryCandidate[]> {
  // Merge: HERE first (higher confidence), then OSM
  const merged = [...hereResults, ...osmResults]

  // Cross-source dedup
  const deduped = deduplicateBatch(merged)

  // Sort by confidence desc
  deduped.sort((a, b) => b.confidence - a.confidence)

  // Trim to requested limit
  const trimmed = deduped.slice(0, limit)

  // Mark existing DB companies
  return markExisting(trimmed)
}
