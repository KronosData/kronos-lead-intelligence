import { prisma } from '@/lib/db'
import { EvaluationSchema } from '@/lib/schemas'
import { evidenceAllManual, computeCoverage } from '@/lib/evidence'
import { computeProspectSignals } from '@/lib/signal-engine'
import type { ProspectSignalInput } from '@/lib/signal-engine'
import {
  created,
  notFound,
  validationError,
  serverError,
} from '@/lib/api-helpers'
import type { SignalFlags } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

// ─── POST /api/companies/[id]/evaluate ────────────────────────────────────────
// v2: Stores manual signal evaluation (legacy paradigm) and updates company
// with v2 Prospect Signal Engine scores. All evaluations from this route are
// marked isLegacyEval=true — the preferred signal source is reprocess_engine_v2.

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true, name: true, industry: true, country: true, city: true,
        website: true, entityIsCommercial: true, entityType: true,
        entityExclusionReason: true, websiteVerificationStatus: true,
      },
    })
    if (!company) return notFound('Company')

    const body: unknown = await request.json()
    const parsed = EvaluationSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { evaluatedBy, ...signals } = parsed.data
    const typedSignals = signals as SignalFlags

    // Manual evaluations: all signals are explicitly set → 100% coverage
    const evidence = evidenceAllManual(typedSignals)
    const coverage = computeCoverage(evidence)

    // v2: run signal engine on the manual evidence
    const prospectSignals = computeProspectSignals({
      name:                     company.name,
      industry:                 company.industry,
      country:                  company.country ?? 'unknown',
      city:                     company.city ?? null,
      website:                  company.website ?? null,
      isCommercial:             company.entityIsCommercial ?? true,
      entityType:               company.entityType ?? null,
      entityExclusionReason:    company.entityExclusionReason ?? null,
      evidence:                 evidence as ProspectSignalInput['evidence'],
      evidenceCoverage:         coverage,
      websiteVerificationStatus: company.websiteVerificationStatus ?? 'NOT_PROVIDED',
      hasPhone:                 false,
      hasWhatsapp:              typedSignals.signalHasWhatsapp,
      hasEmail:                 typedSignals.signalHasContactForm,
      hasInstagram:             typedSignals.signalHasInstagram,
      hasLinkedin:              typedSignals.signalHasLinkedin,
    })

    const evaluation = await prisma.$transaction(async (tx) => {
      const ev = await tx.evaluation.create({
        data: {
          companyId:        id,
          evaluatedBy,
          evaluationSource: 'manual',
          ...typedSignals,
          // Audit Priority Score stored in opportunityScore for schema compatibility
          opportunityScore: prospectSignals.auditPriorityScore,
          // Evidence metadata
          signalEvidence:   evidence as object,
          researchCoverage: coverage,
          scoreConfidence:  'high', // manual → all signals confirmed
          evaluationStatus: 'complete',
          // v2 — manual evaluations are a legacy paradigm; flag for audit trail
          isLegacyEval:  true,
          legacyReason:  'Evaluación manual con scoring legacy (v1) — scoring v2 calculado desde evidencia',
        },
      })

      await tx.company.update({
        where: { id },
        data: {
          latestOpportunityScore: prospectSignals.auditPriorityScore,
          latestPriorityLevel:    prospectSignals.commercialState,
          latestEvaluatedAt:      ev.evaluatedAt,
          // v2 Prospect Signal Engine scores from manual signals
          icpFitScore:            prospectSignals.icpFitScore,
          painScore:              prospectSignals.visibleSymptomsScore,
          contactabilityScore:    prospectSignals.contactabilityScore,
          salesOpportunityScore:  prospectSignals.auditPriorityScore,
          commercialState:        prospectSignals.commercialState,
          qualificationReason:    prospectSignals.auditHook,
          qualificationQuestions: prospectSignals.auditQuestions.map(q => q.question),
          whyContact:             prospectSignals.confirmedSymptoms.map(s => s.label),
          whyNotContact:          prospectSignals.disqualificationReason
                                    ? [prospectSignals.disqualificationReason]
                                    : [],
          disqualificationReason: prospectSignals.disqualificationReason,
        },
      })

      return ev
    })

    return created(evaluation)
  } catch (err) {
    return serverError(err)
  }
}
