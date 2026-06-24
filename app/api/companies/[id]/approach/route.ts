// GET /api/companies/[id]/approach
// "Cómo acercarnos" — phase-1 land-and-expand pitch: one concrete visible
// pain, one affordable entry package, one ready-to-send message, one
// recommended channel. No full diagnosis, no automated packages here —
// those come later, after the client is happy with the first small win.

import { prisma } from '@/lib/db'
import { ok, notFound, serverError } from '@/lib/api-helpers'
import { computeVisibleSymptoms } from '@/lib/signal-engine/visible-symptoms'
import type { SignalEvidenceMap } from '@/lib/signal-engine/types'
import { recommendEntryPackage, recommendChannel } from '@/lib/recommendations/entry-package'

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
    const [low, high] = pkg.setupPriceUSD

    const message =
      `Hola, soy de Kronos Data 👋\n\n` +
      `Vimos que ${company.name} tiene una oportunidad clara: ${pkg.painDetected.toLowerCase()}. ` +
      `Esto puede estar haciéndoles perder clientes u oportunidades sin que se note de inmediato.\n\n` +
      `Podemos implementar ${pkg.name.toLowerCase()} para resolver justo eso — algo simple y rápido de poner en marcha, ` +
      `desde $${low} hasta $${high} de instalación + $${pkg.monthlyMaintenanceUSD}/mes de mantenimiento.\n\n` +
      `¿Te interesa una llamada de 15 min para mostrarte cómo se vería para ${company.name}?\n\n` +
      `Más sobre nosotros: https://www.kronosdata.tech/`

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
