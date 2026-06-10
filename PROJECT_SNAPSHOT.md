# PROJECT SNAPSHOT — Kronos Lead Intelligence
**Snapshot Date:** 2026-06-10  
**Snapshot Type:** End-of-phase safe pause  
**Git Commit:** d776c05  
**Branch:** master  
**Working Tree:** CLEAN — nothing uncommitted  

---

## PHASE STATUS

| Phase | Status | Date |
|-------|--------|------|
| Phase 1 — Foundation, Schema, Business Logic | ✅ COMPLETE | 2026-06-10 |
| Phase 2 — API Routes | ⏳ NEXT — not started | — |
| Phase 3 — Data Entry UI | pending | — |
| Phase 4 — Dashboard | pending | — |
| Phase 5 — Detail View | pending | — |
| Phase 6 — Polish | pending | — |

---

## DATABASE STATUS

### Connection
| Property | Value |
|----------|-------|
| Provider | Supabase (PostgreSQL) |
| Host | `db.uepkrruszvwetrmdllke.supabase.co:5432` |
| Database | `postgres` |
| Schema | `public` |
| Migration | `20260610171335_init` — APPLIED |
| Seed | APPLIED — 5 companies loaded |

### Credentials
Stored only in `.env` (gitignored). Not hardcoded anywhere. To restore on a new machine: set `DATABASE_URL` in `.env` at project root.

### Table Row Counts (at snapshot)
| Table | Rows |
|-------|------|
| companies | 5 |
| evaluations | 5 |
| sales_notes | 5 |
| outreach_history | 5 |

---

## SCHEMA SUMMARY

### companies (17 columns)
- Primary key: `id TEXT` (UUID via `uuid()`)
- Core identity: `name`, `industry` (free text — no enum), `country`, `city`
- Contact channels: `website`, `whatsapp`, `instagram`, `linkedin`, `google_business_url`
- Pipeline: `status` (active/contacted/client/archived), `lead_source` (nullable, ARCH-013)
- Denormalized score cache (ARCH-012): `latest_opportunity_score`, `latest_priority_level`, `latest_evaluated_at`
- Timestamps: `created_at`, `updated_at`

### evaluations (43 columns) — APPEND-ONLY PATTERN
- FK: `company_id → companies.id CASCADE DELETE`
- Evaluator: `evaluated_by TEXT`
- 15 signal booleans: `signal_has_website`, `signal_has_whatsapp`, `signal_has_contact_form`, `signal_has_booking_system`, `signal_has_instagram`, `signal_has_linkedin`, `signal_has_google_business`, `signal_has_reviews`, `signal_has_unanswered_reviews`, `signal_has_clear_cta`, `signal_has_lead_capture`, `signal_slow_response`, `signal_weak_followup`, `signal_manual_work`, `signal_weak_online_presence`
- 7 score fields (nullable INT): `score_lead_generation`, `score_follow_up`, `score_conversion_process`, `score_automation_opportunity`, `score_online_presence`, `score_reputation`, `opportunity_score`
- Diagnosis: `priority_level`, `detected_problems TEXT[]`, `probable_pain_point`, `recommended_solution`, `estimated_value_min`, `estimated_value_max`
- Revenue module: `estimated_leads_lost_per_month`, `estimated_revenue_lost_per_month`, `estimated_roi_potential`
- Service match: `recommended_services TEXT[]`, `implementation_difficulty`, `implementation_time_estimate`, `estimated_project_price_min`, `estimated_project_price_max`
- Timestamps: `evaluated_at`, `updated_at`
- Indexes: `(company_id)`, `(company_id, evaluated_at DESC)`
- **NO unique constraint on company_id** — this is intentional for append-only pattern

### sales_notes (24 columns)
- FK: `company_id → companies.id CASCADE DELETE`
- Contact: `contact_name`, `contact_role`, `contact_phone`, `contact_email`, `contact_status`
- Meeting: `meeting_status`, `meeting_date`, `meeting_notes`
- Budget: `budget_min`, `budget_max`, `budget_currency`
- Pipeline: `objections`, `follow_up_notes`, `sales_observations`, `next_action`, `next_action_date`, `assigned_to`, `close_probability`, `lost_reason`
- Timestamps: `created_at`, `updated_at`

### outreach_history (19 columns)
- FK: `company_id → companies.id CASCADE DELETE`
- Message: `channel`, `message_sent`, `sent_by`, `sent_at`
- Response: `response_received`, `response_type`, `response_notes`, `replied_at`
- Scheduling: `next_follow_up_at`, `sequence_number`, `template_used`, `channel_account`, `is_automated`
- Timestamps: `created_at`, `updated_at`
- Indexes: `(company_id)`, `(sent_at)`, `(channel)`, `(response_type)`, `(next_follow_up_at)`

### Foreign Key Constraints (all CASCADE DELETE)
```
evaluations.company_id      → companies.id
sales_notes.company_id      → companies.id
outreach_history.company_id → companies.id
```

---

## SEED DATA SUMMARY

5 companies inserted to cover the full priority spectrum:

| # | Company | Industry | Score | Priority | Sales Stage | Last Outreach |
|---|---------|----------|-------|----------|-------------|---------------|
| 1 | Lima Capital Propiedades | Real Estate | 87 | **HOT** | attempted | linkedin → no_response |
| 2 | Estudio Jurídico Andino | Law Firm | 71 | high | in_conversation | email → asked_to_follow_up |
| 3 | Restaurante El Mirador | F&B | 68 | high | contacted | whatsapp → asked_to_follow_up |
| 4 | Clínica Dental San Marcos | Dental | 62 | high | contacted | whatsapp → interested |
| 5 | Consultora Digital Nexo | Consultoría | 46 | medium | proposal_sent | linkedin → booked_call |

---

## IMPLEMENTED MODULES & FILES

### Core Application
| File | Purpose | Status |
|------|---------|--------|
| `app/layout.tsx` | Root layout | ✅ scaffold |
| `app/page.tsx` | Root page | ✅ scaffold |
| `app/globals.css` | Global styles | ✅ scaffold |

### Business Logic (all pure functions — no DB access)
| File | Export | Purpose |
|------|--------|---------|
| `lib/types.ts` | 14 types/interfaces | Complete TypeScript type system |
| `lib/constants.ts` | All domain constants | KRONOS_SERVICES, SIGNAL_DEFINITIONS, INDUSTRY_BASELINES, etc. |
| `lib/scoring.ts` | `computeScores(signals)` | 6-category weighted scoring → opportunityScore + priorityLevel |
| `lib/diagnosis.ts` | `generateDiagnosis(signals, industry, score)` | Problems, pain point, solution, value estimate |
| `lib/service-match.ts` | `matchServices(signals)` | 10 Kronos services with trigger rules |
| `lib/value-estimator.ts` | `estimateRevenueOpportunity(signals, industry, priceMin)` | Leads lost, revenue lost, ROI multiple |
| `lib/db.ts` | `prisma` singleton | Prisma client with PrismaPg adapter — use in all routes |

### Database
| File | Purpose | Status |
|------|---------|--------|
| `prisma/schema.prisma` | 4-model schema | ✅ |
| `prisma/seed.ts` | 5 sample companies | ✅ applied |
| `prisma/migrations/20260610171335_init/migration.sql` | Initial migration | ✅ applied to Supabase |
| `prisma.config.ts` | Prisma 7 config (URL, seed command) | ✅ |

### Documentation
| File | Purpose |
|------|---------|
| `docs/PROJECT_SPEC.md` | Official specification v4 (source of truth) |
| `docs/PROJECT_STATE.md` | Architecture reference, business rules, phase plan |
| `docs/HANDOFF.md` | Full handoff guide for new sessions |
| `docs/PHASE_1_COMPLETION_REPORT.md` | Phase 1 completion details and fixes |
| `docs/CHANGELOG.md` | All architectural decisions log |
| `docs/PROJECT_MEMORY.md` | Project quick-reference |
| `PROJECT_SNAPSHOT.md` | This file |
| `RESUME_INSTRUCTIONS.md` | Step-by-step resume guide |

### Utilities
| File | Purpose |
|------|---------|
| `scripts/verify-db.ts` | Runs DB verification (table counts, relationships, architecture checks) |
| `AGENTS.md` | Next.js 16 breaking changes warning |

---

## ARCHITECTURE DECISIONS ENFORCED

### ARCH-012: Append-Only Evaluation History
- `evaluations` table has **no** UNIQUE constraint on `company_id`
- Every re-evaluation creates a new row — never overwrites
- `companies` table has denormalized: `latest_opportunity_score`, `latest_priority_level`, `latest_evaluated_at`
- Dashboard sorts by `companies.latest_opportunity_score DESC` (avoids subqueries/lateral joins)
- The evaluate API endpoint (Phase 2) MUST update these 3 denormalized fields in the same `prisma.$transaction()` that creates the evaluation

### ARCH-013: Lead Source Field
- `lead_source TEXT NULL` on companies
- No DB-level enum — values enforced at UI level only
- Valid values: `google_maps`, `linkedin`, `instagram`, `facebook`, `referral`, `website`, `cold_outreach`, `event`, `other`

### Industry Flexibility
- `industry TEXT NOT NULL` (no enum)
- `INDUSTRY_SUGGESTIONS` in `lib/constants.ts` provides 14 UI suggestions via combobox
- No DB-level restriction — free text allowed

---

## KNOWN CONSTRAINTS AND RULES

### Prisma 7 — BREAKS from Prisma 5/6
1. **Import path:** `from '@/app/generated/prisma/client'` — NOT `@prisma/client` or `@/app/generated/prisma`
2. **Constructor:** Requires an adapter — `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
3. **Singleton (for app code):** Always import `{ prisma }` from `@/lib/db`
4. **Seed config:** Lives in `prisma.config.ts` under `migrations.seed`, NOT in `package.json`
5. **Config file:** `prisma.config.ts` defines the datasource URL (read from `.env` via `dotenv/config`)

### Next.js 16 — BREAKS from Next.js 14/15
1. **Route params are ASYNC:** Every route handler MUST `const { id } = await context.params` — synchronous destructuring throws
2. Full warning: see `AGENTS.md` at project root

### Database Design Constraints
1. **Denormalized sort fields:** Dashboard MUST query `companies.latest_opportunity_score` — do NOT attempt a `findMany` with `orderBy: { evaluations: { ... } }` — Prisma 7 does not support LATERAL joins
2. **Cascade deletes:** Deleting a company cascades to all evaluations, sales_notes, and outreach_history
3. **Supabase connection pooler:** If switching from direct connection (port 5432) to pooler (port 6543), append `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`

### Code Quality Rules
1. Pure functions in `lib/` — no DB access, no side effects, no imports of `lib/db`
2. No `any` types
3. All route inputs validated with Zod before touching the DB
4. No comments unless the WHY is non-obvious

---

## EXACT NEXT STEPS — PHASE 2 API IMPLEMENTATION

### 9 Endpoints to Implement

| # | Method | Route | File |
|---|--------|-------|------|
| 1 | GET | `/api/companies` | `app/api/companies/route.ts` |
| 2 | POST | `/api/companies` | `app/api/companies/route.ts` |
| 3 | GET | `/api/companies/[id]` | `app/api/companies/[id]/route.ts` |
| 4 | PATCH | `/api/companies/[id]` | `app/api/companies/[id]/route.ts` |
| 5 | DELETE | `/api/companies/[id]` | `app/api/companies/[id]/route.ts` |
| 6 | POST | `/api/companies/[id]/evaluate` | `app/api/companies/[id]/evaluate/route.ts` |
| 7 | GET | `/api/companies/[id]/evaluations` | `app/api/companies/[id]/evaluations/route.ts` |
| 8 | POST | `/api/companies/[id]/outreach` | `app/api/companies/[id]/outreach/route.ts` |
| 9 | PATCH | `/api/companies/[id]/sales-note` | `app/api/companies/[id]/sales-note/route.ts` |

### Critical Implementation Pattern for Evaluate Endpoint (endpoint #6)

```typescript
// app/api/companies/[id]/evaluate/route.ts
import { prisma } from '@/lib/db'
import { computeScores } from '@/lib/scoring'
import { generateDiagnosis } from '@/lib/diagnosis'
import { matchServices } from '@/lib/service-match'
import { estimateRevenueOpportunity } from '@/lib/value-estimator'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params  // ← MUST await in Next.js 16

  const body = await request.json()
  // validate body with Zod here...

  const company = await prisma.company.findUniqueOrThrow({ where: { id } })

  const scores    = computeScores(body.signals)
  const diagnosis = generateDiagnosis(body.signals, company.industry, scores.opportunityScore)
  const services  = matchServices(body.signals)
  const revenue   = estimateRevenueOpportunity(body.signals, company.industry, services.estimatedProjectPriceMin)

  // TRANSACTION: create evaluation + update denormalized company fields atomically
  const [evaluation] = await prisma.$transaction([
    prisma.evaluation.create({
      data: { companyId: id, evaluatedBy: body.evaluatedBy, ...body.signals, ...scores, ...diagnosis, ...services, ...revenue }
    }),
    prisma.company.update({
      where: { id },
      data: {
        latestOpportunityScore: scores.opportunityScore,
        latestPriorityLevel:    scores.priorityLevel,
        latestEvaluatedAt:      new Date(),
      }
    }),
  ])

  return Response.json(evaluation, { status: 201 })
}
```

### Zod Schema to Write First
Before any route, write Zod schemas in `lib/schemas.ts`:
- `CreateCompanySchema` — validates POST /api/companies body
- `UpdateCompanySchema` — validates PATCH /api/companies/[id] body  
- `CreateEvaluationSchema` — validates POST /api/companies/[id]/evaluate body (15 boolean signals + evaluatedBy)
- `CreateOutreachSchema` — validates POST /api/companies/[id]/outreach body
- `UpdateSalesNoteSchema` — validates PATCH /api/companies/[id]/sales-note body

---

## WARNINGS AND RISKS

| Risk | Severity | Notes |
|------|----------|-------|
| Forgetting `await context.params` | HIGH | Will cause runtime error in Next.js 16. Every dynamic route must await params. |
| Importing from wrong Prisma path | HIGH | `@/app/generated/prisma` (without `/client`) will fail. Always add `/client`. |
| Evaluate without transaction | MEDIUM | If company update fails after evaluation insert, denormalized fields go stale. Always use `$transaction`. |
| Supabase idle connections | LOW | Default Prisma connection pool; acceptable for internal tool traffic. |
| No auth on API routes | LOW | Intentional for MVP. All routes are unprotected. Add auth in Phase 6 if needed. |

---

## HOW TO RESUME — STEP BY STEP

### On the same machine
```bash
cd "C:\Users\Usuario\Documents\Nueva carpeta\Claude Code\kronos-lead-intelligence"
npx tsx scripts/verify-db.ts   # confirms DB is live + seed data present
npx tsc --noEmit               # confirms TypeScript is clean
# Start Phase 2: implement app/api/ routes
```

### On a new machine
```bash
# 1. Clone or copy the project
# 2. Install dependencies
npm install
# 3. Create .env file at project root
echo 'DATABASE_URL="postgresql://postgres:[PASSWORD]@db.uepkrruszvwetrmdllke.supabase.co:5432/postgres"' > .env
# 4. Generate Prisma client
npx prisma generate
# 5. Verify connection
npx tsx scripts/verify-db.ts
# 6. Start Phase 2
```

### For a new Claude session
1. Tell Claude: "Continue Kronos Lead Intelligence from Phase 2. Read PROJECT_SNAPSHOT.md first."
2. Claude should read: `PROJECT_SNAPSHOT.md`, then `docs/HANDOFF.md`, then `docs/PROJECT_STATE.md`
3. Claude should run: `npx tsx scripts/verify-db.ts` to confirm DB state
4. Then begin Phase 2 API routes per the implementation plan above
