// Sales Qualification Score (SQS): primary ranking for Phase 3.9 discovery.
// Combines PFS + opportunity signals + ROI fit + contactability + budget + evidence.
// Score range: 0-100. Maps to a Sellability class.
//
// Formula:
//   SQS = PFS×0.25 + OpportunityRaw×0.20 + ROIFit×0.20
//         + ContactabilityRaw×0.15 + BudgetCapacity×0.10 + EvidenceQuality×0.10
//
// Hard disqualification: non-commercial entity → SQS capped at 5.

import type { RoiFitResult }            from './roi-fit'
import type { BudgetCapacityResult }    from './budget-capacity'
import type { CommercialGateResult }    from './commercial-gate'
import type { EntityClassification }    from './entity-classifier'
import type { IndustryProfile }         from '@/lib/economics/industry-models'

export type SellabilityClass =
  | 'sell_now'          // SQS ≥ 70, qualified — start sales conversation immediately
  | 'contact_diagnosis' // SQS 50–69 — contact to verify and diagnose
  | 'investigate'       // SQS 35–49 — gather more data before contacting
  | 'nurture'           // SQS 20–34 — monitor, not worth contacting now
  | 'discard'           // SQS < 20 or disqualified entity — do not pursue

export const SELLABILITY_LABELS: Record<SellabilityClass, string> = {
  sell_now:          'Contactar ahora',
  contact_diagnosis: 'Diagnóstico por contacto',
  investigate:       'Investigar primero',
  nurture:           'Monitorear',
  discard:           'Descartar',
}

export const SELLABILITY_DESCRIPTIONS: Record<SellabilityClass, string> = {
  sell_now:          'Señales claras de oportunidad, capacidad de pago y contacto disponible',
  contact_diagnosis: 'Señales prometedoras — contactar para confirmar necesidad real',
  investigate:       'Datos insuficientes — investigar antes de invertir tiempo de ventas',
  nurture:           'No urgente — mantener en radar para recontactar en 3-6 meses',
  discard:           'Entidad no viable o sin capacidad económica para Kronos',
}

export interface SalesQualificationResult {
  score:                   number             // 0-100 SQS
  sellabilityClass:        SellabilityClass
  commercialQualification: string            // from gate
  whyContact:              string[]           // max 4 positive reasons
  whyNotContact:           string[]           // max 4 red flags
  qualificationQuestions:  string[]           // max 3 questions for sales call
  primaryProblem:          string | null
  economicModelType:       string
}

export interface SQSInput {
  pfsScore:            number   // 0-100 Prospect Fit Score
  opportunityRaw:      number   // 0-100 raw opportunity visible (from PFS computation)
  contactabilityRaw:   number   // 0-100 raw contactability (from PFS computation)
  evidenceQualityRaw:  number   // 0-100 raw evidence quality (from PFS computation)
  roiFit:              RoiFitResult
  budgetCapacity:      BudgetCapacityResult
  commercialGate:      CommercialGateResult
  entityClass:         EntityClassification
  industryProfile:     IndustryProfile
  hasWebsite:          boolean
  hasPhone:            boolean
  opportunityReasons:  string[]  // from PFS
  prospectRisks:       string[]  // from PFS
}

export function computeSalesQualificationScore(input: SQSInput): SalesQualificationResult {
  const {
    pfsScore,
    opportunityRaw,
    contactabilityRaw,
    evidenceQualityRaw,
    roiFit,
    budgetCapacity,
    commercialGate,
    entityClass,
    industryProfile,
    hasWebsite,
    hasPhone,
    opportunityReasons,
    prospectRisks,
  } = input

  // Hard disqualification: non-commercial entity
  if (!entityClass.isCommerciallyViable) {
    return {
      score:                   0,
      sellabilityClass:        'discard',
      commercialQualification: commercialGate.qualification,
      whyContact:              [],
      whyNotContact:           [
        entityClass.exclusionReason ?? 'Entidad no comercial',
        ...entityClass.detectedSignals.slice(0, 2),
      ],
      qualificationQuestions:  [],
      primaryProblem:          null,
      economicModelType:       'unknown',
    }
  }

  // ── SQS computation ────────────────────────────────────────────────────────

  const sqsRaw =
    pfsScore           * 0.25 +
    opportunityRaw     * 0.20 +
    roiFit.score       * 0.20 +
    contactabilityRaw  * 0.15 +
    budgetCapacity.score * 0.10 +
    evidenceQualityRaw * 0.10

  let score = Math.round(Math.min(100, Math.max(0, sqsRaw)))

  // Additional penalties for disqualified gate
  if (commercialGate.qualification === 'disqualified') {
    score = Math.min(score, 15)
  } else if (commercialGate.qualification === 'research_required') {
    score = Math.min(score, 45)
  }

  // ── Sellability class ──────────────────────────────────────────────────────

  let sellabilityClass: SellabilityClass
  if (score < 20 || commercialGate.qualification === 'disqualified') {
    sellabilityClass = 'discard'
  } else if (score < 35) {
    sellabilityClass = 'nurture'
  } else if (score < 50) {
    sellabilityClass = 'investigate'
  } else if (score < 70) {
    sellabilityClass = 'contact_diagnosis'
  } else {
    sellabilityClass = 'sell_now'
  }

  // ── Why contact ─────────────────────────────────────────────────────────────

  const whyContact: string[] = []

  if (entityClass.isCommerciallyViable) {
    whyContact.push('Empresa privada con decisor comercial identificable')
  }
  if (hasWebsite && hasPhone) {
    whyContact.push('Contacto disponible: web + teléfono')
  } else if (hasPhone) {
    whyContact.push('Teléfono disponible para primer contacto')
  } else if (hasWebsite) {
    whyContact.push('Sitio web disponible para análisis y contacto')
  }
  if (roiFit.label === 'excellent' || roiFit.label === 'good') {
    whyContact.push(`ROI ${roiFit.label}: ×${roiFit.roiMultiple} estimado (recupera en ${roiFit.paybackMonths} meses)`)
  }
  if (budgetCapacity.label === 'high') {
    whyContact.push('Alta capacidad de pago estimada para el sector')
  } else if (budgetCapacity.label === 'medium') {
    whyContact.push('Capacidad de pago media — presupuesto alcanzable')
  }
  for (const reason of opportunityReasons.slice(0, 2)) {
    if (!whyContact.includes(reason)) whyContact.push(reason)
  }

  // ── Why NOT contact ────────────────────────────────────────────────────────

  const whyNotContact: string[] = []

  if (!hasWebsite && !hasPhone) {
    whyNotContact.push('Sin web ni teléfono — no hay forma de contactar o analizar')
  }
  if (roiFit.label === 'not_defensible') {
    whyNotContact.push(`ROI no defendible: ×${roiFit.roiMultiple} — la inversión no se recupera`)
  } else if (roiFit.label === 'limited') {
    whyNotContact.push('ROI limitado — requiere propuesta muy ajustada al precio más bajo')
  }
  if (budgetCapacity.label === 'low') {
    whyNotContact.push('Capacidad de pago baja para este sector/tamaño')
  } else if (budgetCapacity.label === 'unknown') {
    whyNotContact.push('Capacidad de pago desconocida — verificar antes de proponer')
  }
  if (commercialGate.qualification === 'research_required') {
    whyNotContact.push('Señales insuficientes — investigar antes de invertir tiempo de ventas')
  }
  for (const risk of prospectRisks.slice(0, 2)) {
    if (!whyNotContact.includes(risk)) whyNotContact.push(risk)
  }

  return {
    score,
    sellabilityClass,
    commercialQualification: commercialGate.qualification,
    whyContact:              whyContact.slice(0, 4),
    whyNotContact:           whyNotContact.slice(0, 4),
    qualificationQuestions:  industryProfile.qualificationQuestions.slice(0, 3),
    primaryProblem:          industryProfile.primaryProblem,
    economicModelType:       industryProfile.modelType,
  }
}
