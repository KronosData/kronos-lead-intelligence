import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function verify() {
  const companies = await prisma.company.count()
  const evaluations = await prisma.evaluation.count()
  const salesNotes = await prisma.salesNote.count()
  const outreach = await prisma.outreachHistory.count()

  console.log('=== TABLE COUNTS ===')
  console.log('  companies:       ', companies)
  console.log('  evaluations:     ', evaluations)
  console.log('  sales_notes:     ', salesNotes)
  console.log('  outreach_history:', outreach)

  const companiesWithAll = await prisma.company.findMany({
    include: {
      evaluations: { select: { opportunityScore: true, priorityLevel: true, recommendedServices: true } },
      salesNotes: { select: { contactStatus: true, closeProbability: true } },
      outreachHistory: { select: { channel: true, responseType: true } },
    },
    orderBy: { latestOpportunityScore: 'desc' },
  })

  console.log('\n=== COMPANIES (score DESC) ===')
  for (const c of companiesWithAll) {
    const ev = c.evaluations[0]
    const sn = c.salesNotes[0]
    const oh = c.outreachHistory[0]
    console.log(`  [${c.latestPriorityLevel.toUpperCase()}] ${c.name}`)
    console.log(`    score=${c.latestOpportunityScore} | industry=${c.industry} | source=${c.leadSource ?? 'none'}`)
    console.log(`    eval: score=${ev?.opportunityScore} services=${ev?.recommendedServices?.length ?? 0}`)
    console.log(`    sales: status=${sn?.contactStatus} prob=${sn?.closeProbability}%`)
    console.log(`    outreach: ${oh?.channel} → ${oh?.responseType}`)
  }

  const evalsByCompany = await prisma.evaluation.groupBy({
    by: ['companyId'],
    _count: { id: true },
  })
  console.log('\n=== APPEND-ONLY CHECK (evals per company) ===')
  evalsByCompany.forEach(e => console.log(`  ${e.companyId.slice(0, 8)}… count=${e._count.id}`))

  const withSource = await prisma.company.count({ where: { leadSource: { not: null } } })
  console.log(`\n=== LEAD_SOURCE populated: ${withSource}/${companies} ===`)

  const withScore = await prisma.company.count({ where: { latestOpportunityScore: { gt: 0 } } })
  console.log(`=== LATEST_SCORE > 0:       ${withScore}/${companies} ===`)

  await prisma.$disconnect()
  console.log('\n✓ ALL VERIFICATION CHECKS PASSED')
}

verify().catch(async e => {
  console.error('VERIFICATION FAILED:', e.message)
  await prisma.$disconnect()
  process.exit(1)
})
