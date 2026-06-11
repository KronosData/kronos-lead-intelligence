import { computeScores } from '../lib/scoring'
import { generateDiagnosis } from '../lib/diagnosis'
import { matchServices } from '../lib/service-match'
import { estimateRevenueOpportunity } from '../lib/value-estimator'
import type { SignalFlags } from '../lib/types'

const allProblems: SignalFlags = {
  signalHasWebsite: false, signalHasWhatsapp: false, signalHasContactForm: false,
  signalHasBookingSystem: false, signalHasInstagram: false, signalHasLinkedin: false,
  signalHasGoogleBusiness: false, signalHasReviews: false, signalHasUnansweredReviews: true,
  signalHasClearCta: false, signalHasLeadCapture: false, signalSlowResponse: true,
  signalWeakFollowup: true, signalManualWork: true, signalWeakOnlinePresence: true,
}

const allGood: SignalFlags = {
  signalHasWebsite: true, signalHasWhatsapp: true, signalHasContactForm: true,
  signalHasBookingSystem: true, signalHasInstagram: true, signalHasLinkedin: true,
  signalHasGoogleBusiness: true, signalHasReviews: true, signalHasUnansweredReviews: false,
  signalHasClearCta: true, signalHasLeadCapture: true, signalSlowResponse: false,
  signalWeakFollowup: false, signalManualWork: false, signalWeakOnlinePresence: false,
}

console.log('=== ENGINE LOGIC TESTS ===\n')

// T1: Max score
const s1 = computeScores(allProblems)
console.log('T1 All-problems score:', s1.opportunityScore, '| priority:', s1.priorityLevel)

// T2: Zero score
const s2 = computeScores(allGood)
console.log('T2 All-good score:', s2.opportunityScore, '| priority:', s2.priorityLevel)

// T3: Weight sum
const weights = [0.25, 0.25, 0.20, 0.15, 0.10, 0.05]
const wsum = weights.reduce((a, b) => a + b, 0)
console.log('T3 Weight sum:', wsum, wsum === 1.0 ? '✓' : '❌ BUG')

// T4: Diagnosis value range — low score (< 40)
const d4 = generateDiagnosis(allGood, 'Dental', 25)
const bug4 = d4.estimatedValueMin > d4.estimatedValueMax
console.log(`T4 Low score (25) value: min=${d4.estimatedValueMin} max=${d4.estimatedValueMax}`, bug4 ? '❌ BUG: min > max' : '✓')

// T5: Diagnosis value range — medium score (40-59)
const d5 = generateDiagnosis(allProblems, 'Consultoría', 46)
const bug5 = d5.estimatedValueMin > d5.estimatedValueMax
console.log(`T5 Medium score (46) value: min=${d5.estimatedValueMin} max=${d5.estimatedValueMax}`, bug5 ? '❌ BUG: min > max' : '✓')

// T6: Diagnosis value range — high score (60-79)
const d6 = generateDiagnosis(allProblems, 'Dental', 62)
const bug6 = d6.estimatedValueMin > d6.estimatedValueMax
console.log(`T6 High score (62) value: min=${d6.estimatedValueMin} max=${d6.estimatedValueMax}`, bug6 ? '❌ BUG: min > max' : '✓')

// T7: Diagnosis value range — hot score (>= 80)
const d7 = generateDiagnosis(allProblems, 'Inmobiliaria', 87)
const bug7 = d7.estimatedValueMin > d7.estimatedValueMax
console.log(`T7 Hot score (87) value: min=${d7.estimatedValueMin} max=${d7.estimatedValueMax}`, bug7 ? '❌ BUG: min > max' : '✓')

// T8: Service match — all problems → all 10 services
const sm8 = matchServices(allProblems)
console.log('T8 All-problems service count:', sm8.recommendedServices.length, sm8.recommendedServices.length === 10 ? '✓' : '❌ expected 10')

// T9: Service match — all good → 0 services
const sm9 = matchServices(allGood)
console.log('T9 All-good service count:', sm9.recommendedServices.length, sm9.recommendedServices.length === 0 ? '✓' : '❌ expected 0')

// T10: Revenue module — zero project price (division by zero guard)
const r10 = estimateRevenueOpportunity(allProblems, 'Dental', 0)
const bug10 = !isFinite(r10.estimatedRoiPotential)
console.log('T10 Zero project price ROI:', r10.estimatedRoiPotential, bug10 ? '❌ BUG: Infinity/NaN' : '✓')

// T11: Revenue loss rate cap at 80%
const r11 = estimateRevenueOpportunity(allProblems, 'Dental', 1000)
const leadsMax = 80 // 80 monthly contacts × 80% cap = 64
console.log('T11 Max loss rate leads/month:', r11.estimatedLeadsLostPerMonth, r11.estimatedLeadsLostPerMonth <= leadsMax ? '✓ capped' : '❌ over cap')

// T12: Seed data consistency check — Consultora Digital Nexo (score=46)
const expectedMax = Math.round(3500 * 0.50) // medium multiplier
console.log(`T12 Expected estimatedValueMax for score=46: ${expectedMax}`)
console.log('    Seed value used: 875 (hardcoded)', 875 === expectedMax ? '✓ correct' : `❌ BUG: seed has 875, should be ${expectedMax}`)

console.log('\n=== TEST COMPLETE ===')
