// POST /api/companies/[id]/reprocess
// Creates a corrected evaluation for an existing company using the evidence model.
// Append-only: the old evaluation is preserved as historical record.
// Safe to call multiple times — each call adds a new evaluation.

import { prisma } from '@/lib/db'
import { analyzeUrl } from '@/lib/web-analyzer'
import { computeScoresWithEvidence } from '@/lib/scoring'
import { generateDiagnosis } from '@/lib/diagnosis'
import { matchServices } from '@/lib/service-match'
import { estimateRevenueOpportunity } from '@/lib/value-estimator'
import {
  evidenceNoWebsite,
  evidenceFromWebAnalysis,
  evidenceAllManual,
  computeCoverage,
  applyEvidence,
} from '@/lib/evidence'
import { recommendPackage }     from '@/lib/recommendations/package-mapper'
import { classifyEntity }       from '@/lib/qualification/entity-classifier'
import { computeRoiFit }        from '@/lib/qualification/roi-fit'
import { computeBudgetCapacity } from '@/lib/qualification/budget-capacity'
import { evaluateCommercialGate } from '@/lib/qualification/commercial-gate'
import { computeSalesQualificationScore } from '@/lib/qualification/sales-qualification'
import { getIndustryProfile }   from '@/lib/economics/industry-models'
import { computeProspectFitScore } from '@/lib/prospecting/prospect-fit'
import { estimateBusinessSizeFromDiscovery } from '@/lib/prospecting/business-size'
import { buildCompositeUpdatePayload } from '@/lib/scoring/apply-composite'
import { verifyIdentity } from '@/lib/website-verifier'
import { computeCommercialState } from '@/lib/commercial-state'
import { ok, notFound, serverError } from '@/lib/api-helpers'
import type { SignalFlags } from '@/lib/types'
import type { SignalEvidenceMap } from '@/lib/evidence'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true, name: true, industry: true, website: true, leadSource: true,
        city: true, country: true, whatsapp: true, instagram: true, linkedin: true,
        googleBusinessUrl: true, estimatedBusinessSize: true,
        // For composite scorer (Phase 4)
        entityIsCommercial: true, entityType: true, sellabilityClass: true,
        budgetCapacityScore: true, budgetCapacityLabel: true, roiFitLabel: true,
        roiFitScore: true, salesQualificationScore: true, contactabilityScore: true,
        whyContact: true, whyNotContact: true, entityExclusionReason: true,
        qualificationQuestions: true,
        // Evidence qualification
        websiteVerificationStatus: true,
      },
    })
    if (!company) return notFound('Company')

    // Find the latest evaluation to use as the signal baseline
    const latestEv = await prisma.evaluation.findFirst({
      where: { companyId: id },
      orderBy: { evaluatedAt: 'desc' },
    })

    const prevScore    = latestEv?.opportunityScore ?? null
    const prevPriority = latestEv?.priorityLevel ?? null
    const prevCoverage = latestEv?.researchCoverage ?? null

    // Determine evidence strategy based on company's data source
    const isDiscoverySource = company.leadSource === 'here_discovery' || company.leadSource === 'osm_discovery'
    let signals: SignalFlags
    let evidence: SignalEvidenceMap
    let websiteVerifStatus = company.websiteVerificationStatus ?? 'NOT_PROVIDED'

    if (company.website) {
      // Re-analyze website for fresh evidence
      const research = await analyzeUrl(company.website)

      // Website identity check — did we fetch the right business?
      const verif = verifyIdentity(company.name, research)
      websiteVerifStatus = verif.status

      // If the page is parked or the site belongs to a different business,
      // treat it as having no reliable website data.
      if (verif.status === 'MISMATCH' || verif.status === 'UNKNOWN' || !research.success) {
        evidence = evidenceNoWebsite()
        signals = applyEvidence(
          {
            signalHasWebsite: false,
            signalHasWhatsapp: false,
            signalHasContactForm: false,
            signalHasBookingSystem: false,
            signalHasInstagram: false,
            signalHasLinkedin: false,
            signalHasGoogleBusiness: false,
            signalHasReviews: false,
            signalHasUnansweredReviews: false,
            signalHasClearCta: false,
            signalHasLeadCapture: false,
            signalSlowResponse: false,
            signalWeakFollowup: false,
            signalManualWork: false,
            signalWeakOnlinePresence: true,
          },
          evidence,
        )
      } else {
        evidence = evidenceFromWebAnalysis(research)

        // Build signals from web analysis; unknown → neutral values from applyEvidence
        const rawSignals: SignalFlags = {
          signalHasWebsite:           research.success,
          signalHasWhatsapp:          research.signals['signalHasWhatsapp']?.value === true,
          signalHasContactForm:       research.signals['signalHasContactForm']?.value === true,
          signalHasBookingSystem:     research.signals['signalHasBookingSystem']?.value === true,
          signalHasInstagram:         research.signals['signalHasInstagram']?.value === true,
          signalHasLinkedin:          research.signals['signalHasLinkedin']?.value === true,
          signalHasGoogleBusiness:    research.signals['signalHasGoogleBusiness']?.value === true,
          signalHasReviews:           research.signals['signalHasReviews']?.value === true,
          signalHasUnansweredReviews: research.signals['signalHasUnansweredReviews']?.value === true,
          signalHasClearCta:          research.signals['signalHasClearCta']?.value === true,
          signalHasLeadCapture:       research.signals['signalHasLeadCapture']?.value === true,
          signalSlowResponse:         research.signals['signalSlowResponse']?.value === true,
          signalWeakFollowup:         research.signals['signalWeakFollowup']?.value === true,
          signalManualWork:           research.signals['signalManualWork']?.value === true,
          signalWeakOnlinePresence:   research.signals['signalWeakOnlinePresence']?.value === true,
        }
        signals = applyEvidence(rawSignals, evidence)
      }
    } else if (isDiscoverySource) {
      // No website from discovery — only what we confirmed from the external source
      evidence = evidenceNoWebsite()
      signals = applyEvidence(
        {
          signalHasWebsite: false,
          signalHasWhatsapp: false,
          signalHasContactForm: false,
          signalHasBookingSystem: false,
          signalHasInstagram: false,
          signalHasLinkedin: false,
          signalHasGoogleBusiness: false,
          signalHasReviews: false,
          signalHasUnansweredReviews: false,
          signalHasClearCta: false,
          signalHasLeadCapture: false,
          signalSlowResponse: false,
          signalWeakFollowup: false,
          signalManualWork: false,
          signalWeakOnlinePresence: true,
        },
        evidence,
      )
    } else if (latestEv) {
      // Manual company — use stored signals as authoritative (user set them explicitly)
      const storedSignals: SignalFlags = {
        signalHasWebsite:           latestEv.signalHasWebsite,
        signalHasWhatsapp:          latestEv.signalHasWhatsapp,
        signalHasContactForm:       latestEv.signalHasContactForm,
        signalHasBookingSystem:     latestEv.signalHasBookingSystem,
        signalHasInstagram:         latestEv.signalHasInstagram,
        signalHasLinkedin:          latestEv.signalHasLinkedin,
        signalHasGoogleBusiness:    latestEv.signalHasGoogleBusiness,
        signalHasReviews:           latestEv.signalHasReviews,
        signalHasUnansweredReviews: latestEv.signalHasUnansweredReviews,
        signalHasClearCta:          latestEv.signalHasClearCta,
        signalHasLeadCapture:       latestEv.signalHasLeadCapture,
        signalSlowResponse:         latestEv.signalSlowResponse,
        signalWeakFollowup:         latestEv.signalWeakFollowup,
        signalManualWork:           latestEv.signalManualWork,
        signalWeakOnlinePresence:   latestEv.signalWeakOnlinePresence,
      }
      evidence = evidenceAllManual(storedSignals)
      signals = storedSignals
    } else {
      return ok({ message: 'No existing evaluation to reprocess' })
    }

    const coverage  = computeCoverage(evidence)
    const scores    = computeScoresWithEvidence(signals, evidence)
    const diagnosis = generateDiagnosis(signals, company.industry, scores.opportunityScore, coverage, evidence)
    const services  = matchServices(signals, coverage)
    const pkgRec    = recommendPackage(signals, coverage, evidence)
    const revenue   = estimateRevenueOpportunity(signals, company.industry, services.estimatedProjectPriceMin, coverage)

    // Phase 3.9 — Re-run commercial qualification
    const hasPhone = !!company.whatsapp
    const bsResult = estimateBusinessSizeFromDiscovery(
      company.name, company.website, company.industry, 0, 0,
    )
    const pfsResult = computeProspectFitScore({
      name: company.name, industry: company.industry,
      website: company.website, phone: hasPhone ? company.whatsapp : null,
      address: company.city ?? '', businessSize: bsResult,
    })
    const entityClass   = classifyEntity(company.name, company.industry, company.city ?? undefined, company.website)
    const roiFit        = computeRoiFit({
      industry: company.industry, name: company.name,
      businessSize: bsResult.size, hasWebsite: !!company.website,
      isCommerciallyViable: entityClass.isCommerciallyViable,
    })
    const budgetCap     = computeBudgetCapacity({
      industry: company.industry, name: company.name,
      businessSize: bsResult.size, hasWebsite: !!company.website, hasPhone,
    })
    const gate          = evaluateCommercialGate({
      entityType: entityClass.entityType, isCommerciallyViable: entityClass.isCommerciallyViable,
      hasContact: !!(company.website || hasPhone),
      hasOpportunity: pfsResult.opportunityVisibleRaw >= 30,
      roiFitLabel: roiFit.label, budgetCapacityLabel: budgetCap.label,
    })
    const industryProfile = getIndustryProfile(company.industry, company.name)
    const sqsResult     = computeSalesQualificationScore({
      pfsScore: pfsResult.score, opportunityRaw: pfsResult.opportunityVisibleRaw,
      contactabilityRaw: pfsResult.contactabilityRaw, evidenceQualityRaw: pfsResult.evidenceQualityRaw,
      roiFit, budgetCapacity: budgetCap, commercialGate: gate,
      entityClass, industryProfile, hasWebsite: !!company.website, hasPhone,
      opportunityReasons: pfsResult.opportunityReasons, prospectRisks: pfsResult.prospectRisks,
    })

    // Coverage regression hold: if new coverage < 40% and previous was >= 40%,
    // save new eval as hold record — do NOT promote it as the primary evaluation.
    const isLowCoverageHold = coverage < 40 && (prevCoverage !== null && prevCoverage >= 40)

    // Commercial state (always recomputed regardless of hold)
    const commercialState = computeCommercialState({
      entityIsCommercial:        entityClass.isCommerciallyViable,
      sellabilityClass:          sqsResult.sellabilityClass,
      icpFitScore:               pfsResult.score,              // PFS 0-100 as ICP proxy
      contactabilityScore:       pfsResult.contactabilityRaw, // raw 0-100
      painScore:                 pfsResult.opportunityVisibleRaw,
      coveragePercent:           coverage,
      websiteVerificationStatus: websiteVerifStatus,
    })

    const newEv = await prisma.$transaction(async (tx) => {
      const ev = await tx.evaluation.create({
        data: {
          companyId:   id,
          evaluatedBy: 'reprocess_engine',
          ...signals,
          scoreLeadGeneration:        scores.scoreLeadGeneration,
          scoreFollowUp:              scores.scoreFollowUp,
          scoreConversionProcess:     scores.scoreConversionProcess,
          scoreAutomationOpportunity: scores.scoreAutomationOpportunity,
          scoreOnlinePresence:        scores.scoreOnlinePresence,
          scoreReputation:            scores.scoreReputation,
          opportunityScore:           scores.opportunityScore,
          priorityLevel:              scores.priorityLevel,
          detectedProblems:           diagnosis.detectedProblems,
          probablePainPoint:          diagnosis.probablePainPoint,
          recommendedSolution:        diagnosis.recommendedSolution,
          estimatedValueMin:          diagnosis.estimatedValueMin,
          estimatedValueMax:          diagnosis.estimatedValueMax,
          estimatedLeadsLostPerMonth:   revenue.estimatedLeadsLostPerMonth,
          estimatedRevenueLostPerMonth: revenue.estimatedRevenueLostPerMonth,
          estimatedRoiPotential:        revenue.estimatedRoiPotential,
          recommendedServices:        services.recommendedServices,
          primaryService:             services.primaryService,
          complementaryServices:      services.complementaryServices,
          futureServices:             services.futureServices,
          implementationDifficulty:   services.implementationDifficulty,
          implementationTimeEstimate: services.implementationTimeEstimate,
          estimatedProjectPriceMin:   services.estimatedProjectPriceMin,
          estimatedProjectPriceMax:   services.estimatedProjectPriceMax,
          priceLabel:                 services.priceLabel,
          signalEvidence:             evidence as object,
          researchCoverage:           coverage,
          scoreConfidence:            scores.scoreConfidence,
          evaluationStatus:           scores.evaluationStatus,
          isLowCoverageHold,
          evaluationSource:           'reprocess_engine',
          // Package recommendation
          recommendedPackageSlug: pkgRec.recommendedPackageSlug,
          recommendedPackageName: pkgRec.recommendedPackageName,
          alternativePackageSlug: pkgRec.alternativePackageSlug,
          alternativePackageName: pkgRec.alternativePackageName,
          packageReason:          pkgRec.packageReason,
          packageEvidence:        pkgRec.packageEvidence,
          packageConfidence:      pkgRec.packageConfidence,
          packageCoverage:        pkgRec.packageCoverage,
          packagePriceMin:        pkgRec.packagePriceMin,
          packagePriceMax:        pkgRec.packagePriceMax,
          packageTimelineMin:     pkgRec.packageTimelineMin,
          packageTimelineMax:     pkgRec.packageTimelineMax,
          officialSourceUrl:      pkgRec.officialSourceUrl,
          catalogVersion:         pkgRec.catalogVersion,
        },
      })

      // Coverage hold: if new coverage is worse than previous, only update
      // website verification and commercial state. Do NOT promote the new eval.
      const alwaysUpdate = {
        websiteVerificationStatus: websiteVerifStatus,
        websiteVerifiedAt:         new Date(),
        commercialState,
      }

      if (isLowCoverageHold) {
        await tx.company.update({ where: { id }, data: alwaysUpdate })
      } else {
        await tx.company.update({
          where: { id },
          data: {
            latestOpportunityScore: scores.opportunityScore,
            latestPriorityLevel:    scores.priorityLevel,
            latestEvaluatedAt:      ev.evaluatedAt,
            latestPackageSlug:      pkgRec.recommendedPackageSlug,
            latestPrimaryService:   services.primaryService,
            latestScoreConfidence:  scores.scoreConfidence,
            // Phase 3.9 — Update qualification fields
            entityType:              entityClass.entityType,
            entityIsCommercial:      entityClass.isCommerciallyViable,
            entityExclusionReason:   entityClass.exclusionReason,
            commercialQualification: gate.qualification,
            salesQualificationScore: sqsResult.score,
            sellabilityClass:        sqsResult.sellabilityClass,
            roiFitScore:             roiFit.score,
            roiFitLabel:             roiFit.label,
            roiMultiple:             roiFit.roiMultiple,
            paybackMonths:           roiFit.paybackMonths,
            budgetCapacityScore:     budgetCap.score,
            budgetCapacityLabel:     budgetCap.label,
            economicModelType:       sqsResult.economicModelType,
            primaryProblem:          sqsResult.primaryProblem,
            whyContact:              sqsResult.whyContact,
            whyNotContact:           sqsResult.whyNotContact,
            qualificationQuestions:  sqsResult.qualificationQuestions,
            // Phase 4 — Composite scoring
            ...buildCompositeUpdatePayload(
              {
                ...company,
                sellabilityClass:        sqsResult.sellabilityClass,
                budgetCapacityScore:     budgetCap.score,
                budgetCapacityLabel:     budgetCap.label,
                roiFitLabel:             roiFit.label,
                roiFitScore:             roiFit.score,
                salesQualificationScore: sqsResult.score,
                contactabilityScore:     pfsResult.contactabilityScore,
                estimatedBusinessSize:   bsResult.size,
                whyContact:              sqsResult.whyContact,
                whyNotContact:           sqsResult.whyNotContact,
                entityExclusionReason:   entityClass.exclusionReason,
                qualificationQuestions:  sqsResult.qualificationQuestions,
                entityIsCommercial:      entityClass.isCommerciallyViable,
                entityType:              entityClass.entityType,
              },
              scores ? {
                opportunityScore:           scores.opportunityScore,
                scoreLeadGeneration:        scores.scoreLeadGeneration,
                scoreFollowUp:              scores.scoreFollowUp,
                scoreConversionProcess:     scores.scoreConversionProcess,
                scoreAutomationOpportunity: scores.scoreAutomationOpportunity,
                scoreOnlinePresence:        scores.scoreOnlinePresence,
                scoreReputation:            scores.scoreReputation,
                researchCoverage:           coverage,
                scoreConfidence:            scores.scoreConfidence ?? null,
                signalHasWebsite:           signals.signalHasWebsite,
                signalHasWhatsapp:          signals.signalHasWhatsapp,
                signalHasContactForm:       signals.signalHasContactForm,
                signalHasBookingSystem:     signals.signalHasBookingSystem,
                signalHasGoogleBusiness:    signals.signalHasGoogleBusiness,
                signalHasReviews:           signals.signalHasReviews,
                signalHasUnansweredReviews: signals.signalHasUnansweredReviews,
                signalHasClearCta:          signals.signalHasClearCta,
                signalHasLeadCapture:       signals.signalHasLeadCapture,
                signalSlowResponse:         signals.signalSlowResponse,
                signalWeakFollowup:         signals.signalWeakFollowup,
                signalManualWork:           signals.signalManualWork,
                signalWeakOnlinePresence:   signals.signalWeakOnlinePresence,
                detectedProblems:           diagnosis.detectedProblems,
                probablePainPoint:          diagnosis.probablePainPoint,
                recommendedPackageSlug:     pkgRec.recommendedPackageSlug,
                primaryService:             services.primaryService,
              } : undefined,
            ),
            // Phase 3.8 — Also refresh PFS
            prospectFitScore:        pfsResult.score,
            prospectProfile:         pfsResult.profile,
            contactabilityScore:     pfsResult.contactabilityScore,
            opportunityReasons:      pfsResult.opportunityReasons,
            prospectRisks:           pfsResult.prospectRisks,
            estimatedBusinessSize:   bsResult.size,
            businessSizeConfidence:  bsResult.confidence,
            chainDetected:           bsResult.chainDetected,
            ...alwaysUpdate,
          },
        })
      }

      return ev
    })

    return ok({
      companyId: id,
      companyName: company.name,
      before: { opportunityScore: prevScore, priorityLevel: prevPriority, researchCoverage: prevCoverage },
      after: {
        opportunityScore: newEv.opportunityScore,
        priorityLevel: newEv.priorityLevel,
        researchCoverage: coverage,
        scoreConfidence: scores.scoreConfidence,
        evaluationStatus: scores.evaluationStatus,
        primaryService: services.primaryService,
        priceRange: `$${services.estimatedProjectPriceMin}–$${services.estimatedProjectPriceMax} ${services.priceLabel}`,
      },
      evaluationId: newEv.id,
      isLowCoverageHold,
      websiteVerificationStatus: websiteVerifStatus,
      commercialState,
      warning: isLowCoverageHold
        ? `Cobertura de evidencia regresó de ${prevCoverage}% a ${coverage}%. Evaluación guardada como historial (hold). El estado primario de la empresa no fue modificado.`
        : null,
    })
  } catch (err) {
    return serverError(err)
  }
}
