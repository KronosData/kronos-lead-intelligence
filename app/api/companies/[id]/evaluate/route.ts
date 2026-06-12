import { prisma } from '@/lib/db'
import { EvaluationSchema } from '@/lib/schemas'
import { computeScoresWithEvidence } from '@/lib/scoring'
import { generateDiagnosis } from '@/lib/diagnosis'
import { matchServices } from '@/lib/service-match'
import { estimateRevenueOpportunity } from '@/lib/value-estimator'
import { evidenceAllManual } from '@/lib/evidence'
import { recommendPackage } from '@/lib/recommendations/package-mapper'
import {
  created,
  notFound,
  validationError,
  serverError,
} from '@/lib/api-helpers'
import type { SignalFlags } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

// ─── POST /api/companies/[id]/evaluate ────────────────────────────────────────

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, industry: true },
    })
    if (!company) return notFound('Company')

    const body: unknown = await request.json()
    const parsed = EvaluationSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { evaluatedBy, ...signals } = parsed.data
    const typedSignals = signals as SignalFlags

    // Manual evaluations: all signals are explicitly set by the user → 100% coverage
    const evidence = evidenceAllManual(typedSignals)

    const scores    = computeScoresWithEvidence(typedSignals, evidence)
    const coverage  = scores.researchCoverage ?? 100
    const diagnosis = generateDiagnosis(typedSignals, company.industry, scores.opportunityScore, coverage, evidence)
    const services  = matchServices(typedSignals, coverage)
    const pkgRec    = recommendPackage(typedSignals, coverage, evidence)
    const revenue   = estimateRevenueOpportunity(
      typedSignals,
      company.industry,
      services.estimatedProjectPriceMin,
      coverage,
    )

    const evaluation = await prisma.$transaction(async (tx) => {
      const ev = await tx.evaluation.create({
        data: {
          companyId:   id,
          evaluatedBy,
          ...typedSignals,
          // scores
          scoreLeadGeneration:        scores.scoreLeadGeneration,
          scoreFollowUp:              scores.scoreFollowUp,
          scoreConversionProcess:     scores.scoreConversionProcess,
          scoreAutomationOpportunity: scores.scoreAutomationOpportunity,
          scoreOnlinePresence:        scores.scoreOnlinePresence,
          scoreReputation:            scores.scoreReputation,
          opportunityScore:           scores.opportunityScore,
          // diagnosis
          priorityLevel:          scores.priorityLevel,
          detectedProblems:       diagnosis.detectedProblems,
          probablePainPoint:      diagnosis.probablePainPoint,
          recommendedSolution:    diagnosis.recommendedSolution,
          estimatedValueMin:      diagnosis.estimatedValueMin,
          estimatedValueMax:      diagnosis.estimatedValueMax,
          // revenue module
          estimatedLeadsLostPerMonth:   revenue.estimatedLeadsLostPerMonth,
          estimatedRevenueLostPerMonth: revenue.estimatedRevenueLostPerMonth,
          estimatedRoiPotential:        revenue.estimatedRoiPotential,
          // service match (tiered)
          recommendedServices:        services.recommendedServices,
          primaryService:             services.primaryService,
          complementaryServices:      services.complementaryServices,
          futureServices:             services.futureServices,
          implementationDifficulty:   services.implementationDifficulty,
          implementationTimeEstimate: services.implementationTimeEstimate,
          estimatedProjectPriceMin:   services.estimatedProjectPriceMin,
          estimatedProjectPriceMax:   services.estimatedProjectPriceMax,
          priceLabel:                 services.priceLabel,
          // evidence metadata
          signalEvidence:   evidence as object,
          researchCoverage: coverage,
          scoreConfidence:  scores.scoreConfidence,
          evaluationStatus: scores.evaluationStatus,
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

    return created(evaluation)
  } catch (err) {
    return serverError(err)
  }
}
