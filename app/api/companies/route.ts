import { prisma } from '@/lib/db'
import {
  CompanyCreateSchema,
  CompanyListQuerySchema,
} from '@/lib/schemas'
import {
  ok,
  created,
  validationError,
  serverError,
  parseSearchParams,
} from '@/lib/api-helpers'

// ─── GET /api/companies ────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  try {
    const raw = parseSearchParams(request.url)
    const parsed = CompanyListQuerySchema.safeParse(raw)
    if (!parsed.success) return validationError(parsed.error)

    const {
      country, industry, priority, status,
      minScore, maxScore,
      package: pkg, confidence, minCoverage, evaluationStatus,
      prospectProfile, estimatedBusinessSize, chainDetected,
      minProspectFitScore, minSalesPriorityScore,
      sellabilityClass, entityType, minSalesQualScore, entityIsCommercial,
      salesPriority, evidenceTier,
      sort, limit, offset,
    } = parsed.data

    // Build filter
    const where: Record<string, unknown> = {}
    if (country)          where.country = country
    if (status)           where.status  = status
    if (industry)         where.industry = { contains: industry, mode: 'insensitive' }
    if (priority)         where.latestPriorityLevel = priority
    if (pkg)              where.latestPackageSlug = pkg
    if (confidence)       where.latestScoreConfidence = confidence
    if (prospectProfile)  where.prospectProfile = prospectProfile
    if (estimatedBusinessSize) where.estimatedBusinessSize = estimatedBusinessSize
    if (chainDetected !== undefined) where.chainDetected = chainDetected
    if (sellabilityClass) where.sellabilityClass = sellabilityClass
    if (entityType)       where.entityType = entityType
    if (entityIsCommercial !== undefined) where.entityIsCommercial = entityIsCommercial
    if (salesPriority) where.salesPriority = salesPriority
    if (evidenceTier)  where.evidenceTier  = evidenceTier

    if (minScore !== undefined || maxScore !== undefined) {
      const scoreFilter: Record<string, number> = {}
      if (minScore !== undefined) scoreFilter.gte = minScore
      if (maxScore !== undefined) scoreFilter.lte = maxScore
      where.latestOpportunityScore = scoreFilter
    }

    if (minProspectFitScore !== undefined) {
      where.prospectFitScore = { gte: minProspectFitScore }
    }

    if (minSalesPriorityScore !== undefined) {
      where.salesPriorityScore = { gte: minSalesPriorityScore }
    }

    if (minSalesQualScore !== undefined) {
      where.salesQualificationScore = { gte: minSalesQualScore }
    }

    if (minCoverage !== undefined || evaluationStatus !== undefined) {
      where.evaluations = {
        some: {
          ...(minCoverage !== undefined ? { researchCoverage: { gte: minCoverage } } : {}),
          ...(evaluationStatus !== undefined ? { evaluationStatus } : {}),
        },
      }
    }

    // Build sort
    const orderBy = (() => {
      switch (sort) {
        case 'score_asc':           return { latestOpportunityScore: 'asc'  as const }
        case 'created_asc':         return { createdAt:              'asc'  as const }
        case 'updated_desc':        return { updatedAt:              'desc' as const }
        case 'sales_priority_desc': return { salesPriorityScore:        'desc' as const }
        case 'prospect_fit_desc':   return { prospectFitScore:          'desc' as const }
        case 'sqs_desc':            return { salesQualificationScore:   'desc' as const }
        case 'sales_opp_desc':      return { salesOpportunityScore:     'desc' as const }
        case 'pain_desc':           return { painScore:                 'desc' as const }
        case 'icp_desc':            return { icpFitScore:               'desc' as const }
        default:                    return { latestOpportunityScore:    'desc' as const }
      }
    })()

    const [companies, total] = await prisma.$transaction([
      prisma.company.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id:                     true,
          name:                   true,
          industry:               true,
          country:                true,
          city:                   true,
          status:                 true,
          leadSource:             true,
          latestOpportunityScore: true,
          latestPriorityLevel:    true,
          latestEvaluatedAt:      true,
          latestPackageSlug:      true,
          latestPrimaryService:   true,
          latestScoreConfidence:  true,
          // Phase 3.8
          prospectFitScore:       true,
          salesPriorityScore:     true,
          estimatedBusinessSize:  true,
          businessSizeConfidence: true,
          chainDetected:          true,
          prospectProfile:        true,
          contactabilityScore:    true,
          opportunityReasons:     true,
          prospectRisks:          true,
          discoverySearchCountry: true,
          discoverySearchCity:    true,
          discoverySearchDistrict: true,
          discoveryMode:          true,
          discoveryRankBefore:    true,
          discoveryRankAfter:     true,
          // Phase 3.9
          entityType:              true,
          entityIsCommercial:      true,
          entityExclusionReason:   true,
          commercialQualification: true,
          salesQualificationScore: true,
          sellabilityClass:        true,
          roiFitScore:             true,
          roiFitLabel:             true,
          roiMultiple:             true,
          paybackMonths:           true,
          budgetCapacityScore:     true,
          budgetCapacityLabel:     true,
          economicModelType:       true,
          primaryProblem:          true,
          whyContact:              true,
          whyNotContact:           true,
          qualificationQuestions:  true,
          // Phase 4 — Composite scoring
          icpFitScore:             true,
          painScore:               true,
          paymentCapacityScore:    true,
          evidenceCoverageScore:   true,
          commercialIntentScore:   true,
          salesOpportunityScore:   true,
          evidenceTier:            true,
          salesPriority:           true,
          qualificationReason:     true,
          disqualificationReason:  true,
          recommendedFirstAction:  true,
          // Phase 4 — Contact + compliance
          contactName:             true,
          contactRole:             true,
          contactPhone:            true,
          contactEmail:            true,
          preferredChannel:        true,
          doNotContact:            true,
          optOut:                  true,
          dataSource:              true,
          legalRisk:               true,
          website:                 true,
          whatsapp:                true,
          instagram:               true,
          linkedin:                true,
          googleBusinessUrl:       true,
          createdAt:               true,
          updatedAt:               true,
        },
      }),
      prisma.company.count({ where }),
    ])

    return ok({ data: companies, total, limit, offset })
  } catch (err) {
    return serverError(err)
  }
}

// ─── POST /api/companies ───────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = CompanyCreateSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const company = await prisma.company.create({ data: parsed.data })
    return created(company)
  } catch (err) {
    return serverError(err)
  }
}
