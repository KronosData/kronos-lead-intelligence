import type { SignalFlags, RevenueOpportunityOutput } from './types'
import { INDUSTRY_BASELINES } from './constants'

// Industry average close rate from lead to paid client (conservative)
const INDUSTRY_CLOSE_RATE = 0.05

// ─── Resolve industry baseline ────────────────────────────────────────────────

function getBaseline(industry: string): { monthlyContacts: number; averageDealValue: number } {
  const key = industry.toLowerCase()
  if (key.includes('dental') || key.includes('odontol')) return INDUSTRY_BASELINES.dental
  if (key.includes('inmob') || key.includes('real_estate')) return INDUSTRY_BASELINES.real_estate
  if (key.includes('legal') || key.includes('jurídico') || key.includes('law')) return INDUSTRY_BASELINES.law_firm
  return INDUSTRY_BASELINES.default
}

// ─── Lead loss rate from signals ─────────────────────────────────────────────
// Each absent positive signal or present negative signal contributes
// to an estimated fraction of potential leads that are never captured.

function computeLeadLossRate(s: SignalFlags): number {
  let rate = 0

  if (!s.signalHasClearCta) rate += 0.15      // visitors leave without acting
  if (!s.signalHasLeadCapture) rate += 0.15   // no mechanism to collect contact
  if (s.signalSlowResponse) rate += 0.20      // delayed responses push leads cold
  if (s.signalWeakFollowup) rate += 0.15      // contacted leads not nurtured
  if (!s.signalHasContactForm) rate += 0.10   // no easy contact path
  if (!s.signalHasWhatsapp) rate += 0.10      // missing preferred contact channel
  if (s.signalWeakOnlinePresence) rate += 0.10 // fewer leads reach the business at all

  return Math.min(rate, 0.80) // cap at 80%
}

// ─── Main revenue estimator ───────────────────────────────────────────────────

export function estimateRevenueOpportunity(
  signals: SignalFlags,
  industry: string,
  estimatedProjectPriceMin: number,
): RevenueOpportunityOutput {
  const baseline = getBaseline(industry)
  const lossRate = computeLeadLossRate(signals)

  const estimatedLeadsLostPerMonth = Math.round(baseline.monthlyContacts * lossRate)
  const estimatedRevenueLostPerMonth = Math.round(
    estimatedLeadsLostPerMonth * baseline.averageDealValue * INDUSTRY_CLOSE_RATE
  )

  // ROI multiple = annual recovered revenue / project investment
  const annualRecoveredRevenue = estimatedRevenueLostPerMonth * 12
  const projectCost = estimatedProjectPriceMin || 1
  const estimatedRoiPotential = Math.round(annualRecoveredRevenue / projectCost)

  return {
    estimatedLeadsLostPerMonth,
    estimatedRevenueLostPerMonth,
    estimatedRoiPotential,
  }
}
