# Kronos Lead Intelligence — Session Handoff
**Last Updated:** 2026-06-10  
**For:** Next Claude session continuing this project  
**Current Status:** Phase 1 COMPLETE — ready to begin Phase 2 (API Routes)

---

## What This Project Is

Kronos Lead Intelligence is an **internal sales intelligence dashboard** for Kronos Data, a Latin American consulting company focused on business automation. The tool allows the Kronos team to:

1. **Add prospects** (companies) they've identified as potential clients
2. **Evaluate each company** by checking 15 digital presence signals
3. **Get an automated score** (0–100) and priority classification (hot/high/medium/low)
4. **See which Kronos services** best match the company's gaps
5. **Track outreach** — messages sent, responses received, follow-ups due
6. **Manage the sales pipeline** — meeting scheduling, proposals, close probability

The dashboard serves as the single source of truth for the Kronos sales team.

---

## How to Resume

### Step 1 — Read these files in order
1. `docs/PROJECT_STATE.md` — architecture, schema, business rules (complete reference)
2. `docs/PROJECT_SPEC.md` — full technical specification (source of truth)
3. `docs/CHANGELOG.md` — all architectural decisions
4. `docs/PHASE_1_COMPLETION_REPORT.md` — what was done in Phase 1

### Step 2 — Verify the environment
```bash
cd "C:\Users\Usuario\Documents\Nueva carpeta\Claude Code\kronos-lead-intelligence"
npx tsx scripts/verify-db.ts   # confirms DB connection + data
npx tsc --noEmit               # confirms TypeScript is clean
```

### Step 3 — Begin Phase 2 (API Routes)
See the "Next Phase" section of `PROJECT_STATE.md` for the full endpoint spec and critical implementation notes.

---

## Project Location

```
C:\Users\Usuario\Documents\Nueva carpeta\Claude Code\kronos-lead-intelligence\
```

---

## Technology Decisions (DO NOT change without architecture review)

| Technology | Version | Why |
|-----------|---------|-----|
| Next.js | 16.2.9 | App Router, TypeScript, API routes |
| Prisma | 7.8.0 | Type-safe ORM; **requires driver adapter** |
| `@prisma/adapter-pg` | latest | Required by Prisma 7 for PostgreSQL |
| PostgreSQL | Supabase cloud | Production-grade, free tier, instant setup |
| Tailwind CSS | 4 | Utility-first styling |
| Zod | 4.4.3 | Schema validation for all API inputs |
| React Hook Form | 7.78.0 | Form state management |
| Recharts | 3.8.1 | Score visualization charts |
| tsx | 4.22.4 | TypeScript script runner (for seed) |

---

## CRITICAL: Breaking Changes to Know

### Prisma 7 (differs from Prisma 5/6)
- **Constructor requires adapter:** `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
- **Import path:** `from '@/app/generated/prisma/client'` (NOT `@prisma/client`, NOT `@/app/generated/prisma`)
- **Seed config:** in `prisma.config.ts` under `migrations.seed`, not in `package.json`
- **Config file:** `prisma.config.ts` handles datasource URL (not just `schema.prisma`)

### Next.js 16 (differs from Next.js 14/15)
- **Route params are async:** Always `const { id } = await context.params` in route handlers
- Full warning in `AGENTS.md` at project root

---

## Database Connection

```
Host:     db.uepkrruszvwetrmdllke.supabase.co:5432
Database: postgres
Schema:   public
```

`DATABASE_URL` is in `.env` (gitignored). Do not hardcode credentials.

To get the adapter instance for a script:
```typescript
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/app/generated/prisma/client'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
```

For the application (Next.js routes), always use the singleton:
```typescript
import { prisma } from '@/lib/db'
```

---

## Current Database State

| Table | Rows | Notes |
|-------|------|-------|
| companies | 5 | Sorted by `latest_opportunity_score DESC` for dashboard |
| evaluations | 5 | 1 per company — append-only pattern (Phase 1 has 1 each) |
| sales_notes | 5 | 1 per company |
| outreach_history | 5 | 1 per company |

Seed companies (score DESC):
1. Lima Capital Propiedades — HOT (87) — Real Estate
2. Estudio Jurídico Andino — high (71) — Law Firm
3. Restaurante El Mirador — high (68) — F&B
4. Clínica Dental San Marcos — high (62) — Dental
5. Consultora Digital Nexo — medium (46) — Consultoría

---

## Business Logic Modules (all in `lib/`, all pure functions)

| File | Export | Purpose |
|------|--------|---------|
| `lib/scoring.ts` | `computeScores(signals)` | 6 category scores + opportunityScore + priorityLevel |
| `lib/diagnosis.ts` | `generateDiagnosis(signals, industry, score)` | Problems, pain point, solution, value estimate |
| `lib/service-match.ts` | `matchServices(signals)` | Which Kronos services apply + pricing/difficulty |
| `lib/value-estimator.ts` | `estimateRevenueOpportunity(signals, industry, priceMin)` | Leads lost, revenue lost, ROI multiple |
| `lib/db.ts` | `prisma` | Singleton Prisma client (use this in all route handlers) |
| `lib/types.ts` | all types | Full TypeScript type system |
| `lib/constants.ts` | all constants | KRONOS_SERVICES, SIGNAL_DEFINITIONS, INDUSTRY_BASELINES, etc. |

The evaluate endpoint (Phase 2) should call all four pure functions and persist the result.

---

## How the Evaluate Flow Works

When `POST /api/companies/[id]/evaluate` receives signal inputs:

```typescript
// 1. Compute scores
const scores = computeScores(signals)

// 2. Generate diagnosis (uses industry + opportunityScore)
const diagnosis = generateDiagnosis(signals, company.industry, scores.opportunityScore)

// 3. Match Kronos services
const serviceMatch = matchServices(signals)

// 4. Estimate revenue opportunity (uses project price from service match)
const revenue = estimateRevenueOpportunity(signals, company.industry, serviceMatch.estimatedProjectPriceMin)

// 5. Persist in a SINGLE TRANSACTION (append-only + update denormalized)
await prisma.$transaction([
  prisma.evaluation.create({ data: { companyId: id, ...signals, ...scores, ...diagnosis, ...serviceMatch, ...revenue } }),
  prisma.company.update({ where: { id }, data: {
    latestOpportunityScore: scores.opportunityScore,
    latestPriorityLevel: scores.priorityLevel,
    latestEvaluatedAt: new Date(),
  }}),
])
```

---

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ COMPLETE | Foundation, schema, business logic, DB migration, seed |
| Phase 2 | ⏳ NEXT | API Routes (9 endpoints) |
| Phase 3 | pending | Data Entry UI (add company + evaluate form) |
| Phase 4 | pending | Dashboard (sortable list, priority badges, score sparklines) |
| Phase 5 | pending | Company Detail View (full profile, evaluation history, outreach log) |
| Phase 6 | pending | Polish (error states, loading states, mobile layout) |

---

## Mandatory Process Requirement

**After every phase completion, generate a 13-section Technical Review Report and wait for explicit user approval before starting the next phase.**

The 13 sections are:
1. Phase Objectives
2. Deliverables Completed
3. Architecture Compliance
4. Breaking Changes Discovered & Resolved
5. Business Logic Validation
6. Database Schema Review
7. TypeScript Type System
8. Seed/Test Data Quality
9. Dependency Audit
10. Open Items
11. Code Quality
12. Risks & Mitigations
13. Phase Sign-Off Criteria

---

## Files to Read Before Writing Any Code

```
AGENTS.md                          ← Next.js 16 breaking changes
docs/PROJECT_STATE.md              ← complete architecture reference
docs/PROJECT_SPEC.md               ← official specification
lib/types.ts                       ← all types (never duplicate)
lib/constants.ts                   ← all domain constants
prisma/schema.prisma               ← authoritative schema
```

---

## What NOT to Do

- Do NOT import from `@prisma/client` — it's a stub in Prisma 7; use `@/app/generated/prisma/client`
- Do NOT instantiate `new PrismaClient()` without the `adapter` option
- Do NOT read route `params` synchronously — always `await context.params` in Next.js 16
- Do NOT overwrite evaluations — always create new records (append-only pattern)
- Do NOT run migrations without verifying `DATABASE_URL` is set
- Do NOT hardcode credentials in any source file
- Do NOT start Phase 3 without completing the 13-section Phase 2 Technical Review Report and receiving approval
