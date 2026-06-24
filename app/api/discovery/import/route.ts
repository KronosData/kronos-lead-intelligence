// POST /api/discovery/import
// v2: Imports a discovered company, runs the Prospect Signal Engine,
// and creates an initial SalesNote. No ROI, revenue loss, or diagnosis before audit.

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { analyzeUrl } from '@/lib/web-analyzer'
import {
  evidenceNoWebsite,
  evidenceFromWebAnalysis,
  computeCoverage,
} from '@/lib/evidence'
import { verifyIdentity } from '@/lib/website-verifier'
import { ok, badRequest } from '@/lib/api-helpers'
import { computeProspectSignals } from '@/lib/signal-engine'
import type { ProspectSignalInput } from '@/lib/signal-engine'
import type { SignalFlags } from '@/lib/types'
import type { ResearchResult } from '@/lib/web-analyzer'
import type { ImportedCompanyResult } from '@/lib/discovery/types'
import type { SignalEvidenceMap } from '@/lib/evidence'

const ImportSchema = z.object({
  externalId: z.string().min(1),
  name:       z.string().min(1).max(200),
  industry:   z.string().min(1).max(200),
  country:    z.string().min(1).max(80),
  city:       z.string().max(100).optional(),
  address:    z.string().max(300).optional(),
  website:    z.string().url().nullable().optional(),
  phone:      z.string().max(40).nullable().optional(),
  googleBusinessUrl: z.string().url().nullable().optional(),
  source:     z.enum(['here', 'osm']),

  // Phase 3.8 — Prospect Fit provenance (kept for metadata, not used for scoring)
  prospectFitScore:       z.number().int().min(0).max(100).optional(),
  estimatedBusinessSize:  z.string().optional(),
  businessSizeConfidence: z.string().optional(),
  chainDetected:          z.boolean().optional(),
  prospectProfile:        z.string().optional(),
  contactabilityScore:    z.number().int().min(0).max(100).optional(),
  opportunityReasons:     z.array(z.string()).optional(),
  prospectRisks:          z.array(z.string()).optional(),
  discoverySearchCountry: z.string().optional(),
  discoverySearchCity:    z.string().optional(),
  discoverySearchDistrict: z.string().optional(),
  discoveryMode:          z.string().optional(),
  discoveryRankBefore:    z.number().int().optional(),
  discoveryRankAfter:     z.number().int().optional(),
  // Phase 3.9 — Entity classification (kept; scoring replaced by signal engine v2)
  entityType:             z.string().optional(),
  entityIsCommercial:     z.boolean().optional(),
  entityExclusionReason:  z.string().nullable().optional(),
  // Legacy discovery scoring fields — accepted but replaced by signal engine in v2
  commercialQualification: z.string().optional(),
  salesQualificationScore: z.number().int().min(0).max(100).optional(),
  sellabilityClass:       z.string().optional(),
  roiFitScore:            z.number().int().min(0).max(100).optional(),
  roiFitLabel:            z.string().optional(),
  roiMultiple:            z.number().optional(),
  paybackMonths:          z.number().int().optional(),
  budgetCapacityScore:    z.number().int().min(0).max(100).optional(),
  budgetCapacityLabel:    z.string().optional(),
  economicModelType:      z.string().optional(),
  primaryProblem:         z.string().nullable().optional(),
  whyContact:             z.array(z.string()).optional(),
  whyNotContact:          z.array(z.string()).optional(),
  qualificationQuestions: z.array(z.string()).optional(),
})

// Converts web analyzer result to boolean signals (value=null → false, others as-is).
// Evidence map is built separately via evidenceFromWebAnalysis().
function researchToSignals(r: ResearchResult): SignalFlags {
  const val = (key: keyof ResearchResult['signals']): boolean => {
    const s = r.signals[key]
    return s?.value === true
  }
  return {
    signalHasWebsite:             r.success,
    signalHasWhatsapp:            val('signalHasWhatsapp'),
    signalHasContactForm:         val('signalHasContactForm'),
    signalHasBookingSystem:       val('signalHasBookingSystem'),
    signalHasInstagram:           val('signalHasInstagram'),
    signalHasLinkedin:            val('signalHasLinkedin'),
    signalHasGoogleBusiness:      val('signalHasGoogleBusiness'),
    signalHasReviews:             val('signalHasReviews'),
    signalHasUnansweredReviews:   val('signalHasUnansweredReviews'),
    signalHasClearCta:            val('signalHasClearCta'),
    signalHasLeadCapture:         val('signalHasLeadCapture'),
    signalSlowResponse:           val('signalSlowResponse'),
    signalWeakFollowup:           val('signalWeakFollowup'),
    signalManualWork:             val('signalManualWork'),
    signalWeakOnlinePresence:     val('signalWeakOnlinePresence'),
  }
}

// For companies without a website: only confirm what we actually know.
function noWebsiteSignals(): SignalFlags {
  return {
    signalHasWebsite:           false,  // confirmed negative
    signalHasWhatsapp:          true,   // unknown → neutral (assume present)
    signalHasContactForm:       true,   // unknown → neutral
    signalHasBookingSystem:     true,   // unknown → neutral
    signalHasInstagram:         true,   // unknown → neutral
    signalHasLinkedin:          true,   // unknown → neutral
    signalHasGoogleBusiness:    true,   // unknown → neutral
    signalHasReviews:           true,   // unknown → neutral
    signalHasUnansweredReviews: false,  // unknown → neutral (assume absent = good)
    signalHasClearCta:          true,   // unknown → neutral
    signalHasLeadCapture:       true,   // unknown → neutral
    signalSlowResponse:         false,  // unknown → neutral
    signalWeakFollowup:         false,  // unknown → neutral (NOT assumed true)
    signalManualWork:           false,  // unknown → neutral (NOT assumed true)
    signalWeakOnlinePresence:   true,   // inferred positive from no website
  }
}

function stateToAction(state: string): string {
  if (state === 'OFFER_AUDIT')       return 'Enviar gancho para auditoría gratuita de 15 min'
  if (state === 'CONTACT_READY')     return 'Iniciar primer contacto directo'
  if (state === 'RESEARCH_REQUIRED') return 'Investigar datos de contacto antes de contactar'
  return 'Prospect descalificado — no iniciar contacto'
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = ImportSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid import data', parsed.error.flatten())
    }

    const candidate = parsed.data

    // Server-side duplicate guard (after client-side dedup)
    const existing = await prisma.company.findFirst({
      where: {
        name:    { equals: candidate.name, mode: 'insensitive' },
        country: candidate.country,
      },
      select: { id: true },
    })

    if (existing) {
      const result: ImportedCompanyResult = {
        candidateExternalId: candidate.externalId,
        status:              'duplicate',
        companyId:           existing.id,
        companyName:         candidate.name,
        opportunityScore:    null,
        priorityLevel:       null,
        hasWebsite:          !!candidate.website,
        webAnalyzed:         false,
        detectedPhone:       null,
        error:               null,
      }
      return ok(result)
    }

    // Analyze website if available
    let research:     ResearchResult | null = null
    let webAnalyzed   = false
    let detectedPhone: string | null = candidate.phone ?? null
    let signals:      SignalFlags
    let evidence:     SignalEvidenceMap
    let websiteVerifStatus = 'NOT_PROVIDED'

    if (candidate.website) {
      research    = await analyzeUrl(candidate.website)
      webAnalyzed = research.success
      if (research.detectedPhone) detectedPhone = research.detectedPhone

      // Identity check: is this the right website for this business?
      const verif = verifyIdentity(candidate.name, research)
      websiteVerifStatus = verif.status

      // If parked, mismatch, or unreachable → treat as no website
      if (verif.status === 'MISMATCH' || verif.status === 'UNKNOWN' || !research.success) {
        signals  = noWebsiteSignals()
        evidence = evidenceNoWebsite()
      } else {
        signals  = researchToSignals(research)
        evidence = evidenceFromWebAnalysis(research)
      }
    } else {
      signals  = noWebsiteSignals()
      evidence = evidenceNoWebsite()
    }

    const coverage = computeCoverage(evidence)

    // v2: Prospect Signal Engine — ICP Fit + Visible Symptoms + Contactability + Audit Priority
    const prospectSignals = computeProspectSignals({
      name:                     candidate.name,
      industry:                 candidate.industry,
      country:                  candidate.country,
      city:                     candidate.city ?? null,
      website:                  candidate.website ?? null,
      isCommercial:             candidate.entityIsCommercial ?? true,
      entityType:               candidate.entityType ?? null,
      entityExclusionReason:    candidate.entityExclusionReason ?? null,
      evidence:                 evidence as ProspectSignalInput['evidence'],
      evidenceCoverage:         coverage,
      websiteVerificationStatus: websiteVerifStatus,
      hasPhone:                 !!detectedPhone,
      hasWhatsapp:              !!research?.detectedWhatsapp,
      hasEmail:                 signals.signalHasContactForm,
      hasInstagram:             !!research?.detectedInstagram,
      hasLinkedin:              !!research?.detectedLinkedin,
    })

    const leadSource = candidate.source === 'here' ? 'here_discovery' : 'osm_discovery'

    const company = await prisma.$transaction(async (tx) => {
      const co = await tx.company.create({
        data: {
          name:              candidate.name,
          industry:          candidate.industry,
          country:           candidate.country,
          city:              candidate.city ?? null,
          website:           candidate.website ?? null,
          whatsapp:          research?.detectedWhatsapp ?? null,
          instagram:         research?.detectedInstagram ?? null,
          linkedin:          research?.detectedLinkedin ?? null,
          googleBusinessUrl: candidate.googleBusinessUrl ?? null,
          status:            'active',
          leadSource,
          // Discovery provenance metadata (not used for v2 scoring)
          prospectFitScore:        candidate.prospectFitScore ?? null,
          estimatedBusinessSize:   candidate.estimatedBusinessSize ?? null,
          businessSizeConfidence:  candidate.businessSizeConfidence ?? null,
          chainDetected:           candidate.chainDetected ?? false,
          prospectProfile:         candidate.prospectProfile ?? null,
          opportunityReasons:      candidate.opportunityReasons ?? [],
          prospectRisks:           candidate.prospectRisks ?? [],
          discoverySearchCountry:  candidate.discoverySearchCountry ?? null,
          discoverySearchCity:     candidate.discoverySearchCity ?? null,
          discoverySearchDistrict: candidate.discoverySearchDistrict ?? null,
          discoveryMode:           candidate.discoveryMode ?? null,
          discoveryRankBefore:     candidate.discoveryRankBefore ?? null,
          discoveryRankAfter:      candidate.discoveryRankAfter ?? null,
          // Entity classification
          entityType:              candidate.entityType ?? null,
          entityIsCommercial:      candidate.entityIsCommercial ?? true,
          entityExclusionReason:   candidate.entityExclusionReason ?? null,
          // v2 Prospect Signal Engine scores
          icpFitScore:             prospectSignals.icpFitScore,
          painScore:               prospectSignals.visibleSymptomsScore,
          contactabilityScore:     prospectSignals.contactabilityScore,
          salesOpportunityScore:   prospectSignals.auditPriorityScore,
          commercialState:         prospectSignals.commercialState,
          qualificationReason:     prospectSignals.auditHook,
          qualificationQuestions:  prospectSignals.auditQuestions.map(q => q.question),
          whyContact:              prospectSignals.confirmedSymptoms.map(s => s.label),
          whyNotContact:           prospectSignals.disqualificationReason
                                     ? [prospectSignals.disqualificationReason]
                                     : [],
          disqualificationReason:  prospectSignals.disqualificationReason,
          recommendedFirstAction:  stateToAction(prospectSignals.commercialState),
          // Evidence qualification
          websiteVerificationStatus: websiteVerifStatus,
          websiteVerifiedAt:         candidate.website ? new Date() : null,
        },
      })

      await tx.evaluation.create({
        data: {
          companyId:        co.id,
          evaluatedBy:      'discovery_engine_v2',
          evaluationSource: 'discovery_engine_v2',
          // Signal boolean flags stored for transparency (not used for v2 scoring)
          signalHasWebsite:           signals.signalHasWebsite,
          signalHasWhatsapp:          signals.signalHasWhatsapp,
          signalHasContactForm:       signals.signalHasContactForm,
          signalHasBookingSystem:     signals.signalHasBookingSystem,
          signalHasInstagram:         signals.signalHasInstagram,
          signalHasLinkedin:          signals.signalHasLinkedin,
          signalHasGoogleBusiness:    signals.signalHasGoogleBusiness,
          signalHasReviews:           signals.signalHasReviews,
          signalHasUnansweredReviews: signals.signalHasUnansweredReviews,
          signalHasClearCta:          signals.signalHasClearCta,
          signalHasLeadCapture:       signals.signalHasLeadCapture,
          signalSlowResponse:         signals.signalSlowResponse,
          signalWeakFollowup:         signals.signalWeakFollowup,
          signalManualWork:           signals.signalManualWork,
          signalWeakOnlinePresence:   signals.signalWeakOnlinePresence,
          // Audit Priority Score stored in opportunityScore for schema compatibility
          opportunityScore:           prospectSignals.auditPriorityScore,
          // Evidence metadata
          signalEvidence:   evidence as object,
          researchCoverage: coverage,
          scoreConfidence:  coverage >= 60 ? 'high' : coverage >= 30 ? 'medium' : 'low',
          evaluationStatus: 'v2_signal_engine',
          // v2 — this is a clean evaluation, not legacy
          isLegacyEval: false,
        },
      })

      await tx.company.update({
        where: { id: co.id },
        data: {
          latestOpportunityScore: prospectSignals.auditPriorityScore,
          latestPriorityLevel:    prospectSignals.commercialState,
          latestEvaluatedAt:      new Date(),
        },
      })

      await tx.salesNote.create({
        data: {
          companyId:     co.id,
          assignedTo:    'alejandro@kronosdata.tech',
          contactStatus: 'not_contacted',
          meetingStatus: 'not_scheduled',
          nextAction:    stateToAction(prospectSignals.commercialState),
          contactPhone:  detectedPhone ?? null,
        },
      })

      return co
    })

    const result: ImportedCompanyResult = {
      candidateExternalId: candidate.externalId,
      status:              'imported',
      companyId:           company.id,
      companyName:         company.name,
      opportunityScore:    prospectSignals.auditPriorityScore,
      priorityLevel:       prospectSignals.commercialState,
      hasWebsite:          !!candidate.website,
      webAnalyzed,
      detectedPhone,
      error:               null,
    }

    return ok(result)
  } catch (err) {
    console.error('[discovery/import] Error:', err)
    const body: ImportedCompanyResult = {
      candidateExternalId: 'unknown',
      status:              'failed',
      companyId:           null,
      companyName:         '',
      opportunityScore:    null,
      priorityLevel:       null,
      hasWebsite:          false,
      webAnalyzed:         false,
      detectedPhone:       null,
      error:               err instanceof Error ? err.message : 'Unknown error',
    }
    return Response.json(body, { status: 500 })
  }
}
