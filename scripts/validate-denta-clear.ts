// Validation script: Verify that the evidence-fix logic produces correct results
// for the Denta Clear case (website unreachable → RESEARCH_REQUIRED, not LOW).
import 'dotenv/config'
import { analyzeUrl } from '../lib/web-analyzer'
import { verifyIdentity } from '../lib/website-verifier'
import { computeCommercialState } from '../lib/commercial-state'
import { evidenceNoWebsite, evidenceFromWebAnalysis, computeCoverage } from '../lib/evidence'
import { computeScoresWithEvidence } from '../lib/scoring'
import { prisma } from '../lib/db'

async function main() {
  console.log('=== Denta Clear Validation ===\n')

  const company = await prisma.company.findUnique({
    where: { id: 'e1db7705-8b64-479f-ab1b-a36bbb320240' },
    select: {
      id: true, name: true, website: true,
      latestOpportunityScore: true, latestPriorityLevel: true,
      salesPriority: true, evidenceTier: true,
      entityIsCommercial: true, sellabilityClass: true,
      contactabilityScore: true,
    },
  })

  if (!company) { console.error('Denta Clear not found'); return }

  console.log('Current state in DB:')
  console.log(JSON.stringify({
    latestOpportunityScore: company.latestOpportunityScore,
    latestPriorityLevel: company.latestPriorityLevel,
    salesPriority: company.salesPriority,
    evidenceTier: company.evidenceTier,
  }, null, 2))

  console.log('\n--- Simulating reprocess with dentaclear.com ---')

  // 1. Try to analyze website
  const research = await analyzeUrl(company.website ?? 'http://www.dentaclear.com')
  console.log(`Web analysis: success=${research.success}, httpStatus=${research.httpStatus}, isParked=${research.isParkedDomain}`)
  console.log(`Error: ${research.error ?? 'none'}`)

  // 2. Verify identity
  const verif = verifyIdentity(company.name, research)
  console.log(`Identity verification: status=${verif.status}, matchScore=${verif.nameMatchScore.toFixed(2)}, isParked=${verif.isParked}`)

  // 3. Determine evidence path
  let evidence, label
  if (verif.status === 'MISMATCH' || verif.status === 'UNKNOWN' || !research.success) {
    evidence = evidenceNoWebsite()
    label = 'evidenceNoWebsite (website unreachable or mismatched)'
  } else {
    evidence = evidenceFromWebAnalysis(research)
    label = 'evidenceFromWebAnalysis'
  }
  console.log(`Evidence source: ${label}`)

  // 4. Compute coverage
  const coverage = computeCoverage(evidence)
  console.log(`Coverage: ${coverage}%`)

  // 5. Compute scores
  const neutralSignals = {
    signalHasWebsite: false, signalHasWhatsapp: false,
    signalHasContactForm: false, signalHasBookingSystem: false,
    signalHasInstagram: false, signalHasLinkedin: false,
    signalHasGoogleBusiness: false, signalHasReviews: false,
    signalHasUnansweredReviews: false, signalHasClearCta: false,
    signalHasLeadCapture: false, signalSlowResponse: false,
    signalWeakFollowup: false, signalManualWork: false,
    signalWeakOnlinePresence: true,
  }
  const scores = computeScoresWithEvidence(neutralSignals, evidence)
  console.log(`Scores: opportunityScore=${scores.opportunityScore}, priorityLevel=${scores.priorityLevel}`)

  // 6. Commercial state
  const commercialState = computeCommercialState({
    entityIsCommercial: company.entityIsCommercial,
    sellabilityClass: company.sellabilityClass,
    icpFitScore: company.contactabilityScore ?? 30,
    contactabilityScore: company.contactabilityScore ?? 30,
    painScore: 50,
    coveragePercent: coverage,
    websiteVerificationStatus: verif.status,
  })
  console.log(`Commercial state: ${commercialState}`)

  console.log('\n=== VERDICT ===')
  const isCorrect = coverage < 40 && commercialState === 'RESEARCH_REQUIRED'
  console.log(`Coverage < 40%: ${coverage < 40} ✓`)
  console.log(`Commercial state = RESEARCH_REQUIRED: ${commercialState === 'RESEARCH_REQUIRED'} ✓`)
  console.log(`Website verification = UNREACHABLE or MISMATCH: ${['UNREACHABLE', 'MISMATCH', 'UNKNOWN'].includes(verif.status)} ✓`)
  console.log(`\nFIX VALIDATED: ${isCorrect ? '✅ YES — Denta Clear would now show RESEARCH_REQUIRED' : '❌ NO — still wrong'}`)
}

main().finally(() => prisma.$disconnect())
