import { prisma } from '@/lib/db'
import { EvaluationSchema } from '@/lib/schemas'
import { computeScores } from '@/lib/scoring'
import { generateDiagnosis } from '@/lib/diagnosis'
import { matchServices } from '@/lib/service-match'
import { estimateRevenueOpportunity } from '@/lib/value-estimator'
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

    // Run all four pure engines
    const scores    = computeScores(typedSignals)
    const diagnosis = generateDiagnosis(typedSignals, company.industry, scores.opportunityScore)
    const services  = matchServices(typedSignals)
    const revenue   = estimateRevenueOpportunity(
      typedSignals,
      company.industry,
      services.estimatedProjectPriceMin,
    )

    // Persist atomically: new evaluation row + update denormalized company fields
    const evaluation = await prisma.$transaction(async (tx) => {
      const ev = await tx.evaluation.create({
        data: {
          companyId:   id,
          evaluatedBy,
          // signals
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
          // service match
          recommendedServices:        services.recommendedServices,
          implementationDifficulty:   services.implementationDifficulty,
          implementationTimeEstimate: services.implementationTimeEstimate,
          estimatedProjectPriceMin:   services.estimatedProjectPriceMin,
          estimatedProjectPriceMax:   services.estimatedProjectPriceMax,
        },
      })

      // Update denormalized fields on the parent company
      await tx.company.update({
        where: { id },
        data: {
          latestOpportunityScore: scores.opportunityScore,
          latestPriorityLevel:    scores.priorityLevel,
          latestEvaluatedAt:      ev.evaluatedAt,
        },
      })

      return ev
    })

    return created(evaluation)
  } catch (err) {
    return serverError(err)
  }
}
