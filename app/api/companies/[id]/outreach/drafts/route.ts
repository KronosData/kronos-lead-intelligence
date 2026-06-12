// GET  /api/companies/[id]/outreach/drafts — list drafts
// POST /api/companies/[id]/outreach/drafts — save a new draft
// PUT  /api/companies/[id]/outreach/drafts/[draftId] — update status

import { prisma } from '@/lib/db'
import { z } from 'zod'
import { ok, created, notFound, validationError, serverError } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

const DraftSchema = z.object({
  channel:      z.enum(['email', 'whatsapp', 'linkedin']),
  evidenceTier: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  subject:      z.string().max(300).optional(),
  body:         z.string().min(10),
  version:      z.number().int().min(1).default(1),
  status:       z.enum(['draft', 'queued', 'copied', 'discarded']).default('draft'),
})

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params
    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Company')

    const drafts = await prisma.outreachDraft.findMany({
      where:   { companyId: id },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ data: drafts, total: drafts.length })
  } catch (err) {
    return serverError(err)
  }
}

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params
    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Company')

    const body: unknown = await request.json()
    const parsed = DraftSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const draft = await prisma.outreachDraft.create({
      data: { companyId: id, ...parsed.data },
    })
    return created(draft)
  } catch (err) {
    return serverError(err)
  }
}

export async function PATCH(request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params
    const body = await request.json() as { draftId: string; status: string; body?: string; subject?: string }
    if (!body.draftId) return validationError({ message: 'draftId required' } as unknown as import('zod').ZodError)

    const draft = await prisma.outreachDraft.findUnique({ where: { id: body.draftId } })
    if (!draft || draft.companyId !== id) return notFound('Draft')

    const updated = await prisma.outreachDraft.update({
      where: { id: body.draftId },
      data: {
        ...(body.status  ? { status:  body.status }  : {}),
        ...(body.body    ? { body:    body.body }    : {}),
        ...(body.subject ? { subject: body.subject } : {}),
        ...(body.status === 'copied' ? { copiedAt: new Date() } : {}),
      },
    })
    return ok(updated)
  } catch (err) {
    return serverError(err)
  }
}
