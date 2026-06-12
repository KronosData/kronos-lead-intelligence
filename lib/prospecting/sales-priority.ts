import { SALES_PRIORITY_WEIGHTS } from './config'

// Sales Priority Score: composite of Opportunity Score + Prospect Fit Score + Confidence.
// Used as the primary dashboard sort and ranking metric.
export function computeSalesPriorityScore(
  opportunityScore: number,
  prospectFitScore: number,
  coveragePercent: number,  // 0–100
): number {
  const confidenceScore = Math.min(100, Math.max(0, coveragePercent))
  return Math.min(100, Math.max(0, Math.round(
    opportunityScore  * SALES_PRIORITY_WEIGHTS.opportunityScore  +
    prospectFitScore  * SALES_PRIORITY_WEIGHTS.prospectFitScore  +
    confidenceScore   * SALES_PRIORITY_WEIGHTS.confidenceScore,
  )))
}
