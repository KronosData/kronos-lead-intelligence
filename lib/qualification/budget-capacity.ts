// @legacy — v2 does NOT estimate budget capacity before an audit.
// Budget is validated during the free audit conversation with the prospect.
// Archived: do not import in new routes or UI primary views.
// Budget Capacity Score: estimates a prospect's ability to pay for Kronos services.
// Inferred from industry type, business size, and available signals.
// Score range: 0-100. Labels: low | medium | high | unknown.

import { getIndustryProfile } from '@/lib/economics/industry-models'
import type { BusinessSize } from '@/lib/prospecting/config'

export type BudgetCapacityLabel = 'low' | 'medium' | 'high' | 'unknown'

export interface BudgetCapacityResult {
  score: number               // 0-100
  label: BudgetCapacityLabel
  reasoning: string[]         // human-readable signals used
}

// Size multipliers: small businesses have lower capacity than medium
const SIZE_MULTIPLIERS: Record<BusinessSize, number> = {
  micro:   0.60,
  small:   1.00,
  medium:  1.35,
  large:   1.60,
  unknown: 0.80,
}

export function computeBudgetCapacity(params: {
  industry:    string
  name:        string
  businessSize: BusinessSize
  hasWebsite:  boolean
  hasPhone:    boolean
}): BudgetCapacityResult {
  const { industry, name, businessSize, hasWebsite, hasPhone } = params
  const reasoning: string[] = []

  const profile = getIndustryProfile(industry, name)
  let score     = profile.budgetCapacityBase

  reasoning.push(`Industria: ${industry} → base ${profile.budgetCapacityBase}/100`)

  // Size adjustment
  const mult = SIZE_MULTIPLIERS[businessSize]
  score = score * mult
  if (businessSize !== 'unknown') {
    reasoning.push(`Tamaño estimado ${businessSize} → ×${mult}`)
  }

  // Signal adjustments
  if (hasWebsite) {
    score += 8
    reasoning.push('+8 tiene sitio web (señal de inversión digital)')
  }
  if (hasPhone) {
    score += 4
    reasoning.push('+4 teléfono disponible (negocio activo)')
  }
  if (!hasWebsite && !hasPhone) {
    score -= 12
    reasoning.push('-12 sin web ni teléfono (señales mínimas)')
  }

  score = Math.round(Math.min(100, Math.max(0, score)))

  let label: BudgetCapacityLabel
  if (!hasWebsite && !hasPhone && businessSize === 'unknown') {
    label = 'unknown'
  } else if (score >= 66) {
    label = 'high'
  } else if (score >= 36) {
    label = 'medium'
  } else {
    label = 'low'
  }

  return { score, label, reasoning }
}
