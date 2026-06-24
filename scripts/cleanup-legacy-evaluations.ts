// DRY-RUN ONLY — marks contaminated v1 evaluations with isLegacyEval=true.
// Run with: npx ts-node --project tsconfig.scripts.json scripts/cleanup-legacy-evaluations.ts
// Add --apply flag to execute writes (disabled by default).

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
const DRY_RUN = !process.argv.includes('--apply')

async function main() {
  console.log(`\n=== Cleanup Legacy Evaluations (${DRY_RUN ? 'DRY RUN' : 'APPLY'}) ===\n`)

  // Find all evaluations not yet flagged as legacy or v2
  const candidates = await prisma.evaluation.findMany({
    where: {
      isLegacyEval: false,
      evaluationSource: {
        notIn: ['discovery_engine_v2', 'reprocess_engine_v2'],
      },
    },
    select: {
      id: true,
      companyId: true,
      evaluatedBy: true,
      evaluationSource: true,
      evaluationStatus: true,
      evaluatedAt: true,
    },
    orderBy: { evaluatedAt: 'asc' },
  })

  console.log(`Found ${candidates.length} evaluation(s) to flag as legacy.\n`)

  if (candidates.length === 0) {
    console.log('Nothing to do.')
    return
  }

  // Group by source for summary
  const bySource: Record<string, number> = {}
  for (const ev of candidates) {
    const src = ev.evaluationSource ?? ev.evaluatedBy ?? 'unknown'
    bySource[src] = (bySource[src] ?? 0) + 1
  }

  console.log('By source:')
  for (const [src, count] of Object.entries(bySource)) {
    console.log(`  ${src}: ${count}`)
  }
  console.log()

  if (DRY_RUN) {
    console.log('DRY RUN — no writes. Pass --apply to commit.\n')
    console.log('Sample (first 5):')
    candidates.slice(0, 5).forEach((ev) => {
      console.log(`  id=${ev.id} source=${ev.evaluationSource ?? 'null'} status=${ev.evaluationStatus ?? 'null'}`)
    })
    return
  }

  // Apply: batch-update in chunks of 100
  const ids = candidates.map((e) => e.id)
  let updated = 0
  const CHUNK = 100
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const result = await prisma.evaluation.updateMany({
      where: { id: { in: chunk } },
      data: {
        isLegacyEval: true,
        legacyReason: 'Evaluación v1 — scoring contaminado con ROI/diagnóstico automático. Migrado a isLegacyEval por cleanup-legacy-evaluations.ts',
      },
    })
    updated += result.count
    console.log(`  Updated chunk ${Math.floor(i / CHUNK) + 1}: ${result.count} records`)
  }

  console.log(`\nDone. Total updated: ${updated}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
