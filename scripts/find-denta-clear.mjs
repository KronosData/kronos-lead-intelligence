// Script: find Denta Clear in DB and reprocess it via the local API

import { PrismaClient } from '../app/generated/prisma/index.js'

const prisma = new PrismaClient()

const companies = await prisma.company.findMany({
  where: { name: { contains: 'Denta', mode: 'insensitive' } },
  select: {
    id: true, name: true, website: true,
    latestOpportunityScore: true, latestPriorityLevel: true,
    salesPriority: true, evidenceTier: true,
    commercialState: true, websiteVerificationStatus: true,
  },
  take: 10,
})

console.log('Denta-family companies in DB:')
console.log(JSON.stringify(companies, null, 2))

await prisma.$disconnect()
