// GET /api/dashboard
// Revenue Operations metrics for the dashboard.
// All aggregations are computed from real DB data — no invented percentages.

import { prisma } from '@/lib/db'
import { ok, serverError } from '@/lib/api-helpers'

export async function GET(): Promise<Response> {
  try {
    // ── Company counts by state ────────────────────────────────────────────────
    const [total, evaluated, withSqs] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { latestEvaluatedAt: { not: null } } }),
      prisma.company.count({ where: { salesQualificationScore: { not: null } } }),
    ])

    // Actionable = commercial entity + sell_now or contact_diagnosis
    const actionable = await prisma.company.count({
      where: {
        entityIsCommercial: true,
        sellabilityClass: { in: ['sell_now', 'contact_diagnosis'] },
      },
    })

    const hotCount  = await prisma.company.count({ where: { salesPriority: 'HOT' } })
    const highCount = await prisma.company.count({ where: { salesPriority: 'HIGH' } })

    // ── Coverage average ───────────────────────────────────────────────────────
    const coverageAgg = await prisma.company.aggregate({
      _avg: { evidenceCoverageScore: true },
      where: { evidenceCoverageScore: { not: null } },
    })
    const avgCoverage = Math.round(coverageAgg._avg.evidenceCoverageScore ?? 0)

    // ── Sales notes pipeline ───────────────────────────────────────────────────
    const stageGroups = await prisma.salesNote.groupBy({
      by: ['pipelineStage'],
      _count: { _all: true },
    })

    const pipeline: Record<string, number> = {}
    for (const g of stageGroups) {
      pipeline[g.pipelineStage] = g._count._all
    }

    const contacted       = (pipeline['contacted'] ?? 0) + (pipeline['responded'] ?? 0) + (pipeline['audit_scheduled'] ?? 0) + (pipeline['audit_completed'] ?? 0) + (pipeline['proposal_sent'] ?? 0) + (pipeline['negotiating'] ?? 0)
    const responded       = pipeline['responded'] ?? 0
    const auditScheduled  = pipeline['audit_scheduled'] ?? 0
    const auditCompleted  = pipeline['audit_completed'] ?? 0
    const proposalsSent   = pipeline['proposal_sent'] ?? 0
    const negotiating     = pipeline['negotiating'] ?? 0
    const won             = pipeline['won'] ?? 0
    const lost            = pipeline['lost'] ?? 0

    // ── Potential pipeline value ───────────────────────────────────────────────
    const valueAgg = await prisma.salesNote.aggregate({
      _sum: { potentialValue: true },
      where: {
        pipelineStage: { in: ['approved_for_contact', 'contacted', 'responded', 'audit_scheduled', 'audit_completed', 'proposal_sent', 'negotiating'] },
        potentialValue: { not: null },
      },
    })
    const pipelineValue = valueAgg._sum.potentialValue ?? 0

    // ── Outreach stats ─────────────────────────────────────────────────────────
    const outreachByChannel = await prisma.outreachHistory.groupBy({
      by: ['channel'],
      _count: { _all: true },
    })

    const responseRate = await prisma.outreachHistory.aggregate({
      _count: { _all: true },
      where: { responseReceived: true },
    })
    const totalOutreach = await prisma.outreachHistory.count()
    const responseRatePct = totalOutreach > 0 ? Math.round((responseRate._count._all / totalOutreach) * 100) : null

    // ── Funnel by stage ────────────────────────────────────────────────────────
    const funnel = [
      { stage: 'discovered',          label: 'Descubiertas',         count: total },
      { stage: 'evaluated',           label: 'Evaluadas',            count: evaluated },
      { stage: 'actionable',          label: 'Accionables',          count: actionable },
      { stage: 'hot_high',            label: 'HOT + HIGH',           count: hotCount + highCount },
      { stage: 'contacted',           label: 'Contactadas',          count: contacted },
      { stage: 'responded',           label: 'Respondieron',         count: responded },
      { stage: 'audit_scheduled',     label: 'Auditoría agendada',   count: auditScheduled },
      { stage: 'proposal_sent',       label: 'Propuesta enviada',    count: proposalsSent },
      { stage: 'won',                 label: 'Ganadas',              count: won },
    ]

    // ── Breakdown by country ───────────────────────────────────────────────────
    const byCountry = await prisma.company.groupBy({
      by: ['country'],
      _count: { _all: true },
      orderBy: { _count: { country: 'desc' } },
      take: 8,
    })

    // ── Breakdown by industry ──────────────────────────────────────────────────
    const byIndustry = await prisma.company.groupBy({
      by: ['industry'],
      _count: { _all: true },
      orderBy: { _count: { industry: 'desc' } },
      take: 8,
    })

    // ── Priority tasks: overdue next actions ───────────────────────────────────
    const overdueTasks = await prisma.salesNote.findMany({
      where: {
        nextActionDate: { lt: new Date() },
        pipelineStage:  { notIn: ['won', 'lost', 'discarded', 'nurturing'] },
      },
      select: {
        id: true, companyId: true, nextAction: true, nextActionDate: true, pipelineStage: true,
        company: { select: { name: true, industry: true } },
      },
      orderBy: { nextActionDate: 'asc' },
      take: 10,
    })

    const upcomingTasks = await prisma.salesNote.findMany({
      where: {
        nextActionDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400 * 1000) },
        pipelineStage:  { notIn: ['won', 'lost', 'discarded'] },
      },
      select: {
        id: true, companyId: true, nextAction: true, nextActionDate: true, pipelineStage: true,
        company: { select: { name: true, industry: true } },
      },
      orderBy: { nextActionDate: 'asc' },
      take: 10,
    })

    // ── SQS distribution ──────────────────────────────────────────────────────
    const sqsGroups = await Promise.all([
      prisma.company.count({ where: { salesQualificationScore: { gte: 70 } } }),
      prisma.company.count({ where: { salesQualificationScore: { gte: 50, lt: 70 } } }),
      prisma.company.count({ where: { salesQualificationScore: { gte: 35, lt: 50 } } }),
      prisma.company.count({ where: { salesQualificationScore: { gte: 0, lt: 35 }, AND: [{ salesQualificationScore: { not: null } }] } }),
    ])

    return ok({
      summary: {
        total, evaluated, withSqs, actionable,
        hotCount, highCount,
        avgCoverage,
        contacted, responded, auditScheduled, auditCompleted,
        proposalsSent, negotiating, won, lost,
        pipelineValue,
        responseRatePct,
        totalOutreach,
      },
      funnel,
      pipeline,
      sqsDistribution: {
        sell_now:         sqsGroups[0],
        contact_diagnosis: sqsGroups[1],
        investigate:      sqsGroups[2],
        nurture_discard:  sqsGroups[3],
      },
      byCountry:  byCountry.map(g => ({ country: g.country,  count: g._count._all })),
      byIndustry: byIndustry.map(g => ({ industry: g.industry, count: g._count._all })),
      outreachByChannel: outreachByChannel.map(g => ({ channel: g.channel, count: g._count._all })),
      overdueTasks:   overdueTasks.map(t => ({ ...t, isOverdue: true })),
      upcomingTasks:  upcomingTasks.map(t => ({ ...t, isOverdue: false })),
    })
  } catch (err) {
    return serverError(err)
  }
}
