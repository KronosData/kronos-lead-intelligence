// ROI Fit Score: estimates whether a Kronos project is economically defensible
// for a specific prospect, based on industry model + size + available signals.
// Score range: 0-100. Labels: excellent | good | limited | not_defensible.

import { getIndustryProfile } from '@/lib/economics/industry-models'
import type { BusinessSize } from '@/lib/prospecting/config'

export type RoiFitLabel = 'excellent' | 'good' | 'limited' | 'not_defensible'

export interface RoiFitResult {
  score:              number         // 0-100
  label:              RoiFitLabel
  roiMultiple:        number         // annualBenefitMid / projectCostMid
  paybackMonths:      number         // projectCostMid / (annualBenefitMid / 12)
  annualBenefitMin:   number         // USD, conservative estimate
  annualBenefitMid:   number         // USD, typical estimate
  projectCostMin:     number         // USD, cheapest applicable Kronos package
  projectCostMax:     number         // USD, full package
  reasoning:          string[]
}

// Kronos package price ranges (USD) — from official catalog
const KRONOS_PRICE_RANGES = {
  min: 350,   // cheapest individual service
  mid: 1200,  // typical project
  max: 3500,  // full package
}

// Size factor for benefit estimates: larger businesses get proportionally more benefit
const SIZE_BENEFIT_FACTORS: Record<BusinessSize, number> = {
  micro:   0.50,
  small:   1.00,
  medium:  1.80,
  large:   2.50,
  unknown: 0.75,
}

export function computeRoiFit(params: {
  industry:    string
  name:        string
  businessSize: BusinessSize
  hasWebsite:  boolean
  isCommerciallyViable: boolean
}): RoiFitResult {
  const { industry, name, businessSize, hasWebsite, isCommerciallyViable } = params
  const reasoning: string[] = []

  // Non-commercial entities always get not_defensible
  if (!isCommerciallyViable) {
    return {
      score: 0, label: 'not_defensible',
      roiMultiple: 0, paybackMonths: 999,
      annualBenefitMin: 0, annualBenefitMid: 0,
      projectCostMin: KRONOS_PRICE_RANGES.min, projectCostMax: KRONOS_PRICE_RANGES.max,
      reasoning: ['Entidad no comercial — ROI no aplicable'],
    }
  }

  const profile    = getIndustryProfile(industry, name)
  const sizeFactor = SIZE_BENEFIT_FACTORS[businessSize]

  const benefitMin = Math.round(profile.annualBenefitLow  * sizeFactor)
  const benefitMid = Math.round(profile.annualBenefitMid  * sizeFactor)

  reasoning.push(`Modelo económico: ${profile.modelType}`)
  reasoning.push(`Beneficio anual estimado: $${benefitMin}–$${benefitMid} USD`)
  reasoning.push(`Factor de tamaño (${businessSize}): ×${sizeFactor}`)

  // If no website and no online presence, reduce benefit (harder to capture value)
  const effectiveBenefitMid = hasWebsite ? benefitMid : Math.round(benefitMid * 0.7)
  if (!hasWebsite) {
    reasoning.push('−30% ajuste por ausencia de presencia digital')
  }

  const projectCostMid = KRONOS_PRICE_RANGES.mid

  const roiMultiple   = Math.round((effectiveBenefitMid / projectCostMid) * 10) / 10
  const paybackMonths = roiMultiple > 0
    ? Math.round(projectCostMid / (effectiveBenefitMid / 12))
    : 999

  reasoning.push(`ROI múltiplo: ×${roiMultiple} (beneficio anual / proyecto típico $${projectCostMid})`)
  reasoning.push(`Recuperación estimada: ${paybackMonths === 999 ? 'no calculable' : paybackMonths + ' meses'}`)

  // Convert ROI multiple to 0-100 score
  // ×5+ and ≤3 months → 100
  // ×3+ and ≤6 months → 75-85
  // ×1.5-3 and ≤12 months → 45-65
  // <1.5 → 10-35
  let score: number
  let label: RoiFitLabel

  if (roiMultiple >= 5 && paybackMonths <= 3) {
    score = 95; label = 'excellent'
  } else if (roiMultiple >= 5) {
    score = 88; label = 'excellent'
  } else if (roiMultiple >= 3 && paybackMonths <= 6) {
    score = 80; label = 'good'
  } else if (roiMultiple >= 3) {
    score = 70; label = 'good'
  } else if (roiMultiple >= 2 && paybackMonths <= 12) {
    score = 60; label = 'limited'
  } else if (roiMultiple >= 1.5) {
    score = 45; label = 'limited'
  } else if (roiMultiple >= 1.0) {
    score = 25; label = 'not_defensible'
  } else {
    score = 10; label = 'not_defensible'
  }

  return {
    score,
    label,
    roiMultiple,
    paybackMonths,
    annualBenefitMin: benefitMin,
    annualBenefitMid: effectiveBenefitMid,
    projectCostMin:   KRONOS_PRICE_RANGES.min,
    projectCostMax:   KRONOS_PRICE_RANGES.max,
    reasoning,
  }
}
