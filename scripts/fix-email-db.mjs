// Data migration: replace alejandro@kronosdata.com → alejandro@kronosdata.tech
// in all three tables that may store this email.
// Run with: node scripts/fix-email-db.mjs

import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Read DATABASE_URL from .env
function loadEnv() {
  const envPath = resolve(__dirname, '../.env')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key?.trim() === 'DATABASE_URL') {
      return rest.join('=').trim().replace(/^["']|["']$/g, '')
    }
  }
  throw new Error('DATABASE_URL not found in .env')
}

const OLD = 'alejandro@kronosdata.com'
const NEW = 'alejandro@kronosdata.tech'

async function run() {
  const { default: pg } = await import('pg')
  const { Pool } = pg

  const connectionString = loadEnv()
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })

  console.log('\n── Kronos Data Migration ──────────────────────────────────')
  console.log(`Replacing: ${OLD}`)
  console.log(`With:      ${NEW}\n`)

  try {
    // 1. Count before
    const countRes = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM sales_notes      WHERE assigned_to  = $1) AS sales_notes,
        (SELECT COUNT(*) FROM outreach_history WHERE sent_by       = $1) AS outreach_history,
        (SELECT COUNT(*) FROM evaluations      WHERE evaluated_by  = $1) AS evaluations`,
      [OLD]
    )
    const before = countRes.rows[0]
    console.log('Records with .com BEFORE migration:')
    console.log(`  sales_notes.assigned_to:        ${before.sales_notes}`)
    console.log(`  outreach_history.sent_by:        ${before.outreach_history}`)
    console.log(`  evaluations.evaluated_by:        ${before.evaluations}\n`)

    // 2. Run updates
    const r1 = await pool.query(
      `UPDATE sales_notes SET assigned_to = $2 WHERE assigned_to = $1`,
      [OLD, NEW]
    )
    const r2 = await pool.query(
      `UPDATE outreach_history SET sent_by = $2 WHERE sent_by = $1`,
      [OLD, NEW]
    )
    const r3 = await pool.query(
      `UPDATE evaluations SET evaluated_by = $2 WHERE evaluated_by = $1`,
      [OLD, NEW]
    )

    console.log('Rows updated:')
    console.log(`  sales_notes:       ${r1.rowCount}`)
    console.log(`  outreach_history:  ${r2.rowCount}`)
    console.log(`  evaluations:       ${r3.rowCount}`)
    console.log(`  TOTAL:             ${(r1.rowCount ?? 0) + (r2.rowCount ?? 0) + (r3.rowCount ?? 0)}\n`)

    // 3. Verify zero remaining
    const verifyRes = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM sales_notes      WHERE assigned_to  = $1) AS sales_notes,
        (SELECT COUNT(*) FROM outreach_history WHERE sent_by       = $1) AS outreach_history,
        (SELECT COUNT(*) FROM evaluations      WHERE evaluated_by  = $1) AS evaluations`,
      [OLD]
    )
    const after = verifyRes.rows[0]
    console.log('Records with .com AFTER migration:')
    console.log(`  sales_notes.assigned_to:        ${after.sales_notes}`)
    console.log(`  outreach_history.sent_by:        ${after.outreach_history}`)
    console.log(`  evaluations.evaluated_by:        ${after.evaluations}\n`)

    const total = Number(after.sales_notes) + Number(after.outreach_history) + Number(after.evaluations)
    if (total === 0) {
      console.log('✅ MIGRATION COMPLETE — 0 records with .com domain remain.')
    } else {
      console.log(`⚠️  WARNING: ${total} records still have .com domain. Check manually.`)
      process.exit(1)
    }

    return {
      before,
      updated: {
        sales_notes: r1.rowCount ?? 0,
        outreach_history: r2.rowCount ?? 0,
        evaluations: r3.rowCount ?? 0,
      }
    }
  } finally {
    await pool.end()
  }
}

run().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
