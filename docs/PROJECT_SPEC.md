# PROJECT_SPEC.md
# Kronos Lead Intelligence — Official Technical Specification

> Version: 3.0 | Status: Approved | Date: 2026-06-10
> This is the single source of truth for all technical and business decisions.

---

## 1. Executive Summary

Kronos Lead Intelligence is an internal sales intelligence dashboard built for Kronos Data, a consulting company specializing in automation, operational efficiency, and business growth.

The system enables the Kronos sales team to:
- Discover businesses with visible, diagnosable pain points
- Score each business on a 0–100 opportunity scale
- Estimate how much revenue the business is losing monthly
- Receive a tailored recommendation of which Kronos services to propose
- Track the full commercial journey from first evaluation to signed client

The system is designed to answer three sales questions instantly:
1. **Who has pain?** (Opportunity score + priority level)
2. **How much are they losing?** (Revenue Opportunity Module)
3. **What should we sell them?** (Service Match Engine)

---

## 2. Business Requirements

### Primary Objective
Help Kronos Data identify high-value sales opportunities among Spanish-speaking businesses by detecting visible operational pain points and quantifying their business impact.

### Target Market
- Spanish-speaking businesses
- Priority countries: Peru, Mexico, Colombia, Chile, Spain

### Initial Target Industries
Dental clinics, real estate agencies, law firms — plus any other industry Kronos encounters. The system places no restriction on industry type.

### Pain Points Being Detected
- Lost leads (no capture mechanism, no follow-up)
- Slow response times (leads going cold)
- Weak customer follow-up (prospects lost post-contact)
- Missed appointments (no booking system)
- Manual repetitive work (automation candidates)
- Revenue leakage (unconverted traffic)
- Poor conversion processes (no CTA, no clear path)
- Weak online presence (invisible to potential clients)

### Business Constraints
- Internal tool only — no public access
- No authentication required for MVP
- No automated data collection
- No CRM features
- Signals entered manually by sales reps

---

## 3. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | Store companies in a persistent database |
| FR-02 | Allow manual entry of company data and contact channels |
| FR-03 | Allow evaluation of each company via 15 boolean signal flags |
| FR-04 | Auto-calculate opportunity score (0–100) on save |
| FR-05 | Auto-generate pain point diagnosis on save |
| FR-06 | Auto-recommend Kronos services based on signals |
| FR-07 | Auto-estimate revenue loss (monthly leads + revenue + ROI) |
| FR-08 | Assign priority level (HOT / HIGH / MEDIUM / LOW) |
| FR-09 | Display all companies in a ranked dashboard table |
| FR-10 | Filter by country, industry, priority, score range |
| FR-11 | Sort by opportunity score (default descending) |
| FR-12 | Show full company detail view with all diagnosis outputs |
| FR-13 | Allow editing of company info and signals |
| FR-14 | Store and display commercial notes (sales_notes) |
| FR-15 | Log outreach attempts with channel, message, and response |
| FR-16 | Track follow-up dates for outreach |
| FR-17 | Export company list to CSV |

---

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | Internal use only — no public registration or login (MVP) |
| NFR-02 | Response time under 2 seconds for all dashboard queries |
| NFR-03 | Scoring and diagnosis computed server-side, stored on save |
| NFR-04 | All business logic in pure, testable functions in lib/ |
| NFR-05 | TypeScript throughout — no implicit `any` types |
| NFR-06 | Evaluations are append-only — every re-evaluation creates a new record, none are ever overwritten |
| NFR-06b | Dashboard sorting and filtering uses denormalized fields on `companies` — no lateral joins at read time |
| NFR-07 | Schema prepared for AI enrichment without migration |
| NFR-08 | Schema prepared for outreach automation without migration |
| NFR-09 | Deployable to Vercel with zero additional infrastructure |

---

## 5. Technology Stack

| Layer | Technology | Version | Reason |
|---|---|---|---|
| Framework | Next.js | 14 (App Router) | Full-stack in one repo, best DX for internal dashboards |
| Language | TypeScript | 5.x | Type safety across frontend and backend |
| UI Library | Tailwind CSS | 3.x | Utility-first, minimal, fast to build |
| Component Library | shadcn/ui | Latest | Clean accessible components, no design system needed |
| Database | PostgreSQL | 15 via Supabase | Production-ready, no future migration needed |
| ORM | Prisma | 5.x | Type-safe queries, schema-as-code, clean migrations |
| Forms | React Hook Form + Zod | Latest | Fast form handling with schema validation |
| Charts | Recharts | Latest | Lightweight score visualization |
| Hosting | Vercel | — | Native Next.js support, one-command deploy |

---

## 6. Database Architecture

### Design Principles
- One company can have many evaluations — **append-only, never overwrite**
- Every re-evaluation creates a new `evaluations` record; previous records are permanently preserved
- `companies` holds three denormalized fields (`latest_opportunity_score`, `latest_priority_level`, `latest_evaluated_at`) updated atomically on every new evaluation — enables O(1) dashboard sorting without joins
- One company can have many sales_notes entries (supports conversation history)
- One company can have unlimited outreach_history entries (core design)
- All computed fields (scores, diagnosis, service match) stored on save — not recalculated at read time
- Future-proofing fields included in outreach_history (is_automated, template_used, sequence_number) — unused in MVP

### Table Overview

| Table | Rows in MVP | Purpose |
|---|---|---|
| companies | 1 per business | Identity and contact data |
| evaluations | 1 per company (MVP) | Signals + scores + diagnosis + revenue + service match |
| sales_notes | 1 per company (MVP) | Commercial workflow |
| outreach_history | N per company | Full outreach log |

---

### Table: `companies`

```
id                        UUID         PK, DEFAULT gen_random_uuid()
name                      TEXT         NOT NULL
industry                  TEXT         NOT NULL  (free text — no enum)
country                   TEXT         NOT NULL
city                      TEXT
website                   TEXT
whatsapp                  TEXT
instagram                 TEXT
linkedin                  TEXT
google_business_url       TEXT
status                    TEXT         DEFAULT 'active'
lead_source               TEXT         (nullable)
                                       -- google_maps / linkedin / instagram / facebook
                                       -- referral / website / cold_outreach / event / other
latest_opportunity_score  INTEGER      DEFAULT 0
                                       (denormalized — updated atomically on every new evaluation)
latest_priority_level     TEXT         DEFAULT 'low'
                                       (denormalized — hot / high / medium / low)
latest_evaluated_at       TIMESTAMPTZ  (denormalized — timestamp of most recent evaluation)
created_at                TIMESTAMPTZ  DEFAULT now()
updated_at                TIMESTAMPTZ  DEFAULT now()
```

**Status values:** active | contacted | client | archived

**Industry suggestions (UI only, not enforced in DB):**
dental, real_estate, law_firm, construction, logistics, healthcare,
education, consulting, automotive, agency, restaurant, retail, other

**Country values:** peru | mexico | colombia | chile | spain

---

### Table: `evaluations`

```
id                              UUID         PK
company_id                      UUID         FK → companies.id CASCADE DELETE
evaluated_by                    TEXT         NOT NULL

-- SIGNALS (15 boolean flags)
signal_has_website              BOOLEAN      DEFAULT false
signal_has_whatsapp             BOOLEAN      DEFAULT false
signal_has_contact_form         BOOLEAN      DEFAULT false
signal_has_booking_system       BOOLEAN      DEFAULT false
signal_has_instagram            BOOLEAN      DEFAULT false
signal_has_linkedin             BOOLEAN      DEFAULT false
signal_has_google_business      BOOLEAN      DEFAULT false
signal_has_reviews              BOOLEAN      DEFAULT false
signal_has_unanswered_reviews   BOOLEAN      DEFAULT false
signal_has_clear_cta            BOOLEAN      DEFAULT false
signal_has_lead_capture         BOOLEAN      DEFAULT false
signal_slow_response            BOOLEAN      DEFAULT false
signal_weak_followup            BOOLEAN      DEFAULT false
signal_manual_work              BOOLEAN      DEFAULT false
signal_weak_online_presence     BOOLEAN      DEFAULT false

-- COMPUTED SCORES (0–100)
score_lead_generation           INTEGER
score_follow_up                 INTEGER
score_conversion_process        INTEGER
score_automation_opportunity    INTEGER
score_online_presence           INTEGER
score_reputation                INTEGER
opportunity_score               INTEGER

-- DIAGNOSIS
priority_level                  TEXT
detected_problems               TEXT[]
probable_pain_point             TEXT
recommended_solution            TEXT
estimated_value_min             INTEGER      (USD, rough estimate)
estimated_value_max             INTEGER      (USD, rough estimate)

-- REVENUE OPPORTUNITY MODULE
estimated_leads_lost_per_month  INTEGER
estimated_revenue_lost_per_month INTEGER     (USD)
estimated_roi_potential         INTEGER      (USD)

-- SERVICE MATCH ENGINE
recommended_services            TEXT[]
implementation_difficulty       TEXT         (low | medium | high)
implementation_time_estimate    TEXT
estimated_project_price_min     INTEGER      (USD, service-match precision)
estimated_project_price_max     INTEGER      (USD, service-match precision)

evaluated_at                    TIMESTAMPTZ  DEFAULT now()
updated_at                      TIMESTAMPTZ  DEFAULT now()
```

---

### Table: `sales_notes`

```
id                  UUID         PK
company_id          UUID         FK → companies.id CASCADE DELETE

contact_name        TEXT
contact_role        TEXT
contact_phone       TEXT
contact_email       TEXT

contact_status      TEXT         DEFAULT 'not_contacted'
meeting_status      TEXT         DEFAULT 'not_scheduled'
meeting_date        TIMESTAMPTZ
meeting_notes       TEXT

budget_min          INTEGER
budget_max          INTEGER
budget_currency     TEXT         DEFAULT 'USD'
objections          TEXT
follow_up_notes     TEXT
sales_observations  TEXT

next_action         TEXT
next_action_date    DATE
assigned_to         TEXT

close_probability   INTEGER      (0–100)
lost_reason         TEXT

created_at          TIMESTAMPTZ  DEFAULT now()
updated_at          TIMESTAMPTZ  DEFAULT now()
```

**contact_status values:** not_contacted | attempted | contacted | in_conversation | proposal_sent | negotiating | closed_won | closed_lost

**meeting_status values:** not_scheduled | scheduled | completed | no_show | rescheduled

---

### Table: `outreach_history`

```
id                  UUID         PK
company_id          UUID         FK → companies.id CASCADE DELETE

channel             TEXT         NOT NULL
message_sent        TEXT
sent_by             TEXT
sent_at             TIMESTAMPTZ  DEFAULT now()

response_received   BOOLEAN      DEFAULT false
response_type       TEXT
response_notes      TEXT
replied_at          TIMESTAMPTZ  (nullable)

next_follow_up_at   DATE         (nullable)

sequence_number     INT          DEFAULT 1
template_used       TEXT         (nullable — future AI)
channel_account     TEXT         (nullable — future multi-account)
is_automated        BOOLEAN      DEFAULT false (future automation)

created_at          TIMESTAMPTZ  DEFAULT now()
updated_at          TIMESTAMPTZ  DEFAULT now()
```

**channel values:** linkedin | email | whatsapp | instagram | call | other

**response_type values:** interested | not_interested | no_response | asked_to_follow_up | booked_call | closed_won | closed_lost

**Indexes:** company_id · sent_at · channel · response_type · next_follow_up_at

---

## 7. Prisma Models

All models use `@map` decorators to maintain snake_case in PostgreSQL while using camelCase in TypeScript. All models use `@@map` to set the PostgreSQL table name.

Key model relationships in Prisma schema:
- `Company` has `evaluations Evaluation[]`, `salesNotes SalesNote[]`, `outreachHistory OutreachHistory[]`
- All child models have `company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)`

Full Prisma schema is maintained in `prisma/schema.prisma`.

---

## 8. Relationships

```
companies ─────────────────────────────────────────────────────────
    │
    ├──< evaluations       (1 active per company in MVP, many supported)
    │       └── scores + diagnosis + revenue impact + service match
    │
    ├──< sales_notes       (1 active per company in MVP, many supported)
    │       └── commercial workflow + contact status + next actions
    │
    └──< outreach_history  (unlimited — every attempt is a permanent record)
            └── channel + message + response + follow-up date
```

All children cascade delete when parent company is deleted.

---

## 9. Scoring Engine Specification

**File:** `lib/scoring.ts`
**Pattern:** Pure functions — no database access, no side effects, fully testable.

### Signal-to-Category Mapping

Each of the 15 signals belongs to exactly one category.

#### Lead Generation (Weight: 25%)
| Signal | Problem Condition | Points |
|---|---|---|
| signal_has_contact_form | FALSE | +40 |
| signal_has_whatsapp | FALSE | +35 |
| signal_weak_online_presence | TRUE | +25 |
| Max | | 100 |

#### Customer Follow-up (Weight: 25%)
| Signal | Problem Condition | Points |
|---|---|---|
| signal_slow_response | TRUE | +50 |
| signal_weak_followup | TRUE | +50 |
| Max | | 100 |

#### Conversion Process (Weight: 20%)
| Signal | Problem Condition | Points |
|---|---|---|
| signal_has_clear_cta | FALSE | +55 |
| signal_has_lead_capture | FALSE | +45 |
| Max | | 100 |

#### Automation Opportunity (Weight: 15%)
| Signal | Problem Condition | Points |
|---|---|---|
| signal_manual_work | TRUE | +60 |
| signal_has_booking_system | FALSE | +40 |
| Max | | 100 |

#### Online Presence (Weight: 10%)
| Signal | Problem Condition | Points |
|---|---|---|
| signal_has_website | FALSE | +50 |
| signal_has_instagram | FALSE | +30 |
| signal_has_linkedin | FALSE | +20 |
| Max | | 100 |

#### Reputation (Weight: 5%)
| Signal | Problem Condition | Points |
|---|---|---|
| signal_has_google_business | FALSE | +40 |
| signal_has_reviews | FALSE | +30 |
| signal_has_unanswered_reviews | TRUE | +30 |
| Max | | 100 |

### Final Score Formula

```typescript
opportunity_score = Math.round(
  score_lead_generation        * 0.25 +
  score_follow_up              * 0.25 +
  score_conversion_process     * 0.20 +
  score_automation_opportunity * 0.15 +
  score_online_presence        * 0.10 +
  score_reputation             * 0.05
)
```

### Priority Thresholds

| Score Range | Level | Label | Recommended Action |
|---|---|---|---|
| 80–100 | 1 | HOT | Contact this week |
| 60–79 | 2 | HIGH | Contact within 2 weeks |
| 40–59 | 3 | MEDIUM | Nurture — 30-day follow-up |
| 0–39 | 4 | LOW | Park — 90-day review |

---

## 10. Revenue Opportunity Module Specification

**File:** `lib/value-estimator.ts`

### Purpose
Give sales reps concrete financial numbers to use in client conversations. Not audited data — estimates based on signal patterns and industry averages.

### Calculation Logic

**Step 1 — Estimate leads lost per month**
Based on lead generation and follow-up scores × industry baseline contact volume.

```
leads_lost = (score_lead_generation + score_follow_up) / 200 * industry_monthly_contact_volume
```

**Step 2 — Estimate revenue lost per month**
```
revenue_lost = leads_lost * industry_average_deal_value
```

Industry average deal values (defaults, overridable):
- Dental: $200 per patient
- Real Estate: $3,000 per transaction
- Law Firm: $1,500 per case
- Other: $500 per transaction

**Step 3 — Estimate ROI potential**
```
roi_potential = revenue_lost * 0.40  (40% recovery rate assumption)
```

### Important
- All values are auto-calculated and stored on evaluation save
- Sales reps can manually override in the detail view
- Values must be presented as estimates in sales conversations

---

## 11. Service Match Engine Specification

**File:** `lib/service_match.ts`

### Purpose
Map detected signal patterns to specific Kronos billable services. Outputs are stored in `evaluations` on every save.

### Kronos Services Catalog

| Service | Trigger Signals | Difficulty | Time | Price Range |
|---|---|---|---|---|
| WhatsApp Automation | !whatsapp OR slow_response OR weak_followup | Low | 1–2 weeks | $600–$1,200 |
| Appointment Booking System | !booking_system | Low–Med | 2–3 weeks | $800–$1,800 |
| Lead Capture Funnel | !contact_form OR !lead_capture OR !cta | Medium | 2–4 weeks | $1,000–$2,500 |
| CRM & Follow-up Automation | weak_followup AND manual_work | Medium | 3–5 weeks | $1,200–$2,500 |
| Google Business Setup | !google_business | Low | 1 week | $300–$600 |
| Review Management | unanswered_reviews | Low | 1–2 weeks | $400–$800 |
| Social Media Presence Package | !instagram AND weak_online_presence | Medium | 3–4 weeks | $800–$1,500 |
| Website Development | !website | High | 6–10 weeks | $2,500–$6,000 |
| Sales Process Automation | slow_response AND weak_followup AND manual_work | High | 4–8 weeks | $2,000–$5,000 |
| Digital Presence Audit | weak_online_presence (catch-all) | Low | 1 week | $300–$500 |

### Output Calculation
1. Evaluate all 10 service trigger conditions against detected signals
2. Collect all matched services into `recommended_services[]`
3. Aggregate price ranges (sum all matched min/max values)
4. Set `implementation_difficulty` to highest difficulty among matched services
5. Set `implementation_time_estimate` to realistic total time range

---

## 12. API Specification

All endpoints under `/api/companies`.

### GET `/api/companies`
Returns list of companies sorted by `latest_opportunity_score DESC` (denormalized field — no joins required).

**Query parameters:** `country`, `industry`, `priority_level` (maps to `latest_priority_level`), `score_min`, `score_max`, `search`, `sort_by`

**Response:** Array of company objects including `latest_opportunity_score`, `latest_priority_level`, `latest_evaluated_at`.

### POST `/api/companies`
Creates a new company + first evaluation + sales_note in a single database transaction. Also sets `latest_opportunity_score`, `latest_priority_level`, `latest_evaluated_at` on the company record.

**Body:** Company fields (including `lead_source`) + all 15 signal flags + evaluated_by

**Processing:** Run scoring engine → diagnosis → revenue module → service match → insert evaluation → update company denormalized fields. All in one transaction.

### GET `/api/companies/:id`
Returns full company detail including latest evaluation and all related records.

**Response:** Company + latest evaluation (all fields, from most recent record) + sales_note + outreach_history (ordered by sent_at DESC)

### PUT `/api/companies/:id`
Updates company **identity fields only** — name, industry, country, city, website, social links, lead_source, status. **Does NOT create or modify any evaluation.** Signal re-evaluation requires a separate POST to `/evaluations`.

### DELETE `/api/companies/:id`
Deletes company and all related records via cascade.

### GET `/api/companies/:id/evaluations`
Returns full evaluation history for a company — all records ordered newest first. Enables score trend analysis over time.

**Response:** Array of all evaluation records with all fields. Client can compute score delta between evaluations.

### POST `/api/companies/:id/evaluations`
Creates a new evaluation record for a company (re-evaluation). **Append-only — never modifies existing records.**

**Body:** All 15 signal flags + evaluated_by

**Processing:** Run full scoring pipeline → insert new evaluation record → update company `latest_opportunity_score`, `latest_priority_level`, `latest_evaluated_at` atomically.

### GET `/api/companies/:id/outreach`
Returns all outreach history for a company ordered by `sent_at DESC`.

### POST `/api/companies/:id/outreach`
Logs a new outreach attempt.

**Body:** channel, message_sent, sent_by, sent_at, response_received, response_type, response_notes, replied_at, next_follow_up_at

**Auto-set:** sequence_number (count of existing records + 1)

---

## 13. UI Module Specification

### Dashboard Page (`/dashboard`)
- Stats bar: total companies, HOT count, HIGH count, average score
- Filter bar: country, industry, priority, score range slider, search
- Company table: sortable by score (default), name, industry, country
- Each row: company name, industry, country, score badge, priority badge, View button

### Add Company (`/companies/new`)
Two-step form:
- Step 1: Basic info (name, industry combobox, country, city, social channels)
- Step 2: Signal checklist (15 boolean flags with clear labels)
- On submit: API call → score computed → redirect to detail view

### Company Detail (`/companies/:id`)
- Header: company name, score, priority badge, Edit button
- Diagnosis Panel: pain point, recommended solution, detected problems list
- Score Breakdown: bar chart per category (6 bars)
- Service Match Panel: recommended services, difficulty, time, price range
- Revenue Opportunity Panel: leads lost/month, revenue lost/month, ROI potential
- Sales Notes Panel: editable contact status, meeting info, next action
- Outreach History: timeline of all attempts with channel icons and response status

### Edit Company (`/companies/:id/edit`)
Same two-step form as Add Company, pre-filled with existing values.

### Components List
- `StatsBar.tsx` — dashboard summary numbers
- `FilterBar.tsx` — filter and search controls
- `CompanyTable.tsx` — sortable ranked table
- `PriorityBadge.tsx` — HOT/HIGH/MEDIUM/LOW colored badge
- `CompanyForm.tsx` — add/edit form container
- `SignalsChecklist.tsx` — 15 boolean signal inputs with labels
- `DiagnosisPanel.tsx` — pain point + recommended solution
- `ScoreBreakdown.tsx` — category score bar chart
- `SalesNotesPanel.tsx` — commercial workflow editor
- `OutreachHistory.tsx` — timeline of outreach attempts
- `OutreachForm.tsx` — log new outreach attempt

---

## 14. Folder Structure

```
kronos-lead-intelligence/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          → redirect /dashboard
│   ├── dashboard/
│   │   └── page.tsx
│   ├── companies/
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/
│   │           └── page.tsx
│   └── api/
│       └── companies/
│           ├── route.ts
│           └── [id]/
│               ├── route.ts
│               └── outreach/
│                   └── route.ts
│
├── components/
│   ├── ui/                               shadcn/ui (untouched)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── dashboard/
│   │   ├── StatsBar.tsx
│   │   ├── FilterBar.tsx
│   │   └── CompanyTable.tsx
│   └── companies/
│       ├── CompanyForm.tsx
│       ├── SignalsChecklist.tsx
│       ├── DiagnosisPanel.tsx
│       ├── ScoreBreakdown.tsx
│       ├── SalesNotesPanel.tsx
│       ├── PriorityBadge.tsx
│       └── outreach/
│           ├── OutreachHistory.tsx
│           └── OutreachForm.tsx
│
├── lib/
│   ├── db.ts
│   ├── scoring.ts
│   ├── diagnosis.ts
│   ├── service_match.ts
│   ├── value-estimator.ts
│   ├── types.ts
│   └── constants.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── docs/
│   ├── PROJECT_SPEC.md       (this file)
│   ├── PROJECT_MEMORY.md
│   └── CHANGELOG.md
│
├── .env
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 15. Development Roadmap

### Phase 1 — Foundation
Initialize project, configure database, implement all business logic, seed data.

Tasks:
1. Initialize Next.js 14 + TypeScript
2. Configure Tailwind + shadcn/ui
3. Create Supabase project + obtain DATABASE_URL
4. Configure Prisma with PostgreSQL datasource
5. Write `schema.prisma` — all 4 tables, fields, indexes
6. Run `prisma migrate dev --name init`
7. Run `prisma generate`
8. Write `lib/types.ts`, `lib/constants.ts`, `lib/db.ts`
9. Write `lib/scoring.ts` (pure functions)
10. Write `lib/diagnosis.ts`
11. Write `lib/service_match.ts`
12. Write `lib/value-estimator.ts`
13. Write `prisma/seed.ts` (5 sample companies)
14. Run seed — verify in Supabase dashboard
15. Generate Technical Review Report → await approval

### Phase 2 — API Layer
Build all 7 API endpoints. No UI yet.

### Phase 3 — Data Entry
Company creation form + signal checklist. Score computed on submit.

### Phase 4 — Dashboard
Company table, filters, stats bar, sort by score.

### Phase 5 — Detail View
Diagnosis panel, score breakdown, service match, revenue module, sales notes, outreach history.

### Phase 6 — Polish
CSV export, priority badges, inline editing, final UI cleanup.

### Future Phases (Post-MVP — Architecture Prepared)
- AI signal detection from URL (paste URL → auto-fill signals)
- AI outreach message generation
- Outreach automation (`is_automated` flag ready)
- Chrome extension for signal capture
- Multi-evaluation timeline per company
- Team authentication
- Channel performance analytics

---

## 16. Risks and Limitations

| Risk | Type | Severity | Mitigation |
|---|---|---|---|
| Manual signal entry inaccuracy | Business | Medium | Training guides, signal definitions in UI tooltips |
| Revenue estimates are approximations | Business | Medium | Label clearly as "estimates" in UI |
| Rule-based service match (no AI) | Technical | Medium | Manual override in detail view |
| No authentication in MVP | Security | High | Keep URL private, add auth in Phase 2 post-MVP |
| One evaluation per company loses history | Technical | Low | Schema supports multiple; add UI toggle later |
| Free-text industry → inconsistent data | Data | Low | UI combobox with canonical suggestions |
| Supabase free tier 500MB limit | Infrastructure | Low | Upgrade plan when needed |
| sales_notes has no activity log | Business | Low | Add conversation log feature post-MVP |

---

## 17. Future Enhancements

These features are architecturally prepared but not built in MVP:

| Feature | Preparation in Current Schema |
|---|---|
| AI signal detection from URL | `lib/` structure ready for new enrichment module |
| AI outreach message generation | `template_used` field in `outreach_history` |
| Outreach automation | `is_automated`, `channel_account` fields ready |
| Evaluation score trend charts | `evaluated_at` + `opportunity_score` per record enable timeline visualization |
| Follow-up prioritization engine | `next_follow_up_at` indexed and queryable |
| Channel performance analytics | `channel` + `response_type` fully indexed |
| Lead lifecycle analytics | `sequence_number`, `sent_at`, `replied_at` available |
| Team authentication | NextAuth.js compatible with Next.js 14 App Router |
| Chrome extension | Separate project — reads from same database |
| PostgreSQL to production scaling | Already on PostgreSQL — no migration needed |
