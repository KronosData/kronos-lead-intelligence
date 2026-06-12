// Commercial Qualification Gate: determines if a prospect meets minimum
// requirements to be pursued as a commercial opportunity by Kronos.
// Returns a 4-level qualification label and which criteria pass/fail.

import type { RoiFitLabel }         from './roi-fit'
import type { BudgetCapacityLabel } from './budget-capacity'
import type { EntityType }          from './entity-classifier'

export type CommercialQualification =
  | 'qualified'              // clear opportunity, start sales conversation
  | 'conditionally_qualified'// opportunity exists, but some conditions must be verified
  | 'research_required'      // insufficient signals, need more data before contacting
  | 'disqualified'           // not a viable commercial prospect for Kronos

export interface CommercialGateResult {
  qualification:  CommercialQualification
  criteriaResults: CriterionResult[]
  passCount:       number
  totalCriteria:   number
  disqualifyReason: string | null
}

interface CriterionResult {
  name:    string
  passed:  boolean
  detail:  string
}

export function evaluateCommercialGate(params: {
  entityType:           EntityType
  isCommerciallyViable: boolean
  hasContact:           boolean    // website or phone
  hasOpportunity:       boolean    // at least one visible opportunity
  roiFitLabel:          RoiFitLabel
  budgetCapacityLabel:  BudgetCapacityLabel
}): CommercialGateResult {
  const {
    entityType,
    isCommerciallyViable,
    hasContact,
    hasOpportunity,
    roiFitLabel,
    budgetCapacityLabel,
  } = params

  // Criterion 1: Commercial entity
  const c1: CriterionResult = {
    name:   'Entidad comercial privada',
    passed: isCommerciallyViable,
    detail: isCommerciallyViable
      ? `Clasificada como ${entityType}`
      : `Excluida: ${entityType}`,
  }

  // Criterion 2: Contactable
  const c2: CriterionResult = {
    name:   'Al menos un canal de contacto',
    passed: hasContact,
    detail: hasContact
      ? 'Tiene web y/o teléfono'
      : 'Sin web ni teléfono — contacto no verificable',
  }

  // Criterion 3: Visible opportunity
  const c3: CriterionResult = {
    name:   'Oportunidad comercial visible',
    passed: hasOpportunity,
    detail: hasOpportunity
      ? 'Se detectaron oportunidades de mejora'
      : 'Sin señales claras de necesidad para Kronos',
  }

  // Criterion 4: ROI defensible
  const roiOk = roiFitLabel === 'excellent' || roiFitLabel === 'good'
  const roiPartial = roiFitLabel === 'limited'
  const c4: CriterionResult = {
    name:   'ROI defensible',
    passed: roiOk || roiPartial,
    detail: roiOk
      ? `ROI ${roiFitLabel} — inversión claramente justificable`
      : roiPartial
        ? 'ROI limitado — requiere propuesta cuidadosa'
        : 'ROI no defendible — inversión supera beneficio probable',
  }

  // Criterion 5: Budget capacity
  const budgetOk = budgetCapacityLabel === 'high' || budgetCapacityLabel === 'medium'
  const c5: CriterionResult = {
    name:   'Capacidad de pago estimada',
    passed: budgetOk,
    detail: budgetOk
      ? `Capacidad ${budgetCapacityLabel} — puede afrontar inversión Kronos`
      : budgetCapacityLabel === 'low'
        ? 'Capacidad baja — requiere verificación antes de proponer'
        : 'Señales insuficientes para estimar capacidad',
  }

  const criteria = [c1, c2, c3, c4, c5]
  const passCount = criteria.filter(c => c.passed).length

  // Hard disqualification: non-commercial entity
  if (!isCommerciallyViable) {
    return {
      qualification:    'disqualified',
      criteriaResults:  criteria,
      passCount,
      totalCriteria:    5,
      disqualifyReason: `Entidad no comercial (${entityType}) — no es un prospecto privado con decisor`,
    }
  }

  // ROI completely undefendable: disqualify
  if (roiFitLabel === 'not_defensible' && !roiPartial) {
    return {
      qualification:    'disqualified',
      criteriaResults:  criteria,
      passCount,
      totalCriteria:    5,
      disqualifyReason: 'ROI no defendible — la inversión no se recupera con el beneficio estimado',
    }
  }

  // Determine qualification level from pass count
  let qualification: CommercialQualification
  if (passCount >= 5) {
    qualification = 'qualified'
  } else if (passCount >= 3) {
    qualification = 'conditionally_qualified'
  } else if (passCount >= 1 && isCommerciallyViable) {
    qualification = 'research_required'
  } else {
    qualification = 'disqualified'
  }

  return {
    qualification,
    criteriaResults:  criteria,
    passCount,
    totalCriteria:    5,
    disqualifyReason: null,
  }
}
