// Validation script for the v2 Prospect Signal Engine.
// Run with: npx ts-node --project tsconfig.scripts.json scripts/validate-prospect-signal-engine.ts

import { computeProspectSignals } from '../lib/signal-engine'
import type { ProspectSignalInput } from '../lib/signal-engine'

// Minimal evidence helper
function ev(status: 'positive' | 'negative' | 'unknown', source = 'test') {
  return { status, source, confidence: 'medium' as const }
}

const noEvidence: ProspectSignalInput['evidence'] = {}

const allNegative: ProspectSignalInput['evidence'] = {
  signalHasWebsite:           { status: 'negative', source: 'web_analysis',  confidence: 'high' },
  signalHasWhatsapp:          { status: 'negative', source: 'web_analysis',  confidence: 'high' },
  signalHasClearCta:          { status: 'negative', source: 'web_analysis',  confidence: 'high' },
  signalHasBookingSystem:     { status: 'negative', source: 'web_analysis',  confidence: 'high' },
  signalHasGoogleBusiness:    { status: 'negative', source: 'web_analysis',  confidence: 'high' },
  signalHasUnansweredReviews: { status: 'positive', source: 'web_analysis',  confidence: 'high' },
  signalWeakOnlinePresence:   { status: 'positive', source: 'web_analysis',  confidence: 'high' },
}

const allPositive: ProspectSignalInput['evidence'] = {
  signalHasWebsite:       { status: 'positive', source: 'web_analysis', confidence: 'high' },
  signalHasWhatsapp:      { status: 'positive', source: 'web_analysis', confidence: 'high' },
  signalHasClearCta:      { status: 'positive', source: 'web_analysis', confidence: 'high' },
  signalHasBookingSystem: { status: 'positive', source: 'web_analysis', confidence: 'high' },
  signalHasGoogleBusiness:{ status: 'positive', source: 'web_analysis', confidence: 'high' },
}

const BASE: Omit<ProspectSignalInput, 'evidence' | 'evidenceCoverage' | 'isCommercial'> = {
  name: 'Test Company',
  industry: 'Clínica Dental',
  country: 'Peru',
  city: 'Lima',
  website: 'https://test.com',
  entityType: null,
  entityExclusionReason: null,
  websiteVerificationStatus: 'VERIFIED',
  hasPhone: true,
  hasWhatsapp: true,
  hasEmail: false,
  hasInstagram: false,
  hasLinkedin: false,
}

interface TestCase {
  name: string
  input: ProspectSignalInput
  expect: {
    commercialState?: string
    icpFitScoreMin?: number
    icpFitScoreMax?: number
    visibleSymptomsScoreMin?: number
    visibleSymptomsScoreMax?: number
    contactabilityScoreMin?: number
    disqualified?: boolean
    hasSymptoms?: boolean
    noSymptoms?: boolean
    hasAuditHook?: boolean
  }
}

const TESTS: TestCase[] = [
  {
    name: '1. Non-commercial entity → DISQUALIFIED, no symptoms, icpFit low',
    input: {
      ...BASE,
      isCommercial: false,
      entityType: 'government_entity',
      entityExclusionReason: 'Entidad gubernamental',
      evidence: noEvidence,
      evidenceCoverage: 0,
    },
    expect: {
      commercialState: 'DISQUALIFIED',
      disqualified: true,
      noSymptoms: true,
    },
  },
  {
    name: '2. ICP = 0 (unknown industry) → DISQUALIFIED',
    input: {
      ...BASE,
      industry: 'Industria Desconocida XYZ',
      isCommercial: true,
      evidence: allNegative,
      evidenceCoverage: 80,
    },
    expect: {
      commercialState: 'DISQUALIFIED',
      icpFitScoreMax: 14,
    },
  },
  {
    name: '3. All positive evidence, high ICP → no symptoms (everything present)',
    input: {
      ...BASE,
      isCommercial: true,
      evidence: allPositive,
      evidenceCoverage: 90,
    },
    expect: {
      noSymptoms: true,
      icpFitScoreMin: 50,
    },
  },
  {
    name: '4. All negative evidence, good ICP → OFFER_AUDIT with symptoms',
    input: {
      ...BASE,
      isCommercial: true,
      evidence: allNegative,
      evidenceCoverage: 80,
    },
    expect: {
      commercialState: 'OFFER_AUDIT',
      hasSymptoms: true,
      hasAuditHook: true,
      icpFitScoreMin: 40,
    },
  },
  {
    name: '5. Zero coverage → RESEARCH_REQUIRED (not enough data)',
    input: {
      ...BASE,
      isCommercial: true,
      evidence: noEvidence,
      evidenceCoverage: 0,
      hasWhatsapp: false,
      hasPhone: false,
      hasEmail: false,
    },
    expect: {
      commercialState: 'RESEARCH_REQUIRED',
    },
  },
  {
    name: '6. Verified website with no CTA and unanswered reviews → symptoms detected',
    input: {
      ...BASE,
      isCommercial: true,
      evidence: {
        signalHasWebsite:           { status: 'positive', source: 'web_analysis', confidence: 'high' },
        signalHasClearCta:          { status: 'negative', source: 'web_analysis', confidence: 'high' },
        signalHasUnansweredReviews: { status: 'positive', source: 'web_analysis', confidence: 'high' },
        signalHasWhatsapp:          { status: 'positive', source: 'web_analysis', confidence: 'high' },
      },
      evidenceCoverage: 60,
    },
    expect: {
      hasSymptoms: true,
      visibleSymptomsScoreMin: 20,
    },
  },
  {
    name: '7. MISMATCH website verification → signalHasWebsite treated as unknown',
    input: {
      ...BASE,
      isCommercial: true,
      websiteVerificationStatus: 'MISMATCH',
      evidence: {
        signalHasWebsite: { status: 'positive', source: 'web_analysis', confidence: 'high' },
        signalHasClearCta: { status: 'negative', source: 'web_analysis', confidence: 'high' },
      },
      evidenceCoverage: 40,
    },
    expect: {
      hasSymptoms: true, // websiteMismatch symptom
    },
  },
  {
    name: '8. Denta Clear profile: dental clinic, good contactability, no booking → OFFER_AUDIT',
    input: {
      name: 'Denta Clear',
      industry: 'Clínica Dental',
      country: 'Peru',
      city: 'Lima',
      website: 'https://dentaclear.pe',
      isCommercial: true,
      entityType: null,
      entityExclusionReason: null,
      evidenceCoverage: 70,
      websiteVerificationStatus: 'VERIFIED',
      hasPhone: true,
      hasWhatsapp: true,
      hasEmail: false,
      hasInstagram: true,
      hasLinkedin: false,
      evidence: {
        signalHasWebsite:       { status: 'positive', source: 'web_analysis', confidence: 'high' },
        signalHasBookingSystem: { status: 'negative', source: 'web_analysis', confidence: 'high' },
        signalHasClearCta:      { status: 'negative', source: 'web_analysis', confidence: 'medium' },
        signalHasWhatsapp:      { status: 'positive', source: 'web_analysis', confidence: 'high' },
        signalHasGoogleBusiness:{ status: 'positive', source: 'web_analysis', confidence: 'high' },
        signalHasReviews:       { status: 'positive', source: 'web_analysis', confidence: 'medium' },
      },
    },
    expect: {
      commercialState: 'OFFER_AUDIT',
      icpFitScoreMin: 60,
      hasSymptoms: true,
      hasAuditHook: true,
      contactabilityScoreMin: 50,
    },
  },
]

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}

let passed = 0
let failed = 0

for (const t of TESTS) {
  try {
    const result = computeProspectSignals(t.input)
    const e = t.expect

    if (e.commercialState !== undefined)
      assert(result.commercialState === e.commercialState,
        `${t.name} — expected commercialState=${e.commercialState}, got=${result.commercialState}`)

    if (e.disqualified !== undefined)
      assert((result.commercialState === 'DISQUALIFIED') === e.disqualified,
        `${t.name} — expected disqualified=${e.disqualified}`)

    if (e.icpFitScoreMin !== undefined)
      assert(result.icpFitScore >= e.icpFitScoreMin,
        `${t.name} — expected icpFitScore>=${e.icpFitScoreMin}, got=${result.icpFitScore}`)

    if (e.icpFitScoreMax !== undefined)
      assert(result.icpFitScore <= e.icpFitScoreMax,
        `${t.name} — expected icpFitScore<=${e.icpFitScoreMax}, got=${result.icpFitScore}`)

    if (e.visibleSymptomsScoreMin !== undefined)
      assert(result.visibleSymptomsScore >= e.visibleSymptomsScoreMin,
        `${t.name} — expected visibleSymptomsScore>=${e.visibleSymptomsScoreMin}, got=${result.visibleSymptomsScore}`)

    if (e.visibleSymptomsScoreMax !== undefined)
      assert(result.visibleSymptomsScore <= e.visibleSymptomsScoreMax,
        `${t.name} — expected visibleSymptomsScore<=${e.visibleSymptomsScoreMax}, got=${result.visibleSymptomsScore}`)

    if (e.contactabilityScoreMin !== undefined)
      assert(result.contactabilityScore >= e.contactabilityScoreMin,
        `${t.name} — expected contactabilityScore>=${e.contactabilityScoreMin}, got=${result.contactabilityScore}`)

    if (e.hasSymptoms)
      assert(result.confirmedSymptoms.length > 0,
        `${t.name} — expected symptoms but got none`)

    if (e.noSymptoms)
      assert(result.confirmedSymptoms.length === 0,
        `${t.name} — expected no symptoms but got ${result.confirmedSymptoms.map(s => s.key).join(',')}`)

    if (e.hasAuditHook)
      assert(result.auditHook !== null && result.auditHook.length > 0,
        `${t.name} — expected auditHook but got null/empty`)

    console.log(`  PASS  ${t.name}`)
    console.log(`        state=${result.commercialState} icp=${result.icpFitScore} symptoms=${result.visibleSymptomsScore} contact=${result.contactabilityScore} aps=${result.auditPriorityScore} symptoms=[${result.confirmedSymptoms.map(s=>s.key).join(',')}]`)
    passed++
  } catch (err) {
    console.error(`  FAIL  ${t.name}`)
    console.error(`        ${err instanceof Error ? err.message : String(err)}`)
    failed++
  }
}

console.log(`\n${passed}/${TESTS.length} passed, ${failed} failed.\n`)
if (failed > 0) process.exit(1)
