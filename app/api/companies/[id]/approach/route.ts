// GET /api/companies/[id]/approach
// "Cómo acercarnos" — phase-1 free diagnosis: one concrete visible pain,
// one possible entry fix for internal planning, one ready-to-send message,
// one recommended channel. No package pitch in the first contact.

import { prisma } from '@/lib/db'
import { ok, notFound, serverError } from '@/lib/api-helpers'
import { computeVisibleSymptoms } from '@/lib/signal-engine/visible-symptoms'
import type { SignalEvidenceMap } from '@/lib/signal-engine/types'
import { recommendEntryPackage, recommendChannel } from '@/lib/recommendations/entry-package'
import { buildApproachMessage } from '@/lib/outreach/approach-message'

type Ctx = { params: Promise<{ id: string }> }

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Correo electrónico',
  linkedin: 'LinkedIn',
  instagram: 'Instagram (DM)',
}

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const company = await prisma.company.findUnique({
      where: { id },
      include: { evaluations: { orderBy: { evaluatedAt: 'desc' }, take: 1 } },
    })
    if (!company) return notFound('Company')

    const evaluation = company.evaluations[0] ?? null
    if (!evaluation || !evaluation.signalEvidence) {
      return ok({
        available: false,
        reason: 'Esta empresa aún no tiene una evaluación con evidencia suficiente. Reprocésala primero.',
      })
    }

    const { symptoms } = computeVisibleSymptoms({
      evidence: evaluation.signalEvidence as unknown as SignalEvidenceMap,
      websiteVerificationStatus: company.websiteVerificationStatus ?? null,
    })

    const pkg = recommendEntryPackage(company.name, symptoms)
    if (!pkg) {
      return ok({
        available: false,
        reason: 'No se detectó un dolor visible lo bastante claro todavía para sugerir un paquete de entrada.',
      })
    }

    const channel = recommendChannel(company)
    const message = buildApproachMessage(company.name, pkg)

    return ok({
      available: true,
      score: company.salesOpportunityScore,
      deficiencias: symptoms.map((s) => s.label),
      painDetected: pkg.painDetected,
      package: {
        slug: pkg.slug,
        name: pkg.name,
        setupPriceUSD: pkg.setupPriceUSD,
        monthlyMaintenanceUSD: pkg.monthlyMaintenanceUSD,
        implementationTime: pkg.implementationTime,
        pitch: pkg.pitch,
      },
      channel,
      channelLabel: CHANNEL_LABEL[channel] ?? channel,
      message,
    })
  } catch (err) {
    return serverError(err)
  }
}
