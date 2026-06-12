// Shared helper: builds CompositeInput from a company + its latest evaluation,
// runs computeCompositeScore, and returns the DB update payload for Company.

import { computeCompositeScore, type CompositeInput } from './composite-scorer'
import type { Evaluation, Company } from '@/app/generated/prisma/client'

type CompanyFields = Pick<Company,
  'name' | 'industry' | 'country' | 'website' | 'whatsapp' | 'instagram' | 'linkedin' |
  'googleBusinessUrl' | 'entityIsCommercial' | 'entityType' | 'sellabilityClass' |
  'budgetCapacityScore' | 'budgetCapacityLabel' | 'roiFitLabel' | 'roiFitScore' |
  'salesQualificationScore' | 'contactabilityScore' | 'estimatedBusinessSize' |
  'whyContact' | 'whyNotContact' | 'entityExclusionReason' | 'qualificationQuestions'
>

type EvalFields = Pick<Evaluation,
  'opportunityScore' | 'scoreLeadGeneration' | 'scoreFollowUp' | 'scoreConversionProcess' |
  'scoreAutomationOpportunity' | 'scoreOnlinePresence' | 'scoreReputation' |
  'researchCoverage' | 'scoreConfidence' |
  'signalHasWebsite' | 'signalHasWhatsapp' | 'signalHasContactForm' | 'signalHasBookingSystem' |
  'signalHasGoogleBusiness' | 'signalHasReviews' | 'signalHasUnansweredReviews' |
  'signalHasClearCta' | 'signalHasLeadCapture' | 'signalSlowResponse' |
  'signalWeakFollowup' | 'signalManualWork' | 'signalWeakOnlinePresence' |
  'detectedProblems' | 'probablePainPoint' | 'recommendedPackageSlug' | 'primaryService'
>

export function buildCompositeUpdatePayload(company: CompanyFields, ev?: EvalFields | null) {
  const input: CompositeInput = {
    name:                   company.name,
    industry:               company.industry,
    country:                company.country,
    website:                company.website,
    whatsapp:               company.whatsapp,
    instagram:              company.instagram,
    linkedin:               company.linkedin,
    googleBusinessUrl:      company.googleBusinessUrl,
    entityIsCommercial:     company.entityIsCommercial,
    entityType:             company.entityType,
    sellabilityClass:       company.sellabilityClass,
    budgetCapacityScore:    company.budgetCapacityScore,
    budgetCapacityLabel:    company.budgetCapacityLabel,
    roiFitLabel:            company.roiFitLabel,
    roiFitScore:            company.roiFitScore,
    salesQualificationScore: company.salesQualificationScore,
    contactabilityScore:    company.contactabilityScore,
    estimatedBusinessSize:  company.estimatedBusinessSize,
    whyContact:             company.whyContact,
    whyNotContact:          company.whyNotContact,
    entityExclusionReason:  company.entityExclusionReason,
    qualificationQuestions: company.qualificationQuestions,
    eval: ev ? {
      opportunityScore:           ev.opportunityScore,
      scoreLeadGeneration:        ev.scoreLeadGeneration,
      scoreFollowUp:              ev.scoreFollowUp,
      scoreConversionProcess:     ev.scoreConversionProcess,
      scoreAutomationOpportunity: ev.scoreAutomationOpportunity,
      scoreOnlinePresence:        ev.scoreOnlinePresence,
      scoreReputation:            ev.scoreReputation,
      researchCoverage:           ev.researchCoverage,
      scoreConfidence:            ev.scoreConfidence,
      signalHasWebsite:           ev.signalHasWebsite,
      signalHasWhatsapp:          ev.signalHasWhatsapp,
      signalHasContactForm:       ev.signalHasContactForm,
      signalHasBookingSystem:     ev.signalHasBookingSystem,
      signalHasGoogleBusiness:    ev.signalHasGoogleBusiness,
      signalHasReviews:           ev.signalHasReviews,
      signalHasUnansweredReviews: ev.signalHasUnansweredReviews,
      signalHasClearCta:          ev.signalHasClearCta,
      signalHasLeadCapture:       ev.signalHasLeadCapture,
      signalSlowResponse:         ev.signalSlowResponse,
      signalWeakFollowup:         ev.signalWeakFollowup,
      signalManualWork:           ev.signalManualWork,
      signalWeakOnlinePresence:   ev.signalWeakOnlinePresence,
      detectedProblems:           ev.detectedProblems,
      probablePainPoint:          ev.probablePainPoint,
      recommendedPackageSlug:     ev.recommendedPackageSlug,
      primaryService:             ev.primaryService,
    } : undefined,
  }

  const result = computeCompositeScore(input)

  return {
    icpFitScore:            result.icpFitScore,
    painScore:              result.painScore,
    paymentCapacityScore:   result.paymentCapacityScore,
    evidenceCoverageScore:  result.evidenceCoverageScore,
    commercialIntentScore:  result.commercialIntentScore,
    salesOpportunityScore:  result.salesOpportunityScore,
    evidenceTier:           result.evidenceTier,
    salesPriority:          result.salesPriority,
    qualificationReason:    result.qualificationReason,
    disqualificationReason: result.disqualificationReason,
    recommendedFirstAction: result.recommendedFirstAction,
  }
}
