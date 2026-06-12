// Signal evidence model — distinguishes confirmed, inferred, and unknown signal states.
// This is the core fix for the scoring inflation bug: unknown ≠ problem.

import type { SignalFlags } from './types'
import type { ResearchResult } from './web-analyzer'
import { SIGNAL_DEFINITIONS } from './constants'

export type EvidenceStatus = 'positive' | 'negative' | 'unknown' | 'inferred'

export interface SignalEvidenceEntry {
  status: EvidenceStatus
  source: string
  confidence: 'high' | 'medium' | 'low' | 'none'
  evidence: string | null
}

export type SignalKey = keyof SignalFlags

export type SignalEvidenceMap = Partial<Record<SignalKey, SignalEvidenceEntry>>

const TOTAL_SIGNALS = 15

// ─── Coverage ─────────────────────────────────────────────────────────────────

export function computeCoverage(evidence: SignalEvidenceMap): number {
  const known = Object.values(evidence).filter((e) => e.status !== 'unknown').length
  return Math.round((known / TOTAL_SIGNALS) * 100)
}

export function scoreConfidenceFromCoverage(coverage: number): 'high' | 'medium' | 'low' {
  if (coverage >= 70) return 'high'
  if (coverage >= 40) return 'medium'
  return 'low'
}

export function evaluationStatusFromCoverage(coverage: number): 'complete' | 'preliminary' | 'manual_review_required' {
  if (coverage >= 70) return 'complete'
  if (coverage >= 40) return 'preliminary'
  return 'manual_review_required'
}

// ─── Neutralize unknown signals for scoring ───────────────────────────────────
// Unknown signals contribute zero points (neutral) — they are not problems.
// positive signals (problemWhen=false) with unknown evidence → treated as present (true)
// negative signals (problemWhen=true) with unknown evidence → treated as absent (false)

export function applyEvidence(signals: SignalFlags, evidence: SignalEvidenceMap): SignalFlags {
  const result = { ...signals }

  for (const [key, entry] of Object.entries(evidence)) {
    if (entry.status !== 'unknown') continue

    const signalKey = key as SignalKey
    const def = SIGNAL_DEFINITIONS.find((s) => s.key === signalKey)
    if (!def) continue

    // Neutral: assume positive signals are present, negative signals are absent
    result[signalKey] = !def.problemWhen
  }

  return result
}

// ─── Evidence builders ────────────────────────────────────────────────────────

const UNKNOWN: SignalEvidenceEntry = { status: 'unknown', source: 'no_data', confidence: 'none', evidence: null }

export function evidenceNoWebsite(): SignalEvidenceMap {
  return {
    signalHasWebsite:           { status: 'negative', source: 'discovery_no_website_tag', confidence: 'high', evidence: 'No se encontró URL de sitio web en la fuente de descubrimiento' },
    signalWeakOnlinePresence:   { status: 'inferred', source: 'derived_no_website', confidence: 'medium', evidence: 'Sin sitio web registrado, se infiere presencia online débil' },
    signalHasWhatsapp:          UNKNOWN,
    signalHasContactForm:       UNKNOWN,
    signalHasBookingSystem:     UNKNOWN,
    signalHasInstagram:         UNKNOWN,
    signalHasLinkedin:          UNKNOWN,
    signalHasGoogleBusiness:    UNKNOWN,
    signalHasReviews:           UNKNOWN,
    signalHasUnansweredReviews: UNKNOWN,
    signalHasClearCta:          UNKNOWN,
    signalHasLeadCapture:       UNKNOWN,
    signalSlowResponse:         UNKNOWN,
    signalWeakFollowup:         UNKNOWN,
    signalManualWork:           UNKNOWN,
  }
}

export function evidenceAllManual(signals: SignalFlags): SignalEvidenceMap {
  const map: SignalEvidenceMap = {}
  for (const key of Object.keys(signals) as SignalKey[]) {
    map[key] = {
      status: signals[key] ? 'positive' : 'negative',
      source: 'manual',
      confidence: 'high',
      evidence: 'Ingresado manualmente',
    }
  }
  return map
}

export function evidenceFromWebAnalysis(research: ResearchResult): SignalEvidenceMap {
  const map: SignalEvidenceMap = {}

  // Website availability is always known after a web analysis attempt
  if (research.success) {
    map.signalHasWebsite = { status: 'positive', source: 'web_fetch_success', confidence: 'high', evidence: research.fetchedUrl }
  } else {
    map.signalHasWebsite = { status: 'negative', source: 'web_fetch_failed', confidence: 'high', evidence: research.error ?? 'fetch failed' }
  }

  // Map web-analyzer signal results to evidence entries
  const signalKeys: SignalKey[] = [
    'signalHasWhatsapp', 'signalHasContactForm', 'signalHasBookingSystem',
    'signalHasInstagram', 'signalHasLinkedin', 'signalHasGoogleBusiness',
    'signalHasReviews', 'signalHasUnansweredReviews', 'signalHasClearCta',
    'signalHasLeadCapture', 'signalSlowResponse', 'signalWeakFollowup',
    'signalManualWork', 'signalWeakOnlinePresence',
  ]

  for (const key of signalKeys) {
    const sr = research.signals[key]
    if (!sr) { map[key] = UNKNOWN; continue }
    if (sr.value === null) {
      map[key] = UNKNOWN
    } else {
      map[key] = {
        status: sr.value ? 'positive' : 'negative',
        source: sr.source,
        confidence: sr.confidence as 'high' | 'medium' | 'low' | 'none',
        evidence: sr.source,
      }
    }
  }

  return map
}
