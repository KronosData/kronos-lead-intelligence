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
import { recommendPackage } from '@/lib/recommendations/package-mapper'
import { ok, notFound, serverError } from '@/lib/api-helpers'
import type { SignalFlags } from '@/lib/types'
import type { SignalEvidenceMap } from '@/lib/evidence'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true, industry: true, website: true, leadSource: true },
    })
    if (!company) return notFound('Company')

    // Find the latest evaluation to use as the signal baseline
    const latestEv = await prisma.evaluation.findFirst({
      where: { companyId: id },
      orderBy: { evaluatedAt: 'desc' },
    })

    const prevScore = latestEv?.opportunityScore ?? null
    const prevPriority = latestEv?.priorityLevel ?? null

    // Determine evidence strategy based on company's data source
    const isDiscoverySource = company.leadSource === 'here_discovery' || company.leadSource === 'osm_discovery'
    let signals: SignalFlags
    let evidence: SignalEvidenceMap

    if (company.website) {
      // Re-analyze website for fresh evidence
      const research = await analyzeUrl(company.website)
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

      await tx.company.update({
        where: { id },
        data: {
          latestOpportunityScore: scores.opportunityScore,
          latestPriorityLevel:    scores.priorityLevel,
          latestEvaluatedAt:      ev.evaluatedAt,
          latestPackageSlug:      pkgRec.recommendedPackageSlug,
          latestPrimaryService:   services.primaryService,
          latestScoreConfidence:  scores.scoreConfidence,
        },
      })

      return ev
    })

    return ok({
      companyId: id,
      companyName: company.name,
      before: { opportunityScore: prevScore, priorityLevel: prevPriority },
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
    })
  } catch (err) {
    return serverError(err)
  }
}
