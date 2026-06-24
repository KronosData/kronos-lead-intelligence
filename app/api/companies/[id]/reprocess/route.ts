// POST /api/companies/[id]/reprocess
// v2: Re-runs the Prospect Signal Engine on an existing company using fresh web analysis.
// Append-only: the previous evaluation is preserved as historical record.
// No ROI, revenue loss, or diagnosis before audit.

import { prisma } from '@/lib/db'
import { analyzeUrl } from '@/lib/web-analyzer'
import {
  evidenceNoWebsite,
  evidenceFromWebAnalysis,
  evidenceAllManual,
  computeCoverage,
} from '@/lib/evidence'
import { verifyIdentity } from '@/lib/website-verifier'
import { ok, notFound, serverError } from '@/lib/api-helpers'
import { computeProspectSignals } from '@/lib/signal-engine'
import type { ProspectSignalInput } from '@/lib/signal-engine'
import type { SignalFlags } from '@/lib/types'
import type { SignalEvidenceMap } from '@/lib/evidence'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params

    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true, name: true, industry: true, website: true, leadSource: true,
        city: true, country: true, whatsapp: true, instagram: true, linkedin: true,
        entityIsCommercial: true, entityType: true, entityExclusionReason: true,
        websiteVerificationStatus: true,
      },
    })
    if (!company) return notFound('Company')

    const latestEv = await prisma.evaluation.findFirst({
      where: { companyId: id },
      orderBy: { evaluatedAt: 'desc' },
    })

    const prevScore    = latestEv?.opportunityScore ?? null
    const prevCoverage = latestEv?.researchCoverage ?? null

    const isDiscoverySource = company.leadSource === 'here_discovery' || company.leadSource === 'osm_discovery'
    let signals: SignalFlags
    let evidence: SignalEvidenceMap
    let websiteVerifStatus = company.websiteVerificationStatus ?? 'NOT_PROVIDED'
    let hasWhatsapp = !!company.whatsapp
    let hasInstagram = !!company.instagram
    let hasLinkedin = !!company.linkedin

    if (company.website) {
      const research = await analyzeUrl(company.website)
      const verif = verifyIdentity(company.name, research)
      websiteVerifStatus = verif.status

      if (verif.status === 'MISMATCH' || verif.status === 'UNKNOWN' || !research.success) {
        evidence = evidenceNoWebsite()
        signals = noWebsiteSignals()
      } else {
        evidence = evidenceFromWebAnalysis(research)
        signals = {
          signalHasWebsite:           research.success,
          signalHasWhatsapp:          research.signals['signalHasWhatsapp']?.value === true,
          signalHasContactForm:       research.signals['signalHasContactForm']?.value === true,
          signalHasBookingSystem:     research.signals['signalHasBookingSystem']?.value === true,
          signalHasInstagram:         research.signals['signalHasInstagram']?.value === true,
          signalHasLinkedin:          research.signals['signalHasLinkedin']?.value === true,
          signalHasGoogleBusiness:    research.signals['signalHasGoogleBusiness']?.value === true,
          signalHasReviews:           research.signals['signalHasReviews']?.value === true,
          signalHasUnansweredReviews: research.signals['signalHasUnansweredReviews']?.value === true,
          signalHasClearCta:          research.signals['signalHasClearCta']?.value === true,
          signalHasLeadCapture:       research.signals['signalHasLeadCapture']?.value === true,
          signalSlowResponse:         research.signals['signalSlowResponse']?.value === true,
          signalWeakFollowup:         research.signals['signalWeakFollowup']?.value === true,
          signalManualWork:           research.signals['signalManualWork']?.value === true,
          signalWeakOnlinePresence:   research.signals['signalWeakOnlinePresence']?.value === true,
        }
        hasWhatsapp  = signals.signalHasWhatsapp  || hasWhatsapp
        hasInstagram = signals.signalHasInstagram || hasInstagram
        hasLinkedin  = signals.signalHasLinkedin  || hasLinkedin
      }
    } else if (isDiscoverySource) {
      evidence = evidenceNoWebsite()
      signals  = noWebsiteSignals()
    } else if (latestEv) {
      // Manual company — use stored signals as authoritative baseline
      const stored: SignalFlags = {
        signalHasWebsite:           latestEv.signalHasWebsite,
        signalHasWhatsapp:          latestEv.signalHasWhatsapp,
        signalHasContactForm:       latestEv.signalHasContactForm,
        signalHasBookingSystem:     latestEv.signalHasBookingSystem,
        signalHasInstagram:         latestEv.signalHasInstagram,
        signalHasLinkedin:          latestEv.signalHasLinkedin,
        signalHasGoogleBusiness:    latestEv.signalHasGoogleBusiness,
        signalHasReviews:           latestEv.signalHasReviews,
        signalHasUnansweredReviews: latestEv.signalHasUnansweredReviews,
        signalHasClearCta:          latestEv.signalHasClearCta,
        signalHasLeadCapture:       latestEv.signalHasLeadCapture,
        signalSlowResponse:         latestEv.signalSlowResponse,
        signalWeakFollowup:         latestEv.signalWeakFollowup,
        signalManualWork:           latestEv.signalManualWork,
        signalWeakOnlinePresence:   latestEv.signalWeakOnlinePresence,
      }
      evidence = evidenceAllManual(stored)
      signals  = stored
    } else {
      return ok({ message: 'No existing evaluation to reprocess' })
    }

    const coverage = computeCoverage(evidence)

    // v2: Prospect Signal Engine
    const prospectSignals = computeProspectSignals({
      name:                     company.name,
      industry:                 company.industry,
      country:                  company.country ?? 'unknown',
      city:                     company.city ?? null,
      website:                  company.website ?? null,
      isCommercial:             company.entityIsCommercial ?? true,
      entityType:               company.entityType ?? null,
      entityExclusionReason:    company.entityExclusionReason ?? null,
      evidence:                 evidence as ProspectSignalInput['evidence'],
      evidenceCoverage:         coverage,
      websiteVerificationStatus: websiteVerifStatus,
      hasPhone:                 false, // phone not stored on company directly
      hasWhatsapp:              hasWhatsapp,
      hasEmail:                 signals.signalHasContactForm,
      hasInstagram:             hasInstagram,
      hasLinkedin:              hasLinkedin,
    })

    // Safety: if new coverage is significantly worse than previous, save as hold record
    const isLowCoverageHold = coverage < 40 && (prevCoverage !== null && prevCoverage >= 40)

    const newEv = await prisma.$transaction(async (tx) => {
      const ev = await tx.evaluation.create({
        data: {
          companyId:        id,
          evaluatedBy:      'reprocess_engine_v2',
          evaluationSource: 'reprocess_engine_v2',
          // Signal boolean flags (for transparency)
          ...signals,
          // Audit Priority Score stored in opportunityScore for schema compatibility
          opportunityScore:   prospectSignals.auditPriorityScore,
          // Evidence metadata
          signalEvidence:   evidence as object,
          researchCoverage: coverage,
          scoreConfidence:  coverage >= 60 ? 'high' : coverage >= 30 ? 'medium' : 'low',
          evaluationStatus: 'v2_signal_engine',
          isLowCoverageHold,
          // v2 — clean evaluation
          isLegacyEval: false,
        },
      })

      const alwaysUpdate = {
        websiteVerificationStatus: websiteVerifStatus,
        websiteVerifiedAt:         new Date(),
        commercialState:           prospectSignals.commercialState,
      }

      if (isLowCoverageHold) {
        await tx.company.update({ where: { id }, data: alwaysUpdate })
      } else {
        await tx.company.update({
          where: { id },
          data: {
            latestOpportunityScore: prospectSignals.auditPriorityScore,
            latestPriorityLevel:    prospectSignals.commercialState,
            latestEvaluatedAt:      ev.evaluatedAt,
            // v2 Prospect Signal Engine scores
            icpFitScore:            prospectSignals.icpFitScore,
            painScore:              prospectSignals.visibleSymptomsScore,
            contactabilityScore:    prospectSignals.contactabilityScore,
            salesOpportunityScore:  prospectSignals.auditPriorityScore,
            qualificationReason:    prospectSignals.auditHook,
            qualificationQuestions: prospectSignals.auditQuestions.map(q => q.question),
            whyContact:             prospectSignals.confirmedSymptoms.map(s => s.label),
            whyNotContact:          prospectSignals.disqualificationReason
                                      ? [prospectSignals.disqualificationReason]
                                      : [],
            disqualificationReason: prospectSignals.disqualificationReason,
            recommendedFirstAction: stateToAction(prospectSignals.commercialState),
            ...alwaysUpdate,
          },
        })
      }

      return ev
    })

    return ok({
      companyId:   id,
      companyName: company.name,
      before: { opportunityScore: prevScore, researchCoverage: prevCoverage },
      after: {
        auditPriorityScore:    prospectSignals.auditPriorityScore,
        icpFitScore:           prospectSignals.icpFitScore,
        visibleSymptomsScore:  prospectSignals.visibleSymptomsScore,
        contactabilityScore:   prospectSignals.contactabilityScore,
        commercialState:       prospectSignals.commercialState,
        researchCoverage:      coverage,
        confirmedSymptoms:     prospectSignals.confirmedSymptoms.length,
        auditHook:             prospectSignals.auditHook,
      },
      evaluationId: newEv.id,
      isLowCoverageHold,
      websiteVerificationStatus: websiteVerifStatus,
      warning: isLowCoverageHold
        ? `Cobertura de evidencia regresó de ${prevCoverage}% a ${coverage}%. Evaluación guardada como historial (hold). El estado primario de la empresa no fue modificado.`
        : null,
    })
  } catch (err) {
    return serverError(err)
  }
}

function noWebsiteSignals(): SignalFlags {
  return {
    signalHasWebsite:           false,
    signalHasWhatsapp:          true,
    signalHasContactForm:       true,
    signalHasBookingSystem:     true,
    signalHasInstagram:         true,
    signalHasLinkedin:          true,
    signalHasGoogleBusiness:    true,
    signalHasReviews:           true,
    signalHasUnansweredReviews: false,
    signalHasClearCta:          true,
    signalHasLeadCapture:       true,
    signalSlowResponse:         false,
    signalWeakFollowup:         false,
    signalManualWork:           false,
    signalWeakOnlinePresence:   true,
  }
}

function stateToAction(state: string): string {
  if (state === 'OFFER_AUDIT')       return 'Enviar gancho para auditoría gratuita de 15 min'
  if (state === 'CONTACT_READY')     return 'Iniciar primer contacto directo'
  if (state === 'RESEARCH_REQUIRED') return 'Investigar datos de contacto antes de contactar'
  return 'Prospect descalificado — no iniciar contacto'
}
