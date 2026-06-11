import { prisma } from '@/lib/db'
import { SalesNoteSchema } from '@/lib/schemas'
import {
  ok,
  created,
  notFound,
  validationError,
  serverError,
} from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

// ─── GET /api/companies/[id]/sales-note ───────────────────────────────────────

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Company')

    const note = await prisma.salesNote.findFirst({
      where:   { companyId: id },
      orderBy: { createdAt: 'desc' },
    })

    return ok(note ?? null)
  } catch (err) {
    return serverError(err)
  }
}

// ─── PATCH /api/companies/[id]/sales-note ─────────────────────────────────────
// Upsert: creates if none exists, updates the most recent if one does

export async function PATCH(request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Company')

    const body: unknown = await request.json()
    const parsed = SalesNoteSchema.partial().safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const existing = await prisma.salesNote.findFirst({
      where:   { companyId: id },
      orderBy: { createdAt: 'desc' },
      select:  { id: true },
    })

    if (existing) {
      const updated = await prisma.salesNote.update({
        where: { id: existing.id },
        data:  parsed.data,
      })
      return ok(updated)
    }

    const note = await prisma.salesNote.create({
      data: { companyId: id, ...parsed.data },
    })
    return created(note)
  } catch (err) {
    return serverError(err)
  }
}
