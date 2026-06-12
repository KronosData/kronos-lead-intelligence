import type { SignalFlags, CategoryScores, PriorityLevel } from './types'
import { PRIORITY_THRESHOLDS } from './constants'
import {
  applyEvidence,
  computeCoverage,
  scoreConfidenceFromCoverage,
  evaluationStatusFromCoverage,
  type SignalEvidenceMap,
} from './evidence'

// ─── Category score calculators (pure functions) ──────────────────────────────
// Each signal belongs to exactly one category.
// Score represents opportunity for Kronos — more problems = higher score.

function scoreLeadGeneration(s: SignalFlags): number {
  let score = 0
  if (!s.signalHasContactForm) score += 40       // no contact form → leads lost
  if (!s.signalHasWhatsapp) score += 35           // no WhatsApp → no easy contact
  if (s.signalWeakOnlinePresence) score += 25     // weak presence → invisible to leads
  return Math.min(score, 100)
}

function scoreFollowUp(s: SignalFlags): number {
  let score = 0
  if (s.signalSlowResponse) score += 50           // slow response → leads going cold
  if (s.signalWeakFollowup) score += 50           // no follow-up → revenue bleeding
  return Math.min(score, 100)
}

function scoreConversionProcess(s: SignalFlags): number {
  let score = 0
  if (!s.signalHasClearCta) score += 55           // no CTA → visitors don't convert
  if (!s.signalHasLeadCapture) score += 45        // no capture → traffic wasted
  return Math.min(score, 100)
}

function scoreAutomationOpportunity(s: SignalFlags): number {
  let score = 0
  if (s.signalManualWork) score += 60             // manual work → automation candidate
  if (!s.signalHasBookingSystem) score += 40      // no booking → manual scheduling
  return Math.min(score, 100)
}

function scoreOnlinePresence(s: SignalFlags): number {
  let score = 0
  if (!s.signalHasWebsite) score += 50            // no website → invisible online
  if (!s.signalHasInstagram) score += 30          // no Instagram → weak social reach
  if (!s.signalHasLinkedin) score += 20           // no LinkedIn → weak professional presence
  return Math.min(score, 100)
}

function scoreReputation(s: SignalFlags): number {
  let score = 0
  if (!s.signalHasGoogleBusiness) score += 40     // no GBP → invisible in local search
  if (!s.signalHasReviews) score += 30            // no reviews → no social proof
  if (s.signalHasUnansweredReviews) score += 30   // unanswered reviews → active damage
  return Math.min(score, 100)
}

function getPriorityLevel(opportunityScore: number): PriorityLevel {
  if (opportunityScore >= PRIORITY_THRESHOLDS.hot) return 'hot'
  if (opportunityScore >= PRIORITY_THRESHOLDS.high) return 'high'
  if (opportunityScore >= PRIORITY_THRESHOLDS.medium) return 'medium'
  return 'low'
}

// ─── Main scoring function ────────────────────────────────────────────────────

// computeScoresWithEvidence neutralizes unknown signals before scoring.
// Coverage < 40% → priority capped at 'medium'; score reflects only confirmed evidence.
export function computeScoresWithEvidence(
  signals: SignalFlags,
  evidence: SignalEvidenceMap,
): CategoryScores {
  const neutralized = applyEvidence(signals, evidence)
  const base = computeScores(neutralized)
  const coverage = computeCoverage(evidence)

  let { priorityLevel } = base
  if (coverage < 40 && (priorityLevel === 'hot' || priorityLevel === 'high')) {
    priorityLevel = 'medium'
  }

  return {
    ...base,
    priorityLevel,
    researchCoverage: coverage,
    scoreConfidence: scoreConfidenceFromCoverage(coverage),
    evaluationStatus: evaluationStatusFromCoverage(coverage),
  }
}

export function computeScores(signals: SignalFlags): CategoryScores {
  const leadGen = scoreLeadGeneration(signals)
  const followUp = scoreFollowUp(signals)
  const conversion = scoreConversionProcess(signals)
  const automation = scoreAutomationOpportunity(signals)
  const onlinePresence = scoreOnlinePresence(signals)
  const reputation = scoreReputation(signals)

  const opportunityScore = Math.round(
    leadGen * 0.25 +
    followUp * 0.25 +
    conversion * 0.20 +
    automation * 0.15 +
    onlinePresence * 0.10 +
    reputation * 0.05
  )

  return {
    scoreLeadGeneration: leadGen,
    scoreFollowUp: followUp,
    scoreConversionProcess: conversion,
    scoreAutomationOpportunity: automation,
    scoreOnlinePresence: onlinePresence,
    scoreReputation: reputation,
    opportunityScore,
    priorityLevel: getPriorityLevel(opportunityScore),
  }
}
