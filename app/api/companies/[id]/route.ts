import { prisma } from '@/lib/db'
import { CompanyUpdateSchema } from '@/lib/schemas'
import {
  ok,
  noContent,
  notFound,
  validationError,
  serverError,
} from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

// ─── GET /api/companies/[id] ───────────────────────────────────────────────────

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        evaluations: {
          orderBy: { evaluatedAt: 'desc' },
          take: 1,
        },
        salesNotes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!company) return notFound('Company')

    const { evaluations, salesNotes, ...companyData } = company
    return ok({
      ...companyData,
      latestEvaluation: evaluations[0] ?? null,
      salesNote:        salesNotes[0]  ?? null,
    })
  } catch (err) {
    return serverError(err)
  }
}

// ─── PUT /api/companies/[id] ───────────────────────────────────────────────────

export async function PUT(request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Company')

    const body: unknown = await request.json()
    const parsed = CompanyUpdateSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const updated = await prisma.company.update({
      where: { id },
      data:  parsed.data,
    })

    return ok(updated)
  } catch (err) {
    return serverError(err)
  }
}

// ─── DELETE /api/companies/[id] ────────────────────────────────────────────────

export async function DELETE(_req: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Company')

    await prisma.company.delete({ where: { id } })
    return noContent()
  } catch (err) {
    return serverError(err)
  }
}
