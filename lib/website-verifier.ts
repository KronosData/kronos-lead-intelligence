// Website identity verifier.
// Determines whether a discovered URL belongs to the business we are researching.
// Uses bigram similarity against the page title / og:title detected during web analysis.

import type { ResearchResult } from './web-analyzer'

export type WebsiteVerificationStatus =
  | 'VERIFIED'      // title matches business name (similarity ≥ 0.4)
  | 'MISMATCH'      // title clearly belongs to a different business (similarity < 0.2)
  | 'UNVERIFIED'    // page loaded but no title detected
  | 'UNREACHABLE'   // fetch failed or HTTP error
  | 'NOT_PROVIDED'  // no URL in the record
  | 'UNKNOWN'       // parked domain or SPA — cannot determine

export interface VerificationResult {
  status: WebsiteVerificationStatus
  nameMatchScore: number   // 0–1 bigram similarity
  isParked: boolean
  detectedName: string | null
}

// ── Bigram similarity (same algorithm as discovery/normalizer.ts) ─────────────

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
  const out = new Set<string>()
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2))
  return out
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

// ── Main export ───────────────────────────────────────────────────────────────

export function verifyIdentity(businessName: string, research: ResearchResult | null): VerificationResult {
  if (!research) {
    return { status: 'NOT_PROVIDED', nameMatchScore: 0, isParked: false, detectedName: null }
  }

  if (!research.success) {
    return { status: 'UNREACHABLE', nameMatchScore: 0, isParked: false, detectedName: null }
  }

  if (research.isParkedDomain) {
    return { status: 'UNKNOWN', nameMatchScore: 0, isParked: true, detectedName: research.detectedName }
  }

  if (!research.detectedName) {
    // SPA or no title — could not compare
    if (research.isSPA) {
      return { status: 'UNKNOWN', nameMatchScore: 0, isParked: false, detectedName: null }
    }
    return { status: 'UNVERIFIED', nameMatchScore: 0, isParked: false, detectedName: null }
  }

  const score = similarity(slugify(businessName), slugify(research.detectedName))

  let status: WebsiteVerificationStatus
  if (score >= 0.4) {
    status = 'VERIFIED'
  } else if (score < 0.2) {
    status = 'MISMATCH'
  } else {
    // 0.2 ≤ score < 0.4 — partial match, could be abbreviation or trade name
    status = 'UNVERIFIED'
  }

  return { status, nameMatchScore: score, isParked: false, detectedName: research.detectedName }
}
