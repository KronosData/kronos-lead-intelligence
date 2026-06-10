# PROJECT_MEMORY.md
# Kronos Lead Intelligence

> This file enables any future Claude session to immediately understand the full project context without reading previous conversations. Treat this as the authoritative quick-reference.

---

## Project Identity

| Field | Value |
|---|---|
| Project Name | Kronos Lead Intelligence |
| Type | Internal sales intelligence dashboard |
| Owner | Kronos Data |
| Status | **Architecture Approved — Ready for Phase 1** |
| Last Updated | 2026-06-10 |

---

## Project Vision

Kronos Data is a consulting company focused on automation, operational efficiency, and business growth. This system helps the Kronos sales team:

1. Identify businesses with visible pain points
2. Quantify how much revenue those businesses are losing
3. Prioritize the best sales opportunities
4. Recommend the exact Kronos services to propose
5. Track every commercial interaction from first contact to signed client

**This is not a generic software project. It is a sales intelligence weapon.**

---

## Business Objective

Every design decision answers one question:
> *Does this help Kronos find, qualify, and close consulting clients faster?*

---

## Target Users

- Kronos Data sales representatives (primary)
- Kronos Data team leads (secondary)
- Internal use only — no public access, no multi-tenant

---

## What Is Explicitly Out of Scope

- Public SaaS
- Chrome Extension
- CRM
- Automated web scraping
- AI enrichment (architecture prepared, not built)
- Multi-tenant authentication (MVP uses no auth)

---

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 — App Router + TypeScript |
| UI Library | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Hosting | Vercel |

---

## Database Architecture — 4 Tables

### Relationships

```
companies (1) ──< evaluations       (many — 1 active in MVP)
companies (1) ──< sales_notes       (many — 1 active in MVP)
companies (1) ──< outreach_history  (many — unlimited)

All child tables: ON DELETE CASCADE
```

---

### Table 1: `companies` (17 fields)

Core business identity. Parent to all other tables. Contains 4 denormalized fields updated atomically on every new evaluation to enable fast dashboard queries without complex joins.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | Required |
| industry | TEXT | Free text + UI combobox suggestions — no enum restriction |
| country | TEXT | peru / mexico / colombia / chile / spain |
| city | TEXT | Optional |
| website | TEXT | Optional |
| whatsapp | TEXT | Optional |
| instagram | TEXT | Optional |
| linkedin | TEXT | Optional |
| google_business_url | TEXT | Optional |
| status | TEXT | active / contacted / client / archived |
| lead_source | TEXT | Optional — google_maps / linkedin / instagram / facebook / referral / website / cold_outreach / event / other |
| latest_opportunity_score | INTEGER | Denormalized — updated on every new evaluation, enables fast dashboard sorting |
| latest_priority_level | TEXT | Denormalized — hot / high / medium / low, updated on every new evaluation |
| latest_evaluated_at | TIMESTAMPTZ | Denormalized — timestamp of most recent evaluation |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

**CRITICAL:** `industry` is a free text field. The UI shows predefined suggestions (dental, real estate, law firm, construction, logistics, healthcare, education, consulting, automotive, agency, restaurant, retail, other) but accepts any value. This decision was made so Kronos can evaluate any industry.

---

### Table 2: `evaluations` (41 fields)

Stores the 15 observed signals, all computed scores, diagnosis, revenue opportunity, and service match output. Recomputed entirely on every save.

**Signal fields (15 boolean flags):**
- signal_has_website, signal_has_whatsapp, signal_has_contact_form
- signal_has_booking_system, signal_has_instagram, signal_has_linkedin
- signal_has_google_business, signal_has_reviews, signal_has_unanswered_reviews
- signal_has_clear_cta, signal_has_lead_capture
- signal_slow_response, signal_weak_followup, signal_manual_work, signal_weak_online_presence

**Absence signals:** FALSE = problem (e.g., no website = opportunity)
**Presence signals:** TRUE = problem (e.g., slow_response = opportunity)

**Score fields (7 integers 0–100):**
- score_lead_generation, score_follow_up, score_conversion_process
- score_automation_opportunity, score_online_presence, score_reputation
- opportunity_score (final weighted score)

**Diagnosis fields:**
- priority_level (hot / high / medium / low)
- detected_problems[] (TEXT array)
- probable_pain_point (TEXT)
- recommended_solution (TEXT)
- estimated_value_min, estimated_value_max (rough USD range)

**Revenue Opportunity fields (NEW):**
- estimated_leads_lost_per_month (INTEGER)
- estimated_revenue_lost_per_month (INTEGER, USD)
- estimated_roi_potential (INTEGER, USD)

**Service Match fields (NEW):**
- recommended_services[] (TEXT array)
- implementation_difficulty (low / medium / high)
- implementation_time_estimate (TEXT, e.g. "3–6 weeks")
- estimated_project_price_min (INTEGER, USD)
- estimated_project_price_max (INTEGER, USD)

**Timestamps:** evaluated_at, updated_at

**CRITICAL DESIGN DECISION — APPEND-ONLY:** Every re-evaluation creates a NEW `evaluations` record. Previous evaluations are never overwritten or deleted. Historical scores are permanently preserved for trend analysis. The `latest_opportunity_score`, `latest_priority_level`, and `latest_evaluated_at` fields on `companies` are updated atomically in the same transaction as the new evaluation insert. The dashboard reads from these denormalized fields for sorting and filtering — no complex joins required.

---

### Table 3: `sales_notes` (23 fields)

Commercial workflow tracking. One active record per company in MVP.

**Groups:**
- Contact person: contact_name, contact_role, contact_phone, contact_email
- Contact status: not_contacted / attempted / contacted / in_conversation / proposal_sent / negotiating / closed_won / closed_lost
- Meeting: meeting_status, meeting_date, meeting_notes
- Commercial: budget_min, budget_max, budget_currency, objections, follow_up_notes, sales_observations
- Next steps: next_action, next_action_date, assigned_to
- Outcome: close_probability (0–100), lost_reason
- Timestamps: created_at, updated_at

---

### Table 4: `outreach_history` (17 fields)

Every outreach attempt ever made. Unlimited records per company.

| Field | Notes |
|---|---|
| channel | linkedin / email / whatsapp / instagram / call / other |
| message_sent | Full text of message |
| sent_by | Sales rep name |
| sent_at | Timestamp |
| response_received | Boolean |
| response_type | interested / not_interested / no_response / asked_to_follow_up / booked_call / closed_won / closed_lost |
| response_notes | Verbatim or paraphrased response |
| replied_at | Nullable timestamp |
| next_follow_up_at | Nullable date |
| sequence_number | Which attempt (1st, 2nd, 3rd...) |
| template_used | For future AI message tracking |
| channel_account | Which account was used |
| is_automated | For future automation flag |

**Indexes:** company_id, sent_at, channel, response_type, next_follow_up_at

---

## Scoring Engine

### Principle
More problems = Higher score = Higher priority for Kronos. The score measures opportunity for Kronos, not quality of the business.

### Categories and Weights

| Category | Weight | Signals |
|---|---|---|
| Lead Generation | 25% | No contact form (+40), no WhatsApp (+35), weak online presence (+25) |
| Customer Follow-up | 25% | Slow response (+50), weak follow-up (+50) |
| Conversion Process | 20% | No clear CTA (+55), no lead capture (+45) |
| Automation Opportunity | 15% | Manual work (+60), no booking system (+40) |
| Online Presence | 10% | No website (+50), no Instagram (+30), no LinkedIn (+20) |
| Reputation | 5% | No Google Business (+40), no reviews (+30), unanswered reviews (+30) |

### Formula
```
opportunity_score = round(
  score_lead_generation        × 0.25 +
  score_follow_up              × 0.25 +
  score_conversion_process     × 0.20 +
  score_automation_opportunity × 0.15 +
  score_online_presence        × 0.10 +
  score_reputation             × 0.05
)
```

### Priority Thresholds

| Score | Priority | Action |
|---|---|---|
| 80–100 | HOT | Contact this week |
| 60–79 | HIGH | Contact within 2 weeks |
| 40–59 | MEDIUM | Nurture — 30-day follow-up |
| 0–39 | LOW | Park — 90-day review |

**Implementation file:** `lib/scoring.ts` (pure functions, no side effects)

---

## Revenue Opportunity Module

**Purpose:** Give sales reps concrete financial numbers for outreach conversations.

**Outputs** (stored in `evaluations`):
- `estimated_leads_lost_per_month` — derived from lead gen + follow-up scores × industry baseline
- `estimated_revenue_lost_per_month` — leads lost × industry average deal value
- `estimated_roi_potential` — projected revenue recovered after Kronos intervention

**Implementation file:** `lib/value-estimator.ts`

**Important:** These are estimates for sales conversations, not audited financial projections. Sales reps can manually override values in the UI.

---

## Service Match Engine

**Purpose:** Map detected signal patterns to specific Kronos billable services. Answers: "What exactly should we sell this client?"

**Implementation file:** `lib/service_match.ts`

**Kronos Services Catalog (10 services):**

| Service | Trigger Signals |
|---|---|
| WhatsApp Automation | No WhatsApp OR slow response OR weak follow-up |
| Appointment Booking System | No booking system |
| Lead Capture Funnel | No contact form AND/OR no lead capture AND/OR no CTA |
| CRM & Follow-up Automation | Weak follow-up + manual work |
| Google Business Setup | No Google Business Profile |
| Review Management | Unanswered reviews |
| Social Media Presence Package | No Instagram + weak online presence |
| Website Development | No website |
| Sales Process Automation | Slow response + weak follow-up + manual work (all three) |
| Digital Presence Audit | Weak online presence (catch-all) |

**Outputs** (stored in `evaluations`):
- `recommended_services[]` — matched services
- `implementation_difficulty` — aggregated: low / medium / high
- `implementation_time_estimate` — total time range
- `estimated_project_price_min/max` — aggregated USD range (more precise than rough estimate)

---

## API Architecture

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/companies` | List + filter (country, industry, priority, score range) — sorted by `latest_opportunity_score` |
| POST | `/api/companies` | Create company + first evaluation + sales_note in one transaction |
| GET | `/api/companies/:id` | Full detail with latest evaluation + all related records |
| PUT | `/api/companies/:id` | Update company identity fields ONLY (name, industry, lead_source, etc.) — does NOT create evaluation |
| DELETE | `/api/companies/:id` | Cascade delete all related records |
| GET | `/api/companies/:id/evaluations` | Full evaluation history — all records, ordered newest first |
| POST | `/api/companies/:id/evaluations` | Create new evaluation (re-evaluation) — append-only, never overwrites |
| GET | `/api/companies/:id/outreach` | List outreach history |
| POST | `/api/companies/:id/outreach` | Log new outreach attempt |

---

## Folder Structure

```
kronos-lead-intelligence/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        → /dashboard
│   ├── dashboard/page.tsx
│   ├── companies/
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   └── api/companies/
│       ├── route.ts
│       └── [id]/
│           ├── route.ts
│           └── outreach/route.ts
├── components/
│   ├── ui/
│   ├── layout/          Sidebar, TopBar
│   ├── dashboard/       StatsBar, FilterBar, CompanyTable
│   └── companies/       CompanyForm, SignalsChecklist, DiagnosisPanel,
│                        ScoreBreakdown, SalesNotesPanel, PriorityBadge
│                        outreach/OutreachHistory, OutreachForm
├── lib/
│   ├── db.ts            Prisma singleton
│   ├── scoring.ts       Score engine (pure functions)
│   ├── diagnosis.ts     Pain point detector
│   ├── service_match.ts Kronos service recommender
│   ├── value-estimator.ts Revenue opportunity calculator
│   ├── types.ts         TypeScript interfaces
│   └── constants.ts     Industries, countries, signals, services catalog
├── prisma/
│   ├── schema.prisma    4-table schema
│   └── seed.ts          5 sample companies
└── docs/
```

---

## Risks

| Risk | Severity |
|---|---|
| Manual signal entry accuracy | Medium |
| Revenue estimates are approximations | Medium |
| Service match is rule-based (no AI) | Medium |
| No authentication in MVP | High |
| One evaluation per company loses history | Low |
| Free-text industry creates inconsistent data | Low |
| Supabase free tier 500MB limit | Low |
| sales_notes has no activity log | Low |

---

## Completed Decisions

- [x] Technology stack selected and approved
- [x] 4-table database schema designed and approved
- [x] Scoring engine designed (6 categories, weights, formula, thresholds)
- [x] Revenue Opportunity Module designed
- [x] Service Match Engine designed (10 services)
- [x] Industry field changed to free text (no enum restriction)
- [x] Outreach history table designed (future-proof fields included)
- [x] API routes planned (7 endpoints)
- [x] Folder structure finalized
- [x] Technical Review Report process established (mandatory every phase)
- [x] Architecture Validation Report approved (v3)
- [x] Append-only evaluation history — new record per evaluation, never overwrite (ARCH-012)
- [x] Lead source tracking field added to companies table (ARCH-013)
- [x] Denormalized score fields on companies for dashboard performance (ARCH-012)

## Process Rule (mandatory)
After every implementation phase, generate a full 13-section Technical Review Report. Wait for explicit user approval before starting the next phase. No exceptions.

---

## Current Project Status

**No code has been written. No database has been created. No project has been initialized.**

All work completed so far is design, architecture, and documentation.

---

## Exact Next Step

**BEGIN PHASE 1 — Foundation**

1. Initialize Next.js 14 project with TypeScript
2. Create Supabase project — obtain `DATABASE_URL`
3. Configure `.env` with connection string
4. Install Prisma — configure datasource (postgresql)
5. Write complete `schema.prisma` (4 tables, all fields, all indexes)
6. Run `prisma migrate dev --name init`
7. Run `prisma generate`
8. Write `lib/types.ts`, `lib/constants.ts`, `lib/db.ts`
9. Write `lib/scoring.ts`, `lib/diagnosis.ts`, `lib/service_match.ts`, `lib/value-estimator.ts`
10. Write `prisma/seed.ts` with 5 sample companies
11. Run `prisma db seed` — verify in Supabase dashboard
12. Generate Technical Review Report → wait for approval

**Phase 1 does NOT include:** any UI components, any API routes, any dashboard pages.

---

```
PROJECT STATUS:          Architecture Approved
READY FOR:               Phase 1
LAST COMPLETED MILESTONE: Final Architecture Validation Report Approved (v3)
```
