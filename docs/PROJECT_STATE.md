# Kronos Lead Intelligence — Project State
**Last Updated:** 2026-06-10  
**Architecture Version:** v4  
**Current Phase:** Phase 1 COMPLETE — Phase 2 PENDING  

---

## Current Architecture

**Stack**
- Framework: Next.js 16.2.9 (App Router, TypeScript)
- Database: PostgreSQL via Supabase (`uepkrruszvwetrmdllke`)
- ORM: Prisma 7.8.0 with `@prisma/adapter-pg` (driver adapter required by Prisma 7)
- UI: Tailwind CSS 4 + shadcn/ui (Phase 3+)
- Forms: React Hook Form 7 + Zod 4 (Phase 3+)
- Charts: Recharts 3 (Phase 4+)
- Seed runner: tsx 4.22.4

**Critical Prisma 7 Facts**
- Config file: `prisma.config.ts` (not just schema.prisma)
- Generated client: `app/generated/prisma/client.ts` — import as `@/app/generated/prisma/client`
- Constructor requires: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
- Seed config: `migrations.seed` in `prisma.config.ts` (not `package.json`)

**Critical Next.js 16 Facts**
- Route handler `params` are async: `const { id } = await ctx.params`
- See AGENTS.md for full breaking changes warning

---

## Database Schema Summary

### companies (17 columns)
```
id                    TEXT PK (UUID)
name                  TEXT NOT NULL
industry              TEXT NOT NULL          ← free text, no enum
country               TEXT NOT NULL
city                  TEXT nullable
website               TEXT nullable
whatsapp              TEXT nullable
instagram             TEXT nullable
linkedin              TEXT nullable
google_business_url   TEXT nullable
status                TEXT DEFAULT 'active'
lead_source           TEXT nullable          ← ARCH-013
latest_opportunity_score  INT DEFAULT 0      ← denormalized (ARCH-012)
latest_priority_level     TEXT DEFAULT 'low' ← denormalized (ARCH-012)
latest_evaluated_at       TIMESTAMP nullable ← denormalized (ARCH-012)
created_at            TIMESTAMP DEFAULT now()
updated_at            TIMESTAMP (auto)
```

### evaluations (43 columns) — APPEND-ONLY
```
id              TEXT PK
company_id      TEXT FK → companies.id CASCADE DELETE
evaluated_by    TEXT
signal_*        BOOLEAN ×15 (all default false)
score_*         INT nullable ×6 category scores
opportunity_score         INT nullable
priority_level            TEXT nullable
detected_problems         TEXT[] 
probable_pain_point       TEXT nullable
recommended_solution      TEXT nullable
estimated_value_min/max   INT nullable
estimated_leads_lost_per_month    INT nullable
estimated_revenue_lost_per_month  INT nullable
estimated_roi_potential           INT nullable
recommended_services      TEXT[]
implementation_difficulty TEXT nullable
implementation_time_estimate TEXT nullable
estimated_project_price_min/max  INT nullable
evaluated_at    TIMESTAMP DEFAULT now()
updated_at      TIMESTAMP (auto)

INDEXES:
  (company_id)
  (company_id, evaluated_at DESC)   ← for latest-evaluation queries
```

### sales_notes (24 columns)
```
id              TEXT PK
company_id      TEXT FK → companies.id CASCADE DELETE
contact_name, contact_role, contact_phone, contact_email  TEXT nullable
contact_status  TEXT DEFAULT 'not_contacted'
meeting_status  TEXT DEFAULT 'not_scheduled'
meeting_date    TIMESTAMP nullable
meeting_notes   TEXT nullable
budget_min/max  INT nullable
budget_currency TEXT DEFAULT 'USD'
objections, follow_up_notes, sales_observations  TEXT nullable
next_action     TEXT nullable
next_action_date TIMESTAMP nullable
assigned_to     TEXT nullable
close_probability INT nullable
lost_reason     TEXT nullable
created_at, updated_at  TIMESTAMP
```

### outreach_history (19 columns)
```
id              TEXT PK
company_id      TEXT FK → companies.id CASCADE DELETE
channel         TEXT NOT NULL
message_sent    TEXT nullable
sent_by         TEXT nullable
sent_at         TIMESTAMP DEFAULT now()
response_received  BOOLEAN DEFAULT false
response_type   TEXT nullable
response_notes  TEXT nullable
replied_at      TIMESTAMP nullable
next_follow_up_at TIMESTAMP nullable
sequence_number INT DEFAULT 1
template_used   TEXT nullable
channel_account TEXT nullable
is_automated    BOOLEAN DEFAULT false
created_at, updated_at  TIMESTAMP

INDEXES:
  (company_id)
  (sent_at)
  (channel)
  (response_type)
  (next_follow_up_at)
```

---

## Business Rules

### Priority Levels
- `hot` — opportunity_score ≥ 80
- `high` — opportunity_score ≥ 60
- `medium` — opportunity_score ≥ 40
- `low` — opportunity_score < 40

### Evaluation Pattern (ARCH-012)
Every call to the evaluate endpoint creates a **new** `Evaluation` row — never overwrites. The `companies` table is updated atomically in the **same transaction** with:
- `latest_opportunity_score`
- `latest_priority_level`
- `latest_evaluated_at`

Dashboard queries sort by `companies.latest_opportunity_score DESC` to avoid lateral joins (Prisma 7 limitation).

### Lead Source (ARCH-013)
`lead_source` is a nullable TEXT field on companies. Valid values managed at UI level only (no DB enum): `google_maps`, `linkedin`, `instagram`, `facebook`, `referral`, `website`, `cold_outreach`, `event`, `other`.

---

## Scoring Engine Rules (`lib/scoring.ts`)

Pure function: `computeScores(signals: SignalFlags): CategoryScores`

| Category | Weight | Signals |
|----------|--------|---------|
| Lead Generation | 25% | `!contactForm` (+40), `!whatsapp` (+35), `weakOnlinePresence` (+25) |
| Follow-up | 25% | `slowResponse` (+50), `weakFollowup` (+50) |
| Conversion Process | 20% | `!clearCta` (+55), `!leadCapture` (+45) |
| Automation Opportunity | 15% | `manualWork` (+60), `!bookingSystem` (+40) |
| Online Presence | 10% | `!website` (+50), `!instagram` (+30), `!linkedin` (+20) |
| Reputation | 5% | `!googleBusiness` (+40), `!reviews` (+30), `unansweredReviews` (+30) |

Each category caps at 100. `opportunityScore = weighted sum`. `priorityLevel` derived from score.

---

## Revenue Opportunity Module Rules (`lib/value-estimator.ts`)

Pure function: `estimateRevenueOpportunity(signals, industry, estimatedProjectPriceMin): RevenueOpportunityOutput`

**Lead Loss Rate** (capped at 80%):
- `!clearCta` → +15%
- `!leadCapture` → +15%
- `slowResponse` → +20%
- `weakFollowup` → +15%
- `!contactForm` → +10%
- `!whatsapp` → +10%
- `weakOnlinePresence` → +10%

**Industry Baselines:**

| Industry | Monthly Contacts | Avg Deal Value |
|----------|-----------------|----------------|
| Dental | 80 | $200 |
| Real Estate | 40 | $3,000 |
| Law Firm | 30 | $1,500 |
| Default | 50 | $500 |

**Formulas:**
- `estimatedLeadsLostPerMonth = round(monthlyContacts × lossRate)`
- `estimatedRevenueLostPerMonth = round(leadsLost × dealValue × 0.05)` (5% close rate)
- `estimatedRoiPotential = round((revenueLost × 12) / projectPriceMin)` (annual ROI multiple)

---

## Service Match Engine Rules (`lib/service-match.ts`)

Pure function: `matchServices(signals: SignalFlags): ServiceMatchOutput`

| Service | Trigger Condition | Price Range | Difficulty |
|---------|------------------|-------------|------------|
| WhatsApp Automation | `!whatsapp OR slowResponse OR weakFollowup` | $600–$1,200 | low |
| Appointment Booking | `!bookingSystem` | $800–$1,800 | medium |
| Lead Capture Funnel | `!contactForm OR !leadCapture OR !clearCta` | $1,000–$2,500 | medium |
| CRM & Follow-up | `weakFollowup AND manualWork` | $1,200–$2,500 | medium |
| Google Business Setup | `!googleBusiness` | $300–$600 | low |
| Review Management | `unansweredReviews` | $400–$800 | low |
| Social Media Package | `!instagram AND weakOnlinePresence` | $800–$1,500 | medium |
| Website Development | `!website` | $2,500–$6,000 | high |
| Sales Process Automation | `slowResponse AND weakFollowup AND manualWork` (all 3) | $2,000–$5,000 | high |
| Digital Presence Audit | `weakOnlinePresence` (catch-all) | $300–$500 | low |

**Aggregation:** difficulty = max across matched services; price = sum; time = range based on max difficulty tier.

---

## Folder Structure

```
kronos-lead-intelligence/
├── app/
│   ├── generated/prisma/     ← Prisma 7 generated client (gitignored)
│   ├── layout.tsx
│   └── page.tsx
├── docs/
│   ├── CHANGELOG.md
│   ├── HANDOFF.md
│   ├── PHASE_1_COMPLETION_REPORT.md
│   ├── PROJECT_MEMORY.md
│   ├── PROJECT_SPEC.md
│   └── PROJECT_STATE.md      ← this file
├── lib/
│   ├── constants.ts          ← domain constants, KRONOS_SERVICES catalog
│   ├── db.ts                 ← Prisma client singleton (uses PrismaPg adapter)
│   ├── diagnosis.ts          ← Sales Diagnosis Engine
│   ├── scoring.ts            ← Opportunity Scoring Engine
│   ├── service-match.ts      ← Kronos Service Match Engine
│   ├── types.ts              ← all TypeScript interfaces
│   └── value-estimator.ts   ← Revenue Opportunity Module
├── prisma/
│   ├── migrations/
│   │   └── 20260610171335_init/migration.sql
│   ├── schema.prisma
│   └── seed.ts
├── scripts/
│   └── verify-db.ts          ← DB verification utility
├── .env                      ← DATABASE_URL (gitignored)
├── .gitignore
├── AGENTS.md                 ← Next.js 16 breaking changes warning
├── CLAUDE.md
├── package.json
├── prisma.config.ts          ← Prisma 7 config (datasource URL, seed command)
└── tsconfig.json             ← @/* paths alias maps to ./
```

---

## Current Completed Phase

**Phase 1: Foundation & Business Logic** ✅ COMPLETE (2026-06-10)

Deliverables:
- Next.js 16.2.9 project initialized
- Prisma 7.8.0 with PostgreSQL adapter configured
- 4-model schema migrated to Supabase
- Complete TypeScript type system
- 4 pure business logic engines in `lib/`
- 5-company seed dataset with full related records
- All indexes and FK constraints in place

---

## Next Phase

**Phase 2: API Routes** (NOT YET STARTED)

Endpoints to implement (all under `app/api/`):

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/companies` | List all — sorted by `latestOpportunityScore DESC`, with filters |
| POST | `/api/companies` | Create company |
| GET | `/api/companies/[id]` | Get company + latest evaluation + sales note |
| PATCH | `/api/companies/[id]` | Update company fields |
| DELETE | `/api/companies/[id]` | Soft-delete (set status='archived') or hard delete |
| POST | `/api/companies/[id]/evaluate` | Run full evaluation (append-only + update denormalized fields in transaction) |
| GET | `/api/companies/[id]/evaluations` | Get all evaluations for history view |
| POST | `/api/companies/[id]/outreach` | Log outreach message |
| PATCH | `/api/companies/[id]/sales-note` | Update sales note (upsert) |

**Phase 2 critical notes:**
1. Route params are async in Next.js 16: `const { id } = await context.params`
2. Evaluate endpoint must use `prisma.$transaction()` to atomically create evaluation + update company denormalized fields
3. All inputs must be validated with Zod before hitting the DB
4. Import Prisma client from `lib/db.ts` — never instantiate directly in route handlers

---

## Pending Decisions

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Auth strategy for dashboard | None (internal tool) / NextAuth / Supabase Auth | None for MVP — add later if needed |
| 2 | `evaluatedBy` source | Hardcoded string / user session / env var | Env var `EVALUATOR_NAME` for now |
| 3 | Dashboard pagination | Cursor-based / offset / infinite scroll | Offset for MVP (simple, sufficient for <1000 companies) |
| 4 | Deployment target | Vercel / self-host | Vercel (zero-config Next.js) |

---

## Known Technical Constraints

1. **Prisma 7 no LATERAL joins** — Dashboard must sort via `companies.latest_opportunity_score` (denormalized), not by a subquery over evaluations.
2. **Prisma 7 adapter required** — Never instantiate `new PrismaClient()` without the `adapter` option; it will throw at the TypeScript level.
3. **Next.js 16 async params** — Every dynamic route handler must `await` the params object before destructuring.
4. **Supabase connection pooling** — If switching to Supabase's connection pooler (port 6543), append `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`.
