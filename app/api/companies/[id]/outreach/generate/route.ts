// GET /api/companies/[id]/outreach/generate
// Generates personalized outreach messages for all 3 channels based on
// the company's current evidence tier and latest evaluation.
// Messages are NEVER sent automatically — they are drafts for human review.

import { prisma } from '@/lib/db'
import { generateOutreachMessages, assessOutreachCompliance } from '@/lib/outreach/message-generator'
import { ok, notFound, serverError } from '@/lib/api-helpers'
import type { EvidenceTier } from '@/lib/scoring/composite-scorer'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true, name: true, industry: true, city: true, country: true,
        website: true, whatsapp: true, doNotContact: true, optOut: true, legalRisk: true,
        evidenceTier: true, salesPriority: true, primaryProblem: true,
        whyContact: true, qualificationReason: true, recommendedFirstAction: true,
        latestPackageSlug: true, latestPrimaryService: true,
        evaluations: {
          orderBy: { evaluatedAt: 'desc' },
          take: 1,
          select: {
            detectedProblems: true, probablePainPoint: true, researchCoverage: true,
            signalHasWebsite: true, signalHasWhatsapp: true, signalHasBookingSystem: true,
            signalHasGoogleBusiness: true, signalHasReviews: true, signalHasUnansweredReviews: true,
            signalHasClearCta: true, signalHasLeadCapture: true, signalSlowResponse: true,
            signalManualWork: true, signalWeakFollowup: true,
            recommendedPackageSlug: true, primaryService: true,
          },
        },
      },
    })
    if (!company) return notFound('Company')

    if (company.doNotContact || company.optOut) {
      return ok({ blocked: true, reason: company.doNotContact ? 'do_not_contact' : 'opt_out', messages: [] })
    }

    const latestEv = company.evaluations[0] ?? null
    const tier = (company.evidenceTier ?? (latestEv ? (latestEv.researchCoverage ?? 0) >= 70 ? 'HIGH' : (latestEv.researchCoverage ?? 0) >= 40 ? 'MEDIUM' : 'LOW' : 'LOW')) as EvidenceTier
    const pkgSlug = latestEv?.recommendedPackageSlug ?? company.latestPackageSlug

    const messages = generateOutreachMessages({
      companyName:             company.name,
      industry:                company.industry,
      city:                    company.city,
      country:                 company.country,
      website:                 company.website,
      evidenceTier:            tier,
      salesPriority:           company.salesPriority ?? 'MEDIUM',
      primaryProblem:          company.primaryProblem,
      whyContact:              company.whyContact,
      qualificationReason:     company.qualificationReason,
      recommendedFirstAction:  company.recommendedFirstAction ?? '',
      recommendedPackageSlug:  pkgSlug,
      primaryServiceName:      latestEv?.primaryService ?? company.latestPrimaryService,
      signals: latestEv ? {
        hasWebsite:           latestEv.signalHasWebsite,
        hasCta:               latestEv.signalHasClearCta,
        hasBooking:           latestEv.signalHasBookingSystem,
        hasWhatsapp:          latestEv.signalHasWhatsapp,
        hasGoogleBusiness:    latestEv.signalHasGoogleBusiness,
        hasReviews:           latestEv.signalHasReviews,
        hasUnansweredReviews: latestEv.signalHasUnansweredReviews,
        slowResponse:         latestEv.signalSlowResponse,
        manualWork:           latestEv.signalManualWork,
        weakFollowup:         latestEv.signalWeakFollowup,
        probablePainPoint:    latestEv.probablePainPoint,
        detectedProblems:     latestEv.detectedProblems,
      } : undefined,
    })

    // Compliance assessment per channel
    const compliance = messages.map(m => ({
      ...m,
      compliance: assessOutreachCompliance(
        m.channel, tier, company.country,
        false, // opt-in — assume none unless explicitly tracked
        !!company.whatsapp, // public contact info
      ),
    }))

    return ok({
      companyId:    id,
      companyName:  company.name,
      evidenceTier: tier,
      legalRisk:    company.legalRisk,
      messages:     compliance,
    })
  } catch (err) {
    return serverError(err)
  }
}
