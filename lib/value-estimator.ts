// @legacy — v2 Prospect Signal Engine does NOT compute revenue loss or ROI before an audit.
// This module is archived. Do not import in new code. Data produced by this module
// must NOT be shown in primary company views — display it only in the legacy evaluation history.
import type { SignalFlags, RevenueOpportunityOutput } from './types'
import { INDUSTRY_BASELINES } from './constants'

const INDUSTRY_CLOSE_RATE = 0.05

function getBaseline(industry: string): { monthlyContacts: number; averageDealValue: number } {
  const key = industry.toLowerCase()
  if (key.includes('dental') || key.includes('odontol')) return INDUSTRY_BASELINES.dental
  if (key.includes('inmob') || key.includes('real_estate')) return INDUSTRY_BASELINES.real_estate
  if (key.includes('legal') || key.includes('jurídico') || key.includes('law')) return INDUSTRY_BASELINES.law_firm
  return INDUSTRY_BASELINES.default
}

// ─── Lead loss rate from confirmed signals ─────────────────────────────────
// With evidence: only signals with known evidence contribute to the loss rate.
// Unknown signals are excluded — we don't claim losses we can't substantiate.

function computeLeadLossRate(s: SignalFlags): number {
  let rate = 0

  if (!s.signalHasClearCta) rate += 0.15
  if (!s.signalHasLeadCapture) rate += 0.15
  if (s.signalSlowResponse) rate += 0.20
  if (s.signalWeakFollowup) rate += 0.15
  if (!s.signalHasContactForm) rate += 0.10
  if (!s.signalHasWhatsapp) rate += 0.10
  if (s.signalWeakOnlinePresence) rate += 0.10

  return Math.min(rate, 0.80)
}

// ─── Main revenue estimator ───────────────────────────────────────────────────
// When coverage < 40%, revenue estimates are explicitly preliminary.

export function estimateRevenueOpportunity(
  signals: SignalFlags,
  industry: string,
  estimatedProjectPriceMin: number,
  coverage = 100,
): RevenueOpportunityOutput {
  const baseline = getBaseline(industry)
  const lossRate = computeLeadLossRate(signals)

  let estimatedLeadsLostPerMonth = Math.round(baseline.monthlyContacts * lossRate)
  let estimatedRevenueLostPerMonth = Math.round(
    estimatedLeadsLostPerMonth * baseline.averageDealValue * INDUSTRY_CLOSE_RATE
  )

  // Low coverage: apply a conservative multiplier to avoid overstating losses
  if (coverage < 40) {
    estimatedLeadsLostPerMonth = Math.round(estimatedLeadsLostPerMonth * 0.3)
    estimatedRevenueLostPerMonth = Math.round(estimatedRevenueLostPerMonth * 0.3)
  } else if (coverage < 70) {
    estimatedLeadsLostPerMonth = Math.round(estimatedLeadsLostPerMonth * 0.65)
    estimatedRevenueLostPerMonth = Math.round(estimatedRevenueLostPerMonth * 0.65)
  }

  const annualRecoveredRevenue = estimatedRevenueLostPerMonth * 12
  const projectCost = estimatedProjectPriceMin || 1
  const estimatedRoiPotential = Math.round(annualRecoveredRevenue / projectCost)

  return {
    estimatedLeadsLostPerMonth,
    estimatedRevenueLostPerMonth,
    estimatedRoiPotential,
  }
}
