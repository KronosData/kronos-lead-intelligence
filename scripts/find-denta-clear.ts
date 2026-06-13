// Script: find Denta Clear in DB
import 'dotenv/config'
import { prisma } from '../lib/db'

async function main() {
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
}

main().finally(() => prisma.$disconnect())
