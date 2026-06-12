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

    const { country, industry, priority, status, minScore, maxScore, package: pkg, confidence, minCoverage, evaluationStatus, sort, limit, offset } = parsed.data

    // Build filter
    const where: Record<string, unknown> = {}
    if (country)          where.country = country
    if (status)           where.status  = status
    if (industry)         where.industry = { contains: industry, mode: 'insensitive' }
    if (priority)         where.latestPriorityLevel = priority
    if (pkg)              where.latestPackageSlug = pkg
    if (confidence)       where.latestScoreConfidence = confidence

    if (minScore !== undefined || maxScore !== undefined) {
      const scoreFilter: Record<string, number> = {}
      if (minScore !== undefined) scoreFilter.gte = minScore
      if (maxScore !== undefined) scoreFilter.lte = maxScore
      where.latestOpportunityScore = scoreFilter
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
        case 'score_asc':    return { latestOpportunityScore: 'asc'  as const }
        case 'created_asc':  return { createdAt:              'asc'  as const }
        case 'updated_desc': return { updatedAt:              'desc' as const }
        default:             return { latestOpportunityScore: 'desc' as const }
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
          createdAt:              true,
          updatedAt:              true,
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
