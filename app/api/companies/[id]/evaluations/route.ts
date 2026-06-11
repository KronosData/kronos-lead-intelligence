import { prisma } from '@/lib/db'
import { ok, notFound, serverError } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

// ─── GET /api/companies/[id]/evaluations ──────────────────────────────────────
// Returns full evaluation history newest-first (append-only audit trail)

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Company')

    const evaluations = await prisma.evaluation.findMany({
      where:   { companyId: id },
      orderBy: { evaluatedAt: 'desc' },
    })

    return ok({ data: evaluations, total: evaluations.length })
  } catch (err) {
    return serverError(err)
  }
}
