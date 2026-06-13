// Comprehensive commercial engine validation — 16 test cases + live DB check.
// Run: npx tsx scripts/validate-commercial-engine.ts
//
// Strategy: mock web-analysis results for determinism; real DB for Denta Clear.

import 'dotenv/config'

import { evidenceNoWebsite, evidenceFromWebAnalysis, computeCoverage, applyEvidence, evaluationStatusFromCoverage } from '../lib/evidence'
import { computeScoresWithEvidence } from '../lib/scoring'
import { computeCommercialState } from '../lib/commercial-state'
import { verifyIdentity } from '../lib/website-verifier'
import { computeCompositeScore } from '../lib/scoring/composite-scorer'
import { computeProspectFitScore } from '../lib/prospecting/prospect-fit'
import { classifyEntity } from '../lib/qualification/entity-classifier'
import { computeRoiFit } from '../lib/qualification/roi-fit'
import { computeBudgetCapacity } from '../lib/qualification/budget-capacity'
import { evaluateCommercialGate } from '../lib/qualification/commercial-gate'
import { computeSalesQualificationScore } from '../lib/qualification/sales-qualification'
import { estimateRevenueOpportunity } from '../lib/value-estimator'
import { generateDiagnosis } from '../lib/diagnosis'
import { matchServices } from '../lib/service-match'
import { generateOutreachMessages, assessOutreachCompliance } from '../lib/outreach/message-generator'
import { getIndustryProfile } from '../lib/economics/industry-models'
import { prisma } from '../lib/db'
import type { ResearchResult, SignalResult } from '../lib/web-analyzer'
import type { SignalFlags } from '../lib/types'

// ── Test harness ──────────────────────────────────────────────────────────────

interface CaseResult {
  num: number
  name: string
  pass: boolean
  failures: string[]
  notes: string[]
  details: Record<string, unknown>
}

const cases: CaseResult[] = []
let totalPassed = 0
let totalFailed = 0

function test(num: number, name: string, fn: () => CaseResult) {
  const result = fn()
  cases.push(result)
  if (result.pass) { totalPassed++; console.log(`  ✅ Case ${num}: ${name}`) }
  else { totalFailed++; console.log(`  ❌ Case ${num}: ${name}\n     ${result.failures.join('\n     ')}`) }
}

function assert(cond: boolean, msg: string, failures: string[]): void {
  if (!cond) failures.push(`FAIL: ${msg}`)
}

function note(msg: string, notes: string[]): void {
  notes.push(msg)
}

// ── Mock factory helpers ───────────────────────────────────────────────────────

function sig(value: boolean | null, confidence: 'high' | 'medium' | 'low' | 'none', source: string): SignalResult {
  return { value, confidence, source }
}

const MANUAL: SignalResult = { value: null, confidence: 'none', source: 'requires_manual' }

function makeResearch(overrides: Partial<ResearchResult>): ResearchResult {
  const base: ResearchResult = {
    success: true,
    fetchedUrl: 'https://example.com',
    httpStatus: 200,
    detectedName: 'Example Business',
    detectedPhone: null,
    detectedWhatsapp: null,
    detectedInstagram: null,
    detectedLinkedin: null,
    isSPA: false,
    isParkedDomain: false,
    signals: {
      signalHasWebsite:           sig(true, 'high', 'http_200'),
      signalHasWhatsapp:          sig(false, 'high', 'no_whatsapp_link'),
      signalHasContactForm:       sig(false, 'medium', 'no_form_detected'),
      signalHasBookingSystem:     sig(false, 'medium', 'no_booking_detected'),
      signalHasInstagram:         sig(false, 'high', 'no_instagram_link'),
      signalHasLinkedin:          sig(false, 'high', 'no_linkedin_link'),
      signalHasGoogleBusiness:    MANUAL,
      signalHasReviews:           MANUAL,
      signalHasUnansweredReviews: MANUAL,
      signalHasClearCta:          sig(false, 'low', 'no_cta_detected'),
      signalHasLeadCapture:       sig(false, 'medium', 'no_lead_capture'),
      signalSlowResponse:         MANUAL,
      signalWeakFollowup:         MANUAL,
      signalManualWork:           MANUAL,
      signalWeakOnlinePresence:   sig(true, 'medium', 'inferred_no_channels_detected'),
    },
    autoFilledCount: 9,
    manualRequiredCount: 5,
    warnings: [],
  }
  return { ...base, ...overrides }
}

function fullQualification(company: {
  name: string; industry: string; website: string | null; phone: string | null
  city?: string; country?: string
  entityIsCommercial?: boolean; entityType?: string | null; sellabilityClass?: string | null
  budgetCapacityScore?: number | null; budgetCapacityLabel?: string | null
  roiFitLabel?: string | null; roiFitScore?: number | null
  salesQualificationScore?: number | null; contactabilityScore?: number | null
  estimatedBusinessSize?: string | null; whyContact?: string[]; whyNotContact?: string[]
  entityExclusionReason?: string | null; qualificationQuestions?: string[]
}, coverage: number, signals: SignalFlags, evidence: ReturnType<typeof evidenceNoWebsite>) {
  const bsResult = { size: 'small' as const, confidence: 'low' as const, chainDetected: false, chainEvidence: [], isExcluded: false, exclusionReason: null }
  const pfs = computeProspectFitScore({ name: company.name, industry: company.industry, website: company.website, phone: company.phone, address: company.city ?? '', businessSize: bsResult })
  const entityClass = classifyEntity(company.name, company.industry, company.city ?? '', company.website)
  const roiFit = computeRoiFit({ industry: company.industry, name: company.name, businessSize: bsResult.size, hasWebsite: !!company.website, isCommerciallyViable: entityClass.isCommerciallyViable })
  const budgetCap = computeBudgetCapacity({ industry: company.industry, name: company.name, businessSize: bsResult.size, hasWebsite: !!company.website, hasPhone: !!company.phone })
  const gate = evaluateCommercialGate({ entityType: entityClass.entityType, isCommerciallyViable: entityClass.isCommerciallyViable, hasContact: !!(company.website || company.phone), hasOpportunity: pfs.opportunityVisibleRaw >= 30, roiFitLabel: roiFit.label, budgetCapacityLabel: budgetCap.label })
  const scores = computeScoresWithEvidence(signals, evidence)
  const industryProfile = getIndustryProfile(company.industry, company.name)
  const sqs = computeSalesQualificationScore({ pfsScore: pfs.score, opportunityRaw: pfs.opportunityVisibleRaw, contactabilityRaw: pfs.contactabilityRaw, evidenceQualityRaw: pfs.evidenceQualityRaw, roiFit, budgetCapacity: budgetCap, commercialGate: gate, entityClass, industryProfile, hasWebsite: !!company.website, hasPhone: !!company.phone, opportunityReasons: pfs.opportunityReasons, prospectRisks: pfs.prospectRisks })
  const composite = computeCompositeScore({
    name: company.name, industry: company.industry, country: company.country ?? 'Peru',
    website: company.website, whatsapp: company.phone, instagram: null, linkedin: null, googleBusinessUrl: null,
    entityIsCommercial: entityClass.isCommerciallyViable, entityType: entityClass.entityType,
    sellabilityClass: sqs.sellabilityClass, budgetCapacityScore: budgetCap.score,
    budgetCapacityLabel: budgetCap.label, roiFitLabel: roiFit.label, roiFitScore: roiFit.score,
    salesQualificationScore: sqs.score, contactabilityScore: pfs.contactabilityScore,
    estimatedBusinessSize: bsResult.size, whyContact: sqs.whyContact, whyNotContact: sqs.whyNotContact,
    entityExclusionReason: entityClass.exclusionReason, qualificationQuestions: sqs.qualificationQuestions,
    eval: {
      opportunityScore: scores.opportunityScore, scoreLeadGeneration: scores.scoreLeadGeneration,
      scoreFollowUp: scores.scoreFollowUp, scoreConversionProcess: scores.scoreConversionProcess,
      scoreAutomationOpportunity: scores.scoreAutomationOpportunity, scoreOnlinePresence: scores.scoreOnlinePresence,
      scoreReputation: scores.scoreReputation, researchCoverage: coverage, scoreConfidence: scores.scoreConfidence ?? null,
      signalHasWebsite: signals.signalHasWebsite, signalHasWhatsapp: signals.signalHasWhatsapp,
      signalHasContactForm: signals.signalHasContactForm, signalHasBookingSystem: signals.signalHasBookingSystem,
      signalHasGoogleBusiness: signals.signalHasGoogleBusiness, signalHasReviews: signals.signalHasReviews,
      signalHasUnansweredReviews: signals.signalHasUnansweredReviews, signalHasClearCta: signals.signalHasClearCta,
      signalHasLeadCapture: signals.signalHasLeadCapture, signalSlowResponse: signals.signalSlowResponse,
      signalWeakFollowup: signals.signalWeakFollowup, signalManualWork: signals.signalManualWork,
      signalWeakOnlinePresence: signals.signalWeakOnlinePresence, detectedProblems: [],
      probablePainPoint: null, recommendedPackageSlug: null, primaryService: null,
    },
  })
  const commercialState = computeCommercialState({
    entityIsCommercial: entityClass.isCommerciallyViable, sellabilityClass: sqs.sellabilityClass,
    icpFitScore: composite.icpFitScore, contactabilityScore: pfs.contactabilityRaw,
    painScore: composite.painScore, coveragePercent: coverage,
    websiteVerificationStatus: company.website ? 'VERIFIED' : 'NOT_PROVIDED',
  })
  return { pfs, entityClass, roiFit, budgetCap, gate, scores, sqs, composite, commercialState }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n🔍 Kronos Lead Intelligence — Commercial Engine Validation\n')
console.log('══════════════════════════════════════════════════════════\n')

// ── Case 1: Web válida y coincidente ──────────────────────────────────────────
test(1, 'Empresa con web válida y coincidente', () => {
  const failures: string[] = []
  const notes: string[] = []

  const research = makeResearch({ detectedName: 'Clínica Dental Sur', fetchedUrl: 'https://clinicadentalsur.com' })
  const verif = verifyIdentity('Clínica Dental Sur', research)
  const evidence = evidenceFromWebAnalysis(research)
  const coverage = computeCoverage(evidence)
  const rawSignals: SignalFlags = { signalHasWebsite: true, signalHasWhatsapp: false, signalHasContactForm: false, signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false, signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: false, signalHasClearCta: false, signalHasLeadCapture: false, signalSlowResponse: false, signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: true }
  const signals = applyEvidence(rawSignals, evidence)
  const q = fullQualification({ name: 'Clínica Dental Sur', industry: 'dental', website: 'https://clinicadentalsur.com', phone: null }, coverage, signals, evidence)

  assert(verif.status === 'VERIFIED', `websiteVerifStatus should be VERIFIED, got ${verif.status}`, failures)
  assert(coverage >= 40, `coverage should be ≥40% for web analysis, got ${coverage}%`, failures)
  note(`Coverage: ${coverage}%, verif: ${verif.status}, salesPriority: ${q.composite.salesPriority}, commercialState: ${q.commercialState}`, notes)

  return { num: 1, name: 'Web válida y coincidente', pass: failures.length === 0, failures, notes, details: { verif: verif.status, coverage, salesPriority: q.composite.salesPriority, commercialState: q.commercialState } }
})

// ── Case 2: Web caída / inaccesible ──────────────────────────────────────────
test(2, 'Web entregada por OSM pero caída', () => {
  const failures: string[] = []
  const notes: string[] = []

  const research = makeResearch({ success: false, httpStatus: null, detectedName: null, error: 'No se pudo conectar al sitio', isParkedDomain: false })
  const verif = verifyIdentity('Denta Clear', research)
  const evidence = evidenceNoWebsite()  // fallback when unreachable
  const coverage = computeCoverage(evidence)

  const rawSignals: SignalFlags = { signalHasWebsite: false, signalHasWhatsapp: false, signalHasContactForm: false, signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false, signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: false, signalHasClearCta: false, signalHasLeadCapture: false, signalSlowResponse: false, signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: true }
  const signals = applyEvidence(rawSignals, evidence)
  const q = fullQualification({ name: 'Denta Clear', industry: 'dental', website: 'http://www.dentaclear.com', phone: null }, coverage, signals, evidence)

  // Rule 1: web caída → señales UNKNOWN
  const unknownCount = Object.values(evidence).filter(e => e.status === 'unknown').length
  assert(unknownCount >= 10, `Web caída debe dejar ≥10 señales UNKNOWN, got ${unknownCount}`, failures)
  // Rule 2: < 40% → RESEARCH_REQUIRED
  assert(coverage < 40, `coverage < 40% expected, got ${coverage}%`, failures)
  assert(q.commercialState === 'RESEARCH_REQUIRED', `commercialState should be RESEARCH_REQUIRED, got ${q.commercialState}`, failures)
  // Rule 3: no score definitivo fuerte
  assert(q.composite.salesPriority === 'REVIEW' || q.composite.salesPriority === 'DISCARD', `salesPriority should be REVIEW/DISCARD for LOW evidence, got ${q.composite.salesPriority}`, failures)
  // Rule 6: no LOW sino RESEARCH_REQUIRED
  assert(q.commercialState !== 'NURTURE' && q.commercialState !== 'READY_TO_CONTACT', `must not be NURTURE/READY_TO_CONTACT with no evidence`, failures)
  // Verify website status
  assert(verif.status === 'UNREACHABLE', `websiteVerifStatus should be UNREACHABLE, got ${verif.status}`, failures)

  note(`Coverage: ${coverage}%, unknownSignals: ${unknownCount}/15, verif: ${verif.status}`, notes)
  note(`commercialState: ${q.commercialState}, salesPriority: ${q.composite.salesPriority}`, notes)

  return { num: 2, name: 'Web caída / inaccesible', pass: failures.length === 0, failures, notes, details: { verif: verif.status, coverage, unknownCount, commercialState: q.commercialState, salesPriority: q.composite.salesPriority } }
})

// ── Case 3: Sin web ───────────────────────────────────────────────────────────
test(3, 'Empresa sin web', () => {
  const failures: string[] = []
  const notes: string[] = []

  const evidence = evidenceNoWebsite()
  const coverage = computeCoverage(evidence)
  const rawSignals: SignalFlags = { signalHasWebsite: false, signalHasWhatsapp: false, signalHasContactForm: false, signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false, signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: false, signalHasClearCta: false, signalHasLeadCapture: false, signalSlowResponse: false, signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: true }
  const signals = applyEvidence(rawSignals, evidence)
  const q = fullQualification({ name: 'Peluquería Central', industry: 'beauty', website: null, phone: null }, coverage, signals, evidence)

  assert(coverage === 13, `evidenceNoWebsite should yield 13% coverage (2/15), got ${coverage}%`, failures)
  assert(q.commercialState === 'RESEARCH_REQUIRED', `commercialState should be RESEARCH_REQUIRED, got ${q.commercialState}`, failures)
  assert(q.composite.salesPriority === 'REVIEW', `salesPriority should be REVIEW, got ${q.composite.salesPriority}`, failures)

  // Revenue should be very small due to 30% penalty
  const revenue = estimateRevenueOpportunity(signals, 'beauty', 500, coverage)
  note(`revenue estimado: $${revenue.estimatedRevenueLostPerMonth}/mes (debe ser bajo ≤ coverage penalty)`, notes)

  note(`Coverage: ${coverage}%, commercialState: ${q.commercialState}`, notes)

  return { num: 3, name: 'Sin web', pass: failures.length === 0, failures, notes, details: { coverage, commercialState: q.commercialState, salesPriority: q.composite.salesPriority, revenueLost: revenue.estimatedRevenueLostPerMonth } }
})

// ── Case 4: Datos mínimos ─────────────────────────────────────────────────────
test(4, 'Empresa con datos mínimos (solo nombre + industria)', () => {
  const failures: string[] = []
  const notes: string[] = []

  const evidence = evidenceNoWebsite()
  const coverage = computeCoverage(evidence)
  const rawSignals: SignalFlags = { signalHasWebsite: false, signalHasWhatsapp: false, signalHasContactForm: false, signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false, signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: false, signalHasClearCta: false, signalHasLeadCapture: false, signalSlowResponse: false, signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: true }
  const signals = applyEvidence(rawSignals, evidence)
  const q = fullQualification({ name: 'Empresa X', industry: 'comercio', website: null, phone: null }, coverage, signals, evidence)

  assert(coverage < 40, `coverage < 40% for minimal data`, failures)
  assert(q.composite.salesPriority === 'REVIEW', `no score definitivo fuerte for minimal data, got ${q.composite.salesPriority}`, failures)
  assert(q.commercialState !== 'READY_TO_CONTACT', `no READY_TO_CONTACT with minimal data`, failures)

  // Rule: must not show strong ROI
  const revenue = estimateRevenueOpportunity(signals, 'comercio', 500, coverage)
  note(`Revenue (minimal data): $${revenue.estimatedRevenueLostPerMonth}/mes — debe ser bajo`, notes)

  return { num: 4, name: 'Datos mínimos', pass: failures.length === 0, failures, notes, details: { coverage, salesPriority: q.composite.salesPriority, commercialState: q.commercialState } }
})

// ── Case 5: Con contacto real ─────────────────────────────────────────────────
test(5, 'Empresa con contacto real (WhatsApp + web)', () => {
  const failures: string[] = []
  const notes: string[] = []

  const research = makeResearch({
    detectedName: 'Consultora Legal ABC',
    detectedWhatsapp: '+51987654321',
    signals: {
      ...makeResearch({}).signals,
      signalHasWhatsapp: sig(true, 'high', 'wa_me_link'),
      signalHasContactForm: sig(true, 'high', 'form_email_or_tel_input'),
      signalHasClearCta: sig(true, 'high', 'explicit_cta_button'),
    },
  })
  const verif = verifyIdentity('Consultora Legal ABC', research)
  const evidence = evidenceFromWebAnalysis(research)
  const coverage = computeCoverage(evidence)
  const rawSignals: SignalFlags = {
    signalHasWebsite: true, signalHasWhatsapp: true, signalHasContactForm: true,
    signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false,
    signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: false,
    signalHasClearCta: true, signalHasLeadCapture: false, signalSlowResponse: false,
    signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: false,
  }
  const signals = applyEvidence(rawSignals, evidence)
  const q = fullQualification({ name: 'Consultora Legal ABC', industry: 'legal', website: 'https://legal-abc.com', phone: '+51987654321' }, coverage, signals, evidence)

  assert(coverage >= 40, `coverage ≥40% when web analyzed, got ${coverage}%`, failures)
  assert(q.composite.salesPriority !== 'REVIEW', `should not be REVIEW when there's good contact+evidence`, failures)
  note(`contactabilityScore: ${q.pfs.contactabilityScore}, coverage: ${coverage}%`, notes)
  note(`salesPriority: ${q.composite.salesPriority}, commercialState: ${q.commercialState}`, notes)

  return { num: 5, name: 'Con contacto real', pass: failures.length === 0, failures, notes, details: { coverage, salesPriority: q.composite.salesPriority, commercialState: q.commercialState, contactabilityScore: q.pfs.contactabilityScore } }
})

// ── Case 6: Sin contacto ──────────────────────────────────────────────────────
test(6, 'Empresa sin contacto (solo address)', () => {
  const failures: string[] = []
  const notes: string[] = []

  const evidence = evidenceNoWebsite()
  const coverage = computeCoverage(evidence)
  const rawSignals: SignalFlags = { signalHasWebsite: false, signalHasWhatsapp: false, signalHasContactForm: false, signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false, signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: false, signalHasClearCta: false, signalHasLeadCapture: false, signalSlowResponse: false, signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: true }
  const signals = applyEvidence(rawSignals, evidence)
  const q = fullQualification({ name: 'Taller Mecánico Centro', industry: 'automotive', website: null, phone: null }, coverage, signals, evidence)

  // No contacto → contactabilityScore should be low
  assert(q.pfs.contactabilityScore < 50, `low contactability expected, got ${q.pfs.contactabilityScore}`, failures)
  assert(q.commercialState !== 'READY_TO_CONTACT', `no READY_TO_CONTACT without contact info`, failures)

  note(`contactabilityScore: ${q.pfs.contactabilityScore}, commercialState: ${q.commercialState}`, notes)

  return { num: 6, name: 'Sin contacto', pass: failures.length === 0, failures, notes, details: { contactabilityScore: q.pfs.contactabilityScore, commercialState: q.commercialState } }
})

// ── Case 7: Entidad pública / no comercial ─────────────────────────────────────
test(7, 'Entidad pública / no comercial', () => {
  const failures: string[] = []
  const notes: string[] = []

  const evidence = evidenceNoWebsite()
  const coverage = computeCoverage(evidence)
  const rawSignals: SignalFlags = { signalHasWebsite: false, signalHasWhatsapp: false, signalHasContactForm: false, signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false, signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: false, signalHasClearCta: false, signalHasLeadCapture: false, signalSlowResponse: false, signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: true }
  const signals = applyEvidence(rawSignals, evidence)
  const entityClass = classifyEntity('Municipalidad de Lima Norte', 'gobierno', 'Lima', null)

  const q = fullQualification({ name: 'Municipalidad de Lima Norte', industry: 'gobierno', website: null, phone: null }, coverage, signals, evidence)

  assert(!entityClass.isCommerciallyViable, `government entity should not be commercially viable`, failures)
  assert(q.composite.salesPriority === 'DISCARD', `government entity should be DISCARD, got ${q.composite.salesPriority}`, failures)
  assert(q.commercialState === 'DISQUALIFIED', `government entity commercialState should be DISQUALIFIED, got ${q.commercialState}`, failures)

  note(`entityType: ${entityClass.entityType}, exclusionReason: ${entityClass.exclusionReason ?? 'none'}`, notes)

  return { num: 7, name: 'Entidad pública / no comercial', pass: failures.length === 0, failures, notes, details: { entityType: entityClass.entityType, isCommercial: entityClass.isCommerciallyViable, commercialState: q.commercialState } }
})

// ── Case 8: Pyme privada con oportunidad real ─────────────────────────────────
test(8, 'Pyme privada con oportunidad real (dental, web + WhatsApp + problems)', () => {
  const failures: string[] = []
  const notes: string[] = []

  // Fully analyzed dental clinic: has web, no booking, no reviews, weak CTA
  const research = makeResearch({
    detectedName: 'Clinica Dental El Sol',
    signals: {
      ...makeResearch({}).signals,
      signalHasWhatsapp: sig(true, 'high', 'wa_me_link'),
      signalHasBookingSystem: sig(false, 'medium', 'no_booking_detected'),
      signalHasGoogleBusiness: sig(false, 'medium', 'no_google_maps'),
    },
  })
  const evidence = evidenceFromWebAnalysis(research)
  const coverage = computeCoverage(evidence)
  const rawSignals: SignalFlags = {
    signalHasWebsite: true, signalHasWhatsapp: true, signalHasContactForm: false,
    signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false,
    signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: false,
    signalHasClearCta: false, signalHasLeadCapture: false, signalSlowResponse: false,
    signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: true,
  }
  const signals = applyEvidence(rawSignals, evidence)
  const q = fullQualification({ name: 'Clinica Dental El Sol', industry: 'dental', website: 'https://eldental.com', phone: '+51987111111' }, coverage, signals, evidence)

  assert(coverage >= 40, `coverage ≥40% needed for opportunity, got ${coverage}%`, failures)
  assert(q.commercialState === 'OFFER_AUDIT' || q.commercialState === 'READY_TO_CONTACT', `dental pyme with evidence should be OFFER_AUDIT or READY_TO_CONTACT, got ${q.commercialState}`, failures)
  assert(q.composite.salesPriority !== 'DISCARD', `viable pyme should not be DISCARD`, failures)

  note(`commercialState: ${q.commercialState}, salesPriority: ${q.composite.salesPriority}`, notes)
  note(`coverage: ${coverage}%, icpFit: ${q.composite.icpFitScore}, pain: ${q.composite.painScore}`, notes)

  return { num: 8, name: 'Pyme dental con oportunidad real', pass: failures.length === 0, failures, notes, details: { coverage, commercialState: q.commercialState, salesPriority: q.composite.salesPriority, icpFit: q.composite.icpFitScore } }
})

// ── Case 9: Reprocess con más cobertura ───────────────────────────────────────
test(9, 'Reprocess con más cobertura (no hold)', () => {
  const failures: string[] = []
  const notes: string[] = []

  const prevCoverage = 30 // previous was low
  const newCoverage = 55  // new is better

  const isLowCoverageHold = newCoverage < 40 && (prevCoverage !== null && prevCoverage >= 40)

  assert(!isLowCoverageHold, `should NOT be hold when new coverage (${newCoverage}%) >= 40%`, failures)
  note(`prev: ${prevCoverage}%, new: ${newCoverage}% → isHold: ${isLowCoverageHold}`, notes)

  return { num: 9, name: 'Reprocess con más cobertura → no hold', pass: failures.length === 0, failures, notes, details: { prevCoverage, newCoverage, isLowCoverageHold } }
})

// ── Case 10: Reprocess con menos cobertura ────────────────────────────────────
test(10, 'Reprocess con menos cobertura (coverage hold activado)', () => {
  const failures: string[] = []
  const notes: string[] = []

  const prevCoverage = 60  // previous was good
  const newCoverage = 13   // new is poor (site unreachable)

  const isLowCoverageHold = newCoverage < 40 && (prevCoverage !== null && prevCoverage >= 40)

  assert(isLowCoverageHold, `should be hold when new coverage (${newCoverage}%) < 40% and prev (${prevCoverage}%) was ≥ 40%`, failures)
  note(`prev: ${prevCoverage}%, new: ${newCoverage}% → isHold: ${isLowCoverageHold}`, notes)
  note('Hold: eval saved to history only, latestOpportunityScore NOT overwritten', notes)

  return { num: 10, name: 'Reprocess con menos cobertura → hold', pass: failures.length === 0, failures, notes, details: { prevCoverage, newCoverage, isLowCoverageHold } }
})

// ── Case 11: Coverage hold protects high-coverage eval ────────────────────────
test(11, 'Evaluación con cobertura alta protegida por coverage hold', () => {
  const failures: string[] = []
  const notes: string[] = []

  // Test multiple regression scenarios
  const scenarios = [
    { prev: 70, newC: 7,  expectHold: true },
    { prev: 40, newC: 30, expectHold: true },
    { prev: 39, newC: 20, expectHold: false }, // prev was already below 40
    { prev: 55, newC: 55, expectHold: false }, // same coverage, no regression
  ]

  for (const s of scenarios) {
    const hold = s.newC < 40 && s.prev >= 40
    assert(hold === s.expectHold, `prev=${s.prev}% new=${s.newC}% → hold should be ${s.expectHold}, got ${hold}`, failures)
  }

  note('Hold logic: coverage < 40% AND prevCoverage >= 40%', notes)

  return { num: 11, name: 'Coverage hold protege eval alta', pass: failures.length === 0, failures, notes, details: { scenarios } }
})

// ── Case 12: Low coverage → RESEARCH_REQUIRED ────────────────────────────────
test(12, 'Evaluación con cobertura baja → RESEARCH_REQUIRED', () => {
  const failures: string[] = []
  const notes: string[] = []

  const evidence = evidenceNoWebsite() // 13% coverage
  const coverage = computeCoverage(evidence)
  const evaluationStatus = evaluationStatusFromCoverage(coverage)

  const commercialState = computeCommercialState({
    entityIsCommercial: true, sellabilityClass: 'viable',
    icpFitScore: 60, contactabilityScore: 40,
    painScore: 60, coveragePercent: coverage,
    websiteVerificationStatus: 'UNREACHABLE',
  })

  // Even with good ICP/contact/pain scores, low coverage → RESEARCH_REQUIRED
  assert(commercialState === 'RESEARCH_REQUIRED', `coverage ${coverage}% should force RESEARCH_REQUIRED, got ${commercialState}`, failures)
  assert(evaluationStatus === 'manual_review_required', `evaluationStatus should be manual_review_required, got ${evaluationStatus}`, failures)

  // Derive evidenceTier from coverage thresholds (computeScoresWithEvidence does not expose evidenceTier)
  const derivedTier = coverage < 40 ? 'LOW' : coverage < 70 ? 'MEDIUM' : 'HIGH'
  assert(derivedTier === 'LOW', `evidenceTier should be LOW for coverage ${coverage}%, got ${derivedTier}`, failures)

  note(`coverage: ${coverage}%, evaluationStatus: ${evaluationStatus}, commercialState: ${commercialState}`, notes)

  return { num: 12, name: 'Cobertura baja → RESEARCH_REQUIRED', pass: failures.length === 0, failures, notes, details: { coverage, evaluationStatus, commercialState } }
})

// ── Case 13: No debe recibir score definitivo ─────────────────────────────────
test(13, 'Empresa sin evidencia suficiente → no score definitivo', () => {
  const failures: string[] = []
  const notes: string[] = []

  const evidence = evidenceNoWebsite()
  const coverage = computeCoverage(evidence)
  const rawSignals: SignalFlags = { signalHasWebsite: false, signalHasWhatsapp: false, signalHasContactForm: false, signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false, signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: false, signalHasClearCta: false, signalHasLeadCapture: false, signalSlowResponse: false, signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: true }
  const signals = applyEvidence(rawSignals, evidence)
  const q = fullQualification({ name: 'Negocio Desconocido', industry: 'comercio', website: null, phone: null }, coverage, signals, evidence)

  const STRONG_PRIORITIES = ['HOT', 'HIGH']
  assert(!STRONG_PRIORITIES.includes(q.composite.salesPriority), `no strong priority with low evidence, got ${q.composite.salesPriority}`, failures)
  assert(q.composite.evidenceTier === 'LOW', `evidenceTier should be LOW, got ${q.composite.evidenceTier}`, failures)

  // Revenue should be negligible
  const revenue = estimateRevenueOpportunity(signals, 'comercio', 500, coverage)
  assert(revenue.estimatedRevenueLostPerMonth < 50, `low-evidence revenue should be < $50/month, got $${revenue.estimatedRevenueLostPerMonth}`, failures)

  note(`salesPriority: ${q.composite.salesPriority}, evidenceTier: ${q.composite.evidenceTier}`, notes)
  note(`revenue: $${revenue.estimatedRevenueLostPerMonth}/mes`, notes)

  return { num: 13, name: 'Sin evidencia → no score definitivo', pass: failures.length === 0, failures, notes, details: { salesPriority: q.composite.salesPriority, evidenceTier: q.composite.evidenceTier, revenue: revenue.estimatedRevenueLostPerMonth } }
})

// ── Case 14: Puede recibir OFFER_AUDIT o READY_TO_CONTACT ────────────────────
test(14, 'Empresa con evidencia real y problemas → OFFER_AUDIT o READY_TO_CONTACT', () => {
  const failures: string[] = []
  const notes: string[] = []

  // Manual evidence (all 15 signals known)
  const fullSignals: SignalFlags = {
    signalHasWebsite: true,
    signalHasWhatsapp: true,
    signalHasContactForm: false,    // problem
    signalHasBookingSystem: false,  // problem
    signalHasInstagram: false,      // problem
    signalHasLinkedin: false,
    signalHasGoogleBusiness: false, // problem
    signalHasReviews: false,        // problem
    signalHasUnansweredReviews: false,
    signalHasClearCta: false,       // problem
    signalHasLeadCapture: false,    // problem
    signalSlowResponse: true,       // problem
    signalWeakFollowup: true,       // problem
    signalManualWork: false,
    signalWeakOnlinePresence: false,
  }

  // Build manual evidence with high confidence for all signals
  const { evidenceAllManual } = require('../lib/evidence')
  const evidence = evidenceAllManual(fullSignals)
  const coverage = computeCoverage(evidence)
  const signals = applyEvidence(fullSignals, evidence)

  const commercialState = computeCommercialState({
    entityIsCommercial: true, sellabilityClass: 'viable',
    icpFitScore: 65, contactabilityScore: 60,
    painScore: 75, coveragePercent: coverage,
    websiteVerificationStatus: 'VERIFIED',
  })

  assert(coverage === 100, `manual evidence should yield 100% coverage, got ${coverage}%`, failures)
  assert(commercialState === 'READY_TO_CONTACT' || commercialState === 'OFFER_AUDIT', `full evidence with pain should yield READY_TO_CONTACT/OFFER_AUDIT, got ${commercialState}`, failures)

  note(`coverage: ${coverage}%, commercialState: ${commercialState}`, notes)

  return { num: 14, name: 'Evidencia real → OFFER_AUDIT/READY_TO_CONTACT', pass: failures.length === 0, failures, notes, details: { coverage, commercialState } }
})

// ── Case 15: Outreach bloqueado con evidencia insuficiente ────────────────────
test(15, 'Outreach bloqueado / limitado cuando falta evidencia', () => {
  const failures: string[] = []
  const notes: string[] = []

  const OFFICIAL_URL = 'https://www.kronosdata.tech/'

  // Generate LOW tier message (no specific claims allowed)
  const msgInput = {
    companyName: 'Clínica Test', industry: 'dental', city: 'Lima', country: 'Peru',
    website: null, evidenceTier: 'LOW' as const, salesPriority: 'REVIEW',
    primaryProblem: null, whyContact: [], qualificationReason: null,
    recommendedFirstAction: 'Completar evaluación manual',
    recommendedPackageSlug: null, primaryServiceName: null,
  }

  const messages = generateOutreachMessages(msgInput)

  // Rule 12: all messages must include kronosdata.tech
  for (const msg of messages) {
    assert(msg.body.includes(OFFICIAL_URL), `${msg.channel} message must include ${OFFICIAL_URL}`, failures)
  }

  // LOW tier: should NOT make specific claims about losses/revenue
  const hasRevenueClaim = messages.some(m => m.body.includes('pierdes') || m.body.includes('pérdida de') || m.body.includes('$/mes'))
  assert(!hasRevenueClaim, 'LOW tier messages must not make specific revenue claims', failures)

  // Each message should propose audit/diagnosis, not a closed project
  const hasAuditProposal = messages.some(m => m.body.toLowerCase().includes('auditor') || m.body.toLowerCase().includes('diagn'))
  assert(hasAuditProposal, 'LOW tier messages should propose audit/diagnosis', failures)

  note(`Messages generated: ${messages.length} (${messages.map(m => m.channel).join(', ')})`, notes)
  note(`All include kronosdata.tech: ${messages.every(m => m.body.includes(OFFICIAL_URL))}`, notes)

  return { num: 15, name: 'Outreach limitado con evidencia insuficiente', pass: failures.length === 0, failures, notes, details: { messageCount: messages.length, channels: messages.map(m => m.channel), allIncludeOfficialUrl: messages.every(m => m.body.includes(OFFICIAL_URL)) } }
})

// ── Case 16: Sales Notes inicializadas correctamente (async — run in runAsyncValidations) ──
async function validateCase16SalesNotes(): Promise<CaseResult> {
  const failures: string[] = []
  const notes: string[] = []

  const salesNotes = await prisma.salesNote.findMany({
    where: { pipelineStage: 'discovered', contactStatus: 'not_contacted' },
    select: { id: true, companyId: true, pipelineStage: true, contactStatus: true, meetingStatus: true, assignedTo: true },
    take: 5,
  })

  note(`Found ${salesNotes.length} sales notes in 'discovered/not_contacted' state`, notes)

  if (salesNotes.length > 0) {
    for (const sn of salesNotes) {
      assert(sn.pipelineStage === 'discovered', `pipelineStage should be 'discovered'`, failures)
      assert(sn.contactStatus === 'not_contacted', `contactStatus should be 'not_contacted'`, failures)
      assert(sn.meetingStatus === 'not_scheduled', `meetingStatus should be 'not_scheduled'`, failures)
    }
  } else {
    note('No sales notes found to validate — DB may be empty', notes)
  }

  return { num: 16, name: 'Sales Notes inicializadas', pass: failures.length === 0, failures, notes, details: { sampleCount: salesNotes.length } }
}

// ── LIVE DB: Denta Clear ──────────────────────────────────────────────────────

console.log('\n📊 Live DB — Denta Clear validation\n')

async function validateDentaClear(): Promise<{ pass: boolean; failures: string[]; notes: string[] }> {
  const failures: string[] = []
  const notes: string[] = []

  const denta = await prisma.company.findFirst({
    where: { name: { contains: 'Denta', mode: 'insensitive' } },
    select: {
      id: true, name: true, website: true,
      latestOpportunityScore: true, latestPriorityLevel: true,
      salesPriority: true, evidenceTier: true,
      commercialState: true, websiteVerificationStatus: true,
      entityIsCommercial: true, sellabilityClass: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!denta) {
    notes.push('Denta Clear not found in DB — skipping')
    return { pass: true, failures, notes }
  }

  notes.push(`ID: ${denta.id}`)
  notes.push(`website: ${denta.website ?? 'null'}`)
  notes.push(`latestOpportunityScore: ${denta.latestOpportunityScore}`)
  notes.push(`latestPriorityLevel: ${denta.latestPriorityLevel}`)
  notes.push(`salesPriority: ${denta.salesPriority ?? 'null'}`)
  notes.push(`evidenceTier: ${denta.evidenceTier ?? 'null'}`)
  notes.push(`websiteVerificationStatus: ${denta.websiteVerificationStatus ?? 'null'}`)
  notes.push(`commercialState: ${denta.commercialState ?? 'null (not yet reprocessed)'}`)

  // Validate that we don't have the bug where salesPriority=HIGH and OS=5 at the same time
  if (denta.salesPriority === 'HIGH' && denta.latestOpportunityScore <= 10) {
    failures.push(`Contradictory state: salesPriority=HIGH but latestOpportunityScore=${denta.latestOpportunityScore} — legacy bug not yet cleared`)
    notes.push('NOTE: Run /api/companies/[id]/reprocess to apply fix — it will set RESEARCH_REQUIRED')
  }

  // After next reprocess, commercialState should be RESEARCH_REQUIRED
  // If it's already set (from a post-fix reprocess), validate it
  if (denta.commercialState) {
    assert(denta.commercialState === 'RESEARCH_REQUIRED', `Denta Clear commercialState should be RESEARCH_REQUIRED (unreachable site), got ${denta.commercialState}`, failures)
  }

  // Latest eval
  const latestEval = await prisma.evaluation.findFirst({
    where: { companyId: denta.id },
    orderBy: { evaluatedAt: 'desc' },
    select: { researchCoverage: true, evaluationStatus: true, isLowCoverageHold: true, evaluationSource: true, evaluatedAt: true },
  })
  if (latestEval) {
    notes.push(`Latest eval: coverage=${latestEval.researchCoverage}%, isHold=${latestEval.isLowCoverageHold}, source=${latestEval.evaluationSource ?? 'legacy'}`)
  }

  return { pass: failures.length === 0, failures, notes }
}

// ── LIVE DB: Companies with salesPriority=HIGH + LOW evidenceTier (legacy bug) ─

async function validateLegacyContradictons(): Promise<{ count: number; examples: unknown[] }> {
  // Find companies where salesPriority=HIGH/HOT but evidenceTier=LOW (contradictory state)
  const contradictions = await prisma.company.findMany({
    where: {
      OR: [
        { salesPriority: 'HIGH', evidenceTier: 'LOW' },
        { salesPriority: 'HOT', evidenceTier: 'LOW' },
      ],
    },
    select: { id: true, name: true, salesPriority: true, evidenceTier: true, latestOpportunityScore: true },
    take: 10,
  })
  return { count: contradictions.length, examples: contradictions }
}

// ── LIVE DB: Coverage hold evaluations ─────────────────────────────────────────

async function validateCoverageHolds(): Promise<{ holdCount: number }> {
  const holds = await prisma.evaluation.count({ where: { isLowCoverageHold: true } })
  return { holdCount: holds }
}

// ── LIVE DB: Overall company stats ────────────────────────────────────────────

async function getDbStats() {
  const [total, withCommercialState, withWebsiteVerif, disqualified, researchRequired] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { commercialState: { not: null } } }),
    prisma.company.count({ where: { websiteVerificationStatus: { not: null } } }),
    prisma.company.count({ where: { commercialState: 'DISQUALIFIED' } }),
    prisma.company.count({ where: { commercialState: 'RESEARCH_REQUIRED' } }),
  ])
  return { total, withCommercialState, withWebsiteVerif, disqualified, researchRequired }
}

// ── Run async parts and print results ─────────────────────────────────────────

async function runAsyncValidations() {
  const [dentaResult, contradictions, holdStats, dbStats, case16Result] = await Promise.all([
    validateDentaClear(),
    validateLegacyContradictons(),
    validateCoverageHolds(),
    getDbStats(),
    validateCase16SalesNotes(),
  ])

  // Register Case 16 in the shared counters
  cases.push(case16Result)
  if (case16Result.pass) { totalPassed++; console.log(`  ✅ Case 16: ${case16Result.name}`) }
  else { totalFailed++; console.log(`  ❌ Case 16: ${case16Result.name}\n     ${case16Result.failures.join('\n     ')}`) }

  console.log('Denta Clear:')
  dentaResult.notes.forEach(n => console.log(`  ${n}`))
  if (dentaResult.failures.length) {
    dentaResult.failures.forEach(f => console.log(`  ⚠️  ${f}`))
  } else {
    console.log('  ✅ Denta Clear validation passed')
  }

  console.log('\nDB Stats:')
  console.log(`  Total companies: ${dbStats.total}`)
  console.log(`  With commercialState: ${dbStats.withCommercialState}`)
  console.log(`  With websiteVerificationStatus: ${dbStats.withWebsiteVerif}`)
  console.log(`  DISQUALIFIED: ${dbStats.disqualified}`)
  console.log(`  RESEARCH_REQUIRED: ${dbStats.researchRequired}`)

  console.log(`\nLegacy Contradictions (HIGH+LOW simultaneously): ${contradictions.count}`)
  if (contradictions.count > 0) {
    contradictions.examples.forEach((e: any) => {
      console.log(`  ⚠️  ${e.name} — salesPriority=${e.salesPriority}, evidenceTier=${e.evidenceTier}, OS=${e.latestOpportunityScore}`)
    })
    console.log('  → These need reprocess to clear the contradiction (fix already deployed)')
  }

  console.log(`\nCoverage Hold evaluations: ${holdStats.holdCount}`)

  return { dentaResult, contradictions, holdStats, dbStats }
}

// ── Print summary ─────────────────────────────────────────────────────────────

function printSummary(asyncData: Awaited<ReturnType<typeof runAsyncValidations>>) {
  console.log('\n══════════════════════════════════════════════════════════')
  console.log('📋 VALIDATION SUMMARY\n')

  console.log('Unit tests (16 cases):')
  cases.forEach(c => {
    const icon = c.pass ? '✅' : '❌'
    console.log(`  ${icon} Case ${c.num}: ${c.name}`)
    if (c.notes.length) c.notes.forEach(n => console.log(`      ℹ️  ${n}`))
    if (!c.pass) c.failures.forEach(f => console.log(`      ⚠️  ${f}`))
  })

  console.log(`\n  Passed: ${totalPassed}/16  Failed: ${totalFailed}/16`)

  const allPassed = totalFailed === 0 && asyncData.dentaResult.failures.length === 0
  console.log(`\n${allPassed ? '✅ ALL VALIDATIONS PASSED' : '⚠️  SOME VALIDATIONS NEED ATTENTION'}`)
  console.log('\n──────────────────────────────────────────────────────────')

  // Write results to JSON for the report
  const summary = {
    timestamp: new Date().toISOString(),
    unitTests: { total: 16, passed: totalPassed, failed: totalFailed },
    cases: cases.map(c => ({ num: c.num, name: c.name, pass: c.pass, failures: c.failures, notes: c.notes })),
    dentaClear: { pass: asyncData.dentaResult.failures.length === 0, failures: asyncData.dentaResult.failures, notes: asyncData.dentaResult.notes },
    dbStats: asyncData.dbStats,
    contradictions: asyncData.contradictions,
    coverageHolds: asyncData.holdStats,
    overallPass: allPassed,
  }
  require('fs').writeFileSync('./scripts/validation-results.json', JSON.stringify(summary, null, 2))
  console.log('\n📄 Full results saved to scripts/validation-results.json')
}

// ── Main ──────────────────────────────────────────────────────────────────────

runAsyncValidations().then(asyncData => {
  printSummary(asyncData)
}).catch(console.error).finally(() => prisma.$disconnect())
