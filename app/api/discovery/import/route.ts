// POST /api/discovery/import
// Imports a single discovered company, runs all scoring engines with evidence model,
// and creates an initial SalesNote. One request per company (Vercel 60s timeout).

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { analyzeUrl } from '@/lib/web-analyzer'
import { computeScoresWithEvidence } from '@/lib/scoring'
import { generateDiagnosis } from '@/lib/diagnosis'
import { matchServices } from '@/lib/service-match'
import { estimateRevenueOpportunity } from '@/lib/value-estimator'
import {
  evidenceNoWebsite,
  evidenceFromWebAnalysis,
  computeCoverage,
  applyEvidence,
} from '@/lib/evidence'
import { recommendPackage } from '@/lib/recommendations/package-mapper'
import { verifyIdentity } from '@/lib/website-verifier'
import { computeCommercialState } from '@/lib/commercial-state'
import { ok, badRequest } from '@/lib/api-helpers'
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

  // Phase 3.8 — Prospect Fit fields from discovery normalizer
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
  // Phase 3.9 — Commercial qualification
  entityType:             z.string().optional(),
  entityIsCommercial:     z.boolean().optional(),
  entityExclusionReason:  z.string().nullable().optional(),
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
// Confirmed: signalHasWebsite=false (from discovery source having no URL).
// Inferred:  signalWeakOnlinePresence=true (derived from no website).
// All others: unknown → neutral for scoring (do NOT assume problems).
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

    // Coverage-aware scoring (unknown signals neutralized)
    const coverage  = computeCoverage(evidence)
    const scores    = computeScoresWithEvidence(signals, evidence)
    // Re-apply evidence for diagnosis (pass raw booleans for confirmed problems)
    const neutralized = applyEvidence(signals, evidence)
    const diagnosis  = generateDiagnosis(neutralized, candidate.industry, scores.opportunityScore, coverage, evidence)
    const services   = matchServices(neutralized, coverage)
    const revenue    = estimateRevenueOpportunity(neutralized, candidate.industry, services.estimatedProjectPriceMin, coverage)
    const pkgRec     = recommendPackage(neutralized, coverage, evidence)

    const leadSource = candidate.source === 'here' ? 'here_discovery' : 'osm_discovery'

    // Commercial state at import time
    const commercialState = computeCommercialState({
      entityIsCommercial:        candidate.entityIsCommercial ?? true,
      sellabilityClass:          candidate.sellabilityClass ?? null,
      icpFitScore:               candidate.contactabilityScore ?? 30,
      contactabilityScore:       candidate.contactabilityScore ?? 30,
      painScore:                 50, // unknown at discovery stage
      coveragePercent:           coverage,
      websiteVerificationStatus: websiteVerifStatus,
    })

    // Determine initial SalesNote action based on available contact info
    const hasContactInfo = !!(detectedPhone || research?.detectedWhatsapp)
    const nextAction = hasContactInfo
      ? 'Revisar diagnóstico y realizar primer contacto'
      : 'Investigar contacto y validar diagnóstico'

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
          // Phase 3.8 — discovery-stage prospect analysis
          prospectFitScore:        candidate.prospectFitScore ?? null,
          estimatedBusinessSize:   candidate.estimatedBusinessSize ?? null,
          businessSizeConfidence:  candidate.businessSizeConfidence ?? null,
          chainDetected:           candidate.chainDetected ?? false,
          prospectProfile:         candidate.prospectProfile ?? null,
          contactabilityScore:     candidate.contactabilityScore ?? null,
          opportunityReasons:      candidate.opportunityReasons ?? [],
          prospectRisks:           candidate.prospectRisks ?? [],
          discoverySearchCountry:  candidate.discoverySearchCountry ?? null,
          discoverySearchCity:     candidate.discoverySearchCity ?? null,
          discoverySearchDistrict: candidate.discoverySearchDistrict ?? null,
          discoveryMode:           candidate.discoveryMode ?? null,
          discoveryRankBefore:     candidate.discoveryRankBefore ?? null,
          discoveryRankAfter:      candidate.discoveryRankAfter ?? null,
          // Phase 3.9 — Commercial qualification
          entityType:              candidate.entityType ?? null,
          entityIsCommercial:      candidate.entityIsCommercial ?? true,
          entityExclusionReason:   candidate.entityExclusionReason ?? null,
          commercialQualification: candidate.commercialQualification ?? null,
          salesQualificationScore: candidate.salesQualificationScore ?? null,
          sellabilityClass:        candidate.sellabilityClass ?? null,
          roiFitScore:             candidate.roiFitScore ?? null,
          roiFitLabel:             candidate.roiFitLabel ?? null,
          roiMultiple:             candidate.roiMultiple ?? null,
          paybackMonths:           candidate.paybackMonths ?? null,
          budgetCapacityScore:     candidate.budgetCapacityScore ?? null,
          budgetCapacityLabel:     candidate.budgetCapacityLabel ?? null,
          economicModelType:       candidate.economicModelType ?? null,
          primaryProblem:          candidate.primaryProblem ?? null,
          whyContact:              candidate.whyContact ?? [],
          whyNotContact:           candidate.whyNotContact ?? [],
          qualificationQuestions:  candidate.qualificationQuestions ?? [],
          // Evidence qualification
          websiteVerificationStatus: websiteVerifStatus,
          websiteVerifiedAt:         candidate.website ? new Date() : null,
          commercialState,
        },
      })

      await tx.evaluation.create({
        data: {
          companyId:   co.id,
          evaluatedBy: 'discovery_engine',
          evaluationSource: 'discovery_engine',
          // Store the raw boolean signals (before neutralization) for transparency
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
          // Scores (evidence-aware)
          scoreLeadGeneration:        scores.scoreLeadGeneration,
          scoreFollowUp:              scores.scoreFollowUp,
          scoreConversionProcess:     scores.scoreConversionProcess,
          scoreAutomationOpportunity: scores.scoreAutomationOpportunity,
          scoreOnlinePresence:        scores.scoreOnlinePresence,
          scoreReputation:            scores.scoreReputation,
          opportunityScore:           scores.opportunityScore,
          // Diagnosis
          priorityLevel:              scores.priorityLevel,
          detectedProblems:           diagnosis.detectedProblems,
          probablePainPoint:          diagnosis.probablePainPoint,
          recommendedSolution:        diagnosis.recommendedSolution,
          estimatedValueMin:          diagnosis.estimatedValueMin,
          estimatedValueMax:          diagnosis.estimatedValueMax,
          // Revenue
          estimatedLeadsLostPerMonth:   revenue.estimatedLeadsLostPerMonth,
          estimatedRevenueLostPerMonth: revenue.estimatedRevenueLostPerMonth,
          estimatedRoiPotential:        revenue.estimatedRoiPotential,
          // Service match (tiered)
          recommendedServices:        services.recommendedServices,
          primaryService:             services.primaryService,
          complementaryServices:      services.complementaryServices,
          futureServices:             services.futureServices,
          implementationDifficulty:   services.implementationDifficulty,
          implementationTimeEstimate: services.implementationTimeEstimate,
          estimatedProjectPriceMin:   services.estimatedProjectPriceMin,
          estimatedProjectPriceMax:   services.estimatedProjectPriceMax,
          priceLabel:                 services.priceLabel,
          // Evidence metadata
          signalEvidence:   evidence as object,
          researchCoverage: coverage,
          scoreConfidence:  scores.scoreConfidence,
          evaluationStatus: scores.evaluationStatus,
          // Package recommendation
          recommendedPackageSlug: pkgRec.recommendedPackageSlug,
          recommendedPackageName: pkgRec.recommendedPackageName,
          alternativePackageSlug: pkgRec.alternativePackageSlug,
          alternativePackageName: pkgRec.alternativePackageName,
          packageReason:          pkgRec.packageReason,
          packageEvidence:        pkgRec.packageEvidence,
          packageConfidence:      pkgRec.packageConfidence,
          packageCoverage:        pkgRec.packageCoverage,
          packagePriceMin:        pkgRec.packagePriceMin,
          packagePriceMax:        pkgRec.packagePriceMax,
          packageTimelineMin:     pkgRec.packageTimelineMin,
          packageTimelineMax:     pkgRec.packageTimelineMax,
          officialSourceUrl:      pkgRec.officialSourceUrl,
          catalogVersion:         pkgRec.catalogVersion,
        },
      })

      await tx.company.update({
        where: { id: co.id },
        data: {
          latestOpportunityScore: scores.opportunityScore,
          latestPriorityLevel:    scores.priorityLevel,
          latestEvaluatedAt:      new Date(),
          latestPackageSlug:      pkgRec.recommendedPackageSlug,
          latestPrimaryService:   services.primaryService,
          latestScoreConfidence:  scores.scoreConfidence,
        },
      })

      // Auto-initialize SalesNote — only empty fields, no overwrite
      await tx.salesNote.create({
        data: {
          companyId:     co.id,
          assignedTo:    'alejandro@kronosdata.tech',
          contactStatus: 'not_contacted',
          meetingStatus: 'not_scheduled',
          nextAction,
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
      opportunityScore:    scores.opportunityScore,
      priorityLevel:       scores.priorityLevel,
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
