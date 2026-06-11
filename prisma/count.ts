import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  const evaluations = await prisma.evaluation.count()
  const salesNotes = await prisma.salesNote.count()
  const outreach = await prisma.outreachHistory.count()

  console.log('=== DB COUNTS ===')
  console.log('companies:', companies.length)
  console.log('evaluations:', evaluations)
  console.log('salesNotes:', salesNotes)
  console.log('outreach:', outreach)
  console.log('=== COMPANY LIST ===')
  companies.forEach(c => console.log(` - "${c.name}" | ${c.id}`))
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
