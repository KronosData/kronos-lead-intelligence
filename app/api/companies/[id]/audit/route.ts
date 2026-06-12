// GET  /api/companies/[id]/audit — list audits for a company
// POST /api/companies/[id]/audit — create new audit
// PUT  /api/companies/[id]/audit — update audit (upsert latest)

import { prisma } from '@/lib/db'
import { z } from 'zod'
import { ok, created, notFound, validationError, serverError } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

const ChecklistItemSchema = z.object({
  id:     z.string(),
  item:   z.string(),
  status: z.enum(['pending', 'confirmed', 'not_applicable', 'flagged']),
  notes:  z.string().optional(),
})

const AuditCreateSchema = z.object({
  createdBy: z.string().optional(),
  sector:    z.string().optional(),
})

const AuditUpdateSchema = z.object({
  auditId:               z.string(),
  status:                z.enum(['draft', 'in_progress', 'completed', 'converted_to_proposal']).optional(),
  checklist:             z.array(ChecklistItemSchema).optional(),
  findings:              z.string().optional(),
  confirmedProblems:     z.array(z.string()).optional(),
  hypothesis:            z.string().optional(),
  validatedDiagnosis:    z.string().optional(),
  qualificationQuestions: z.array(z.string()).optional(),
  recommendedPackageSlug: z.string().optional(),
  recommendedServiceSlug: z.string().optional(),
  packageReason:         z.string().optional(),
  meetingSummary:        z.string().optional(),
  meetingDate:           z.string().datetime().optional(),
  convertedToProposal:   z.boolean().optional(),
})

// Default checklist items by sector
function generateChecklist(sector: string | undefined | null): { id: string; item: string; status: 'pending'; notes: string }[] {
  const base = [
    { id: 'web', item: 'Sitio web activo y funcional', status: 'pending' as const, notes: '' },
    { id: 'cta', item: 'CTA claro y visible', status: 'pending' as const, notes: '' },
    { id: 'contact_form', item: 'Formulario de contacto o lead capture', status: 'pending' as const, notes: '' },
    { id: 'whatsapp', item: 'WhatsApp visible y accesible', status: 'pending' as const, notes: '' },
    { id: 'google_biz', item: 'Google Business Profile activo', status: 'pending' as const, notes: '' },
    { id: 'reviews', item: 'Reseñas en Google (cantidad y respuestas)', status: 'pending' as const, notes: '' },
    { id: 'response_speed', item: 'Velocidad de respuesta a prospectos', status: 'pending' as const, notes: '' },
    { id: 'followup', item: 'Sistema de seguimiento post-consulta', status: 'pending' as const, notes: '' },
    { id: 'social', item: 'Redes sociales activas y alineadas', status: 'pending' as const, notes: '' },
  ]

  const s = (sector ?? '').toLowerCase()

  if (s.includes('dental') || s.includes('odontolog')) {
    base.push(
      { id: 'booking', item: 'Sistema de citas / reservas online', status: 'pending' as const, notes: '' },
      { id: 'recall', item: 'Proceso de recitación de pacientes', status: 'pending' as const, notes: '' },
      { id: 'reminders', item: 'Recordatorios automáticos de citas', status: 'pending' as const, notes: '' },
    )
  } else if (s.includes('inmobiliaria') || s.includes('real estate')) {
    base.push(
      { id: 'listings', item: 'Portales de propiedades actualizados', status: 'pending' as const, notes: '' },
      { id: 'lead_funnel', item: 'Funnel de captación de compradores', status: 'pending' as const, notes: '' },
      { id: 'crm_use', item: 'CRM o sistema de gestión de prospectos', status: 'pending' as const, notes: '' },
    )
  } else if (s.includes('legal') || s.includes('abogad') || s.includes('juridic')) {
    base.push(
      { id: 'intake', item: 'Proceso de calificación de consultas', status: 'pending' as const, notes: '' },
      { id: 'proposal', item: 'Propuesta de honorarios clara y digital', status: 'pending' as const, notes: '' },
    )
  } else if (s.includes('construc')) {
    base.push(
      { id: 'portfolio', item: 'Portfolio de proyectos visible', status: 'pending' as const, notes: '' },
      { id: 'quote_process', item: 'Proceso de cotización digital', status: 'pending' as const, notes: '' },
      { id: 'project_tracking', item: 'Seguimiento de proyectos y clientes', status: 'pending' as const, notes: '' },
    )
  } else if (s.includes('logistic') || s.includes('transport')) {
    base.push(
      { id: 'tracking', item: 'Trazabilidad de envíos', status: 'pending' as const, notes: '' },
      { id: 'reporting', item: 'Reportes de operaciones y KPIs', status: 'pending' as const, notes: '' },
    )
  } else {
    base.push(
      { id: 'process_manual', item: 'Procesos manuales identificados', status: 'pending' as const, notes: '' },
      { id: 'data_visibility', item: 'Visibilidad de datos operativos', status: 'pending' as const, notes: '' },
    )
  }

  return base
}

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params
    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Company')

    const audits = await prisma.audit.findMany({
      where:   { companyId: id },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ data: audits, total: audits.length })
  } catch (err) {
    return serverError(err)
  }
}

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const company = await prisma.company.findUnique({
      where:  { id },
      select: { id: true, industry: true, qualificationQuestions: true },
    })
    if (!company) return notFound('Company')

    const body: unknown = await request.json()
    const parsed = AuditCreateSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const sector    = parsed.data.sector ?? company.industry
    const checklist = generateChecklist(sector)

    const audit = await prisma.audit.create({
      data: {
        companyId:              id,
        createdBy:              parsed.data.createdBy,
        sector,
        checklist:              checklist as object,
        status:                 'in_progress',
        qualificationQuestions: company.qualificationQuestions,
      },
    })
    return created(audit)
  } catch (err) {
    return serverError(err)
  }
}

export async function PUT(request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params
    const body: unknown = await request.json()
    const parsed = AuditUpdateSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { auditId, ...updateData } = parsed.data
    const audit = await prisma.audit.findUnique({ where: { id: auditId } })
    if (!audit || audit.companyId !== id) return notFound('Audit')

    const updated = await prisma.audit.update({
      where: { id: auditId },
      data: {
        ...updateData,
        checklist:   updateData.checklist ? (updateData.checklist as object) : undefined,
        meetingDate: updateData.meetingDate ? new Date(updateData.meetingDate) : undefined,
        convertedAt: updateData.convertedToProposal ? new Date() : undefined,
      },
    })
    return ok(updated)
  } catch (err) {
    return serverError(err)
  }
}
