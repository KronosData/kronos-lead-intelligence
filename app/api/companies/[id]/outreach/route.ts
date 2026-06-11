import { prisma } from '@/lib/db'
import { OutreachHistorySchema } from '@/lib/schemas'
import {
  ok,
  created,
  notFound,
  validationError,
  serverError,
} from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

// ─── GET /api/companies/[id]/outreach ─────────────────────────────────────────

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Company')

    const records = await prisma.outreachHistory.findMany({
      where:   { companyId: id },
      orderBy: { sentAt: 'desc' },
    })

    return ok({ data: records, total: records.length })
  } catch (err) {
    return serverError(err)
  }
}

// ─── POST /api/companies/[id]/outreach ────────────────────────────────────────

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Company')

    const body: unknown = await request.json()
    const parsed = OutreachHistorySchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const record = await prisma.outreachHistory.create({
      data: { companyId: id, ...parsed.data },
    })

    return created(record)
  } catch (err) {
    return serverError(err)
  }
}
