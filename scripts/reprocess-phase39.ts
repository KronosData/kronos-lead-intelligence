// Reprocesses all existing companies with Phase 3.9 qualification pipeline.
// Run: npx tsx --tsconfig tsconfig.json scripts/reprocess-phase39.ts
// Uses tsconfig-paths to resolve @/* aliases.

import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg }     from '@prisma/adapter-pg'
import { classifyEntity }             from '../lib/qualification/entity-classifier'
import { computeRoiFit }              from '../lib/qualification/roi-fit'
import { computeBudgetCapacity }      from '../lib/qualification/budget-capacity'
import { evaluateCommercialGate }     from '../lib/qualification/commercial-gate'
import { computeSalesQualificationScore } from '../lib/qualification/sales-qualification'
import { getIndustryProfile }         from '../lib/economics/industry-models'
import { computeProspectFitScore }    from '../lib/prospecting/prospect-fit'
import { estimateBusinessSizeFromDiscovery } from '../lib/prospecting/business-size'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function reprocessCompany(company: {
  id: string; name: string; industry: string; website: string | null;
  city: string | null; country: string; whatsapp: string | null;
  estimatedBusinessSize: string | null;
}) {
  const hasPhone  = !!company.whatsapp
  const bsResult  = estimateBusinessSizeFromDiscovery(
    company.name, company.website, company.industry, 0, 0,
  )
  const pfsResult = computeProspectFitScore({
    name: company.name, industry: company.industry,
    website: company.website, phone: hasPhone ? company.whatsapp : null,
    address: company.city ?? '', businessSize: bsResult,
  })
  const entityClass   = classifyEntity(company.name, company.industry, company.city ?? undefined, company.website)
  const roiFit        = computeRoiFit({
    industry: company.industry, name: company.name,
    businessSize: bsResult.size, hasWebsite: !!company.website,
    isCommerciallyViable: entityClass.isCommerciallyViable,
  })
  const budgetCap     = computeBudgetCapacity({
    industry: company.industry, name: company.name,
    businessSize: bsResult.size, hasWebsite: !!company.website, hasPhone,
  })
  const gate          = evaluateCommercialGate({
    entityType: entityClass.entityType, isCommerciallyViable: entityClass.isCommerciallyViable,
    hasContact: !!(company.website || hasPhone),
    hasOpportunity: pfsResult.opportunityVisibleRaw >= 30,
    roiFitLabel: roiFit.label, budgetCapacityLabel: budgetCap.label,
  })
  const industryProfile = getIndustryProfile(company.industry, company.name)
  const sqsResult     = computeSalesQualificationScore({
    pfsScore: pfsResult.score, opportunityRaw: pfsResult.opportunityVisibleRaw,
    contactabilityRaw: pfsResult.contactabilityRaw, evidenceQualityRaw: pfsResult.evidenceQualityRaw,
    roiFit, budgetCapacity: budgetCap, commercialGate: gate,
    entityClass, industryProfile, hasWebsite: !!company.website, hasPhone,
    opportunityReasons: pfsResult.opportunityReasons, prospectRisks: pfsResult.prospectRisks,
  })

  await prisma.company.update({
    where: { id: company.id },
    data: {
      entityType:              entityClass.entityType,
      entityIsCommercial:      entityClass.isCommerciallyViable,
      entityExclusionReason:   entityClass.exclusionReason,
      commercialQualification: gate.qualification,
      salesQualificationScore: sqsResult.score,
      sellabilityClass:        sqsResult.sellabilityClass,
      roiFitScore:             roiFit.score,
      roiFitLabel:             roiFit.label,
      roiMultiple:             roiFit.roiMultiple,
      paybackMonths:           roiFit.paybackMonths,
      budgetCapacityScore:     budgetCap.score,
      budgetCapacityLabel:     budgetCap.label,
      economicModelType:       sqsResult.economicModelType,
      primaryProblem:          sqsResult.primaryProblem,
      whyContact:              sqsResult.whyContact,
      whyNotContact:           sqsResult.whyNotContact,
      qualificationQuestions:  sqsResult.qualificationQuestions,
      prospectFitScore:        pfsResult.score,
      prospectProfile:         pfsResult.profile,
      contactabilityScore:     pfsResult.contactabilityScore,
      opportunityReasons:      pfsResult.opportunityReasons,
      prospectRisks:           pfsResult.prospectRisks,
      estimatedBusinessSize:   bsResult.size,
      businessSizeConfidence:  bsResult.confidence,
      chainDetected:           bsResult.chainDetected,
    },
  })

  return {
    name:                    company.name,
    entityType:              entityClass.entityType,
    isCommercial:            entityClass.isCommerciallyViable,
    exclusionReason:         entityClass.exclusionReason,
    sqs:                     sqsResult.score,
    sellability:             sqsResult.sellabilityClass,
    roi:                     roiFit.label,
    budget:                  budgetCap.label,
    qualification:           gate.qualification,
  }
}

async function main() {
  const companies = await prisma.company.findMany({
    select: {
      id: true, name: true, industry: true, website: true,
      city: true, country: true, whatsapp: true, estimatedBusinessSize: true,
    },
  })

  console.log(`\nReprocessing ${companies.length} companies with Phase 3.9 qualification...\n`)

  const results = []
  for (const co of companies) {
    const result = await reprocessCompany(co)
    results.push(result)
    const icon = result.isCommercial ? '✅' : '❌'
    console.log(`${icon} ${result.name}`)
    console.log(`   Entity: ${result.entityType} | SQS: ${result.sqs} | ${result.sellability}`)
    console.log(`   ROI: ${result.roi} | Budget: ${result.budget} | ${result.qualification}`)
    if (result.exclusionReason) console.log(`   ⚠ ${result.exclusionReason}`)
    console.log()
  }

  const commercial    = results.filter(r => r.isCommercial).length
  const nonCommercial = results.filter(r => !r.isCommercial).length
  const sellNow       = results.filter(r => r.sellability === 'sell_now').length
  const diagnosis     = results.filter(r => r.sellability === 'contact_diagnosis').length

  console.log('─'.repeat(50))
  console.log(`Total: ${results.length}`)
  console.log(`Comerciales: ${commercial} | No-comerciales: ${nonCommercial}`)
  console.log(`Sell now: ${sellNow} | Diagnóstico: ${diagnosis}`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
