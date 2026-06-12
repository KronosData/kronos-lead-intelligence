// Reprocesses Dental Zegarra and Kronos Data with the evidence model.
// Run: npx tsx scripts/reprocess-companies.ts

import 'dotenv/config'
import { prisma } from '../lib/db'
import { computeScoresWithEvidence } from '../lib/scoring'
import { generateDiagnosis } from '../lib/diagnosis'
import { matchServices } from '../lib/service-match'
import { estimateRevenueOpportunity } from '../lib/value-estimator'
import {
  evidenceNoWebsite,
  evidenceAllManual,
  computeCoverage,
  applyEvidence,
} from '../lib/evidence'
import { recommendPackage } from '../lib/recommendations/package-mapper'
import type { SignalFlags } from '../lib/types'
import type { SignalEvidenceMap } from '../lib/evidence'

async function reprocessCompany(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, industry: true, website: true, leadSource: true },
  })
  if (!company) { console.error(`Company ${companyId} not found`); return }

  const latestEv = await prisma.evaluation.findFirst({
    where: { companyId },
    orderBy: { evaluatedAt: 'desc' },
  })

  const isDiscovery = company.leadSource === 'here_discovery' || company.leadSource === 'osm_discovery'
  let signals: SignalFlags
  let evidence: SignalEvidenceMap

  if (!company.website && isDiscovery) {
    evidence = evidenceNoWebsite()
    signals = applyEvidence(
      {
        signalHasWebsite: false, signalHasWhatsapp: false, signalHasContactForm: false,
        signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false,
        signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: false,
        signalHasClearCta: false, signalHasLeadCapture: false, signalSlowResponse: false,
        signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: true,
      },
      evidence,
    )
  } else if (latestEv) {
    const storedSignals: SignalFlags = {
      signalHasWebsite: latestEv.signalHasWebsite,
      signalHasWhatsapp: latestEv.signalHasWhatsapp,
      signalHasContactForm: latestEv.signalHasContactForm,
      signalHasBookingSystem: latestEv.signalHasBookingSystem,
      signalHasInstagram: latestEv.signalHasInstagram,
      signalHasLinkedin: latestEv.signalHasLinkedin,
      signalHasGoogleBusiness: latestEv.signalHasGoogleBusiness,
      signalHasReviews: latestEv.signalHasReviews,
      signalHasUnansweredReviews: latestEv.signalHasUnansweredReviews,
      signalHasClearCta: latestEv.signalHasClearCta,
      signalHasLeadCapture: latestEv.signalHasLeadCapture,
      signalSlowResponse: latestEv.signalSlowResponse,
      signalWeakFollowup: latestEv.signalWeakFollowup,
      signalManualWork: latestEv.signalManualWork,
      signalWeakOnlinePresence: latestEv.signalWeakOnlinePresence,
    }
    evidence = evidenceAllManual(storedSignals)
    signals = storedSignals
  } else {
    console.log(`${company.name}: no evaluation to reprocess`)
    return
  }

  const prevScore = latestEv?.opportunityScore ?? null
  const prevPriority = latestEv?.priorityLevel ?? null

  const coverage = computeCoverage(evidence)
  const scores   = computeScoresWithEvidence(signals, evidence)
  const diagnosis = generateDiagnosis(signals, company.industry, scores.opportunityScore, coverage, evidence)
  const services  = matchServices(signals, coverage)
  const pkgRec    = recommendPackage(signals, coverage, evidence)
  const revenue   = estimateRevenueOpportunity(signals, company.industry, services.estimatedProjectPriceMin, coverage)

  const newEv = await prisma.$transaction(async (tx) => {
    const ev = await tx.evaluation.create({
      data: {
        companyId,
        evaluatedBy: 'reprocess_engine',
        ...signals,
        scoreLeadGeneration: scores.scoreLeadGeneration,
        scoreFollowUp: scores.scoreFollowUp,
        scoreConversionProcess: scores.scoreConversionProcess,
        scoreAutomationOpportunity: scores.scoreAutomationOpportunity,
        scoreOnlinePresence: scores.scoreOnlinePresence,
        scoreReputation: scores.scoreReputation,
        opportunityScore: scores.opportunityScore,
        priorityLevel: scores.priorityLevel,
        detectedProblems: diagnosis.detectedProblems,
        probablePainPoint: diagnosis.probablePainPoint,
        recommendedSolution: diagnosis.recommendedSolution,
        estimatedValueMin: diagnosis.estimatedValueMin,
        estimatedValueMax: diagnosis.estimatedValueMax,
        estimatedLeadsLostPerMonth: revenue.estimatedLeadsLostPerMonth,
        estimatedRevenueLostPerMonth: revenue.estimatedRevenueLostPerMonth,
        estimatedRoiPotential: revenue.estimatedRoiPotential,
        recommendedServices: services.recommendedServices,
        primaryService: services.primaryService,
        complementaryServices: services.complementaryServices,
        futureServices: services.futureServices,
        implementationDifficulty: services.implementationDifficulty,
        implementationTimeEstimate: services.implementationTimeEstimate,
        estimatedProjectPriceMin: services.estimatedProjectPriceMin,
        estimatedProjectPriceMax: services.estimatedProjectPriceMax,
        priceLabel: services.priceLabel,
        signalEvidence: evidence as object,
        researchCoverage: coverage,
        scoreConfidence: scores.scoreConfidence,
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
      where: { id: companyId },
      data: {
        latestOpportunityScore: scores.opportunityScore,
        latestPriorityLevel:    scores.priorityLevel,
        latestEvaluatedAt:      ev.evaluatedAt,
        latestPackageSlug:      pkgRec.recommendedPackageSlug,
        latestPrimaryService:   services.primaryService,
        latestScoreConfidence:  scores.scoreConfidence,
      },
    })
    return ev
  })

  console.log(`\n✅ ${company.name}`)
  console.log(`   Antes:  score=${prevScore} priority=${prevPriority}`)
  console.log(`   Después: score=${newEv.opportunityScore} priority=${newEv.priorityLevel}`)
  console.log(`   Coverage: ${coverage}% | Status: ${scores.evaluationStatus}`)
  console.log(`   Servicio principal: ${services.primaryService}`)
  console.log(`   Precio: $${services.estimatedProjectPriceMin}–$${services.estimatedProjectPriceMax} (${services.priceLabel})`)
  console.log(`   Paquete recomendado: ${pkgRec.recommendedPackageName} (${pkgRec.packageConfidence})`)
  console.log(`   Problemas confirmados: ${diagnosis.detectedProblems.length}`)
  console.log(`   Evaluación ID: ${newEv.id}`)
}

async function main() {
  console.log('=== Reprocesando empresas con modelo de evidencia ===\n')

  // Find Dental Zegarra and Kronos Data
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    where: {
      OR: [
        { name: { contains: 'Dental Zegarra', mode: 'insensitive' } },
        { name: { contains: 'Kronos', mode: 'insensitive' } },
      ],
    },
  })

  console.log(`Empresas encontradas: ${companies.map(c => c.name).join(', ')}`)

  for (const c of companies) {
    await reprocessCompany(c.id)
  }

  console.log('\n=== Reprocessing completo ===')
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
