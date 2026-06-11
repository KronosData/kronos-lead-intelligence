import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function audit() {
  // 1. Tables
  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  ` as Array<{ table_name: string }>
  console.log('=== TABLES ===')
  tables.forEach(t => console.log(' ', t.table_name))

  // 2. Indexes
  const indexes = await prisma.$queryRaw`
    SELECT indexname, tablename FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('companies','evaluations','sales_notes','outreach_history')
    ORDER BY tablename, indexname
  ` as Array<{ indexname: string; tablename: string }>
  console.log('\n=== INDEXES ===')
  indexes.forEach(i => console.log(`  [${i.tablename}] ${i.indexname}`))

  // 3. Foreign keys
  const fks = await prisma.$queryRaw`
    SELECT tc.constraint_name, tc.table_name, kcu.column_name,
           ccu.table_name AS ref_table, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = rc.unique_constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  ` as Array<{ constraint_name: string; table_name: string; column_name: string; ref_table: string; delete_rule: string }>
  console.log('\n=== FOREIGN KEYS ===')
  fks.forEach(f => console.log(`  ${f.table_name}.${f.column_name} → ${f.ref_table} ON DELETE ${f.delete_rule}`))

  // 4. Column counts
  const cols = await prisma.$queryRaw`
    SELECT table_name, COUNT(*)::int AS col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('companies','evaluations','sales_notes','outreach_history')
    GROUP BY table_name ORDER BY table_name
  ` as Array<{ table_name: string; col_count: number }>
  console.log('\n=== COLUMN COUNTS ===')
  cols.forEach(c => console.log(`  ${c.table_name}: ${c.col_count}`))

  // 5. lead_source column
  const ls = await prisma.$queryRaw`
    SELECT column_name, is_nullable, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='companies' AND column_name='lead_source'
  ` as Array<{ column_name: string; is_nullable: string; data_type: string }>
  console.log('\n=== LEAD_SOURCE (ARCH-013) ===')
  console.log(' ', ls[0] ? `${ls[0].column_name} | ${ls[0].data_type} | nullable=${ls[0].is_nullable}` : 'NOT FOUND ❌')

  // 6. Append-only: no UNIQUE on evaluations.company_id
  const uniq = await prisma.$queryRaw`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='evaluations' AND constraint_type='UNIQUE'
  ` as Array<{ constraint_name: string }>
  console.log('\n=== APPEND-ONLY CHECK (ARCH-012) ===')
  console.log('  UNIQUE constraints on evaluations:', uniq.length === 0 ? 'NONE ✓' : uniq.map(u => u.constraint_name).join(', ') + ' ❌')

  // 7. Denormalized fields on companies
  const den = await prisma.$queryRaw`
    SELECT column_name, data_type, column_default FROM information_schema.columns
    WHERE table_schema='public' AND table_name='companies'
      AND column_name IN ('latest_opportunity_score','latest_priority_level','latest_evaluated_at')
    ORDER BY column_name
  ` as Array<{ column_name: string; data_type: string; column_default: string }>
  console.log('\n=== DENORMALIZED FIELDS (ARCH-012) ===')
  den.forEach(d => console.log(`  ${d.column_name}: ${d.data_type} (default: ${d.column_default})`))

  // 8. Industry column type
  const ind = await prisma.$queryRaw`
    SELECT column_name, data_type, udt_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='companies' AND column_name='industry'
  ` as Array<{ column_name: string; data_type: string; udt_name: string }>
  console.log('\n=== INDUSTRY FIELD (flexible) ===')
  console.log(' ', ind[0])

  // 9. Revenue module fields
  const rev = await prisma.$queryRaw`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='evaluations'
      AND column_name IN ('estimated_leads_lost_per_month','estimated_revenue_lost_per_month','estimated_roi_potential')
    ORDER BY column_name
  ` as Array<{ column_name: string; data_type: string }>
  console.log('\n=== REVENUE MODULE FIELDS ===')
  rev.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`))

  // 10. Service match fields
  const sm = await prisma.$queryRaw`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='evaluations'
      AND column_name IN ('recommended_services','implementation_difficulty','implementation_time_estimate','estimated_project_price_min','estimated_project_price_max')
    ORDER BY column_name
  ` as Array<{ column_name: string; data_type: string }>
  console.log('\n=== SERVICE MATCH FIELDS ===')
  sm.forEach(s => console.log(`  ${s.column_name}: ${s.data_type}`))

  // 11. Signal fields count on evaluations
  const sigs = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS sig_count FROM information_schema.columns
    WHERE table_schema='public' AND table_name='evaluations' AND column_name LIKE 'signal_%'
  ` as Array<{ sig_count: number }>
  console.log('\n=== SIGNAL FIELDS COUNT ===')
  console.log(`  ${sigs[0].sig_count} signal_ columns (expected 15)`, sigs[0].sig_count === 15 ? '✓' : '❌')

  // 12. Prisma migration state
  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at
  ` as Array<{ migration_name: string; finished_at: Date }>
  console.log('\n=== MIGRATIONS ===')
  migrations.forEach(m => console.log(`  ${m.migration_name} — applied ${m.finished_at?.toISOString() ?? 'pending'}`))

  await prisma.$disconnect()
  console.log('\n✓ AUDIT COMPLETE')
}

audit().catch(async e => {
  console.error('AUDIT FAILED:', e.message)
  await prisma.$disconnect()
  process.exit(1)
})
