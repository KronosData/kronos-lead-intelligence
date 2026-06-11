// Deletes all seed data from production DB.
// Companies are deleted first; CASCADE removes evaluations, sales_notes, outreach_history.
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Count before
  const before = {
    companies: await prisma.company.count(),
    evaluations: await prisma.evaluation.count(),
    salesNotes: await prisma.salesNote.count(),
    outreach: await prisma.outreachHistory.count(),
  }
  console.log('BEFORE:', before)

  // Delete — CASCADE handles all related tables
  const deleted = await prisma.company.deleteMany({})
  console.log(`Deleted ${deleted.count} companies (cascade removed related records)`)

  // Count after
  const after = {
    companies: await prisma.company.count(),
    evaluations: await prisma.evaluation.count(),
    salesNotes: await prisma.salesNote.count(),
    outreach: await prisma.outreachHistory.count(),
  }
  console.log('AFTER:', after)

  const allZero = Object.values(after).every(v => v === 0)
  console.log(allZero ? '✓ All tables empty — DB clean' : '✗ Some records remain')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
