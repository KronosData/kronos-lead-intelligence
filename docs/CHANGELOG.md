# CHANGELOG.md
# Kronos Lead Intelligence — Decision History

> This file records every major architectural and business decision made during the design phase.
> Format: Date · Decision · Reason · Impact

---

## Session 1 — 2026-06-10

---

### [ARCH-001] Initial Project Vision Approved

**Date:** 2026-06-10
**Decision:** Define Kronos Lead Intelligence as an internal sales intelligence dashboard — not a SaaS, not a CRM, not a Chrome extension.
**Reason:** Kronos Data needs a fast, focused tool to identify and prioritize consulting sales opportunities. Generic software would add complexity without business value.
**Impact:** All subsequent design decisions are constrained to internal use, manual operation, and sales workflow support. No public auth, no multi-tenancy, no automated scraping in MVP.

---

### [ARCH-002] Technology Stack Selected

**Date:** 2026-06-10
**Decision:** Next.js 14 (App Router + TypeScript) + Tailwind CSS + shadcn/ui + PostgreSQL via Supabase + Prisma ORM + Vercel hosting.
**Reason:** Single-repo full-stack setup with zero infrastructure overhead. Supabase eliminates the need for a managed PostgreSQL server. Prisma provides type safety. shadcn/ui provides clean minimal components without a custom design system.
**Impact:** Fastest path to a working MVP. No separate backend service. No infrastructure management beyond the Supabase dashboard.

---

### [ARCH-003] Database Provider Changed from SQLite to PostgreSQL via Supabase

**Date:** 2026-06-10
**Decision:** Replace initially proposed SQLite with PostgreSQL hosted on Supabase.
**Reason:** SQLite is a local file and becomes a blocker the moment a second team member needs access or the system runs from multiple locations. Supabase provides production-grade PostgreSQL with a built-in dashboard, backups, and future API layer — all on a free tier that covers MVP scale. No migration will ever be needed.
**Impact:** The project is production-ready from day one. All SQL types, indexing, and array fields (TEXT[]) are fully supported. Supabase dashboard provides visual database inspection without extra tooling.

---

### [ARCH-004] Initial 2-Table Schema Approved

**Date:** 2026-06-10
**Decision:** Initial schema designed with two tables: `companies` and `evaluations`.
**Reason:** Minimal viable schema that separates business identity from evaluation data, allowing multiple evaluations per company over time.
**Impact:** Foundation for all future schema additions. Cascade delete ensures data integrity.

---

### [ARCH-005] `sales_notes` Table Added

**Date:** 2026-06-10
**Decision:** Add a third table `sales_notes` to store commercial intelligence separate from technical evaluation.
**Reason:** The evaluation table captures signals and scores. Commercial workflow data (contact status, meeting notes, objections, budget, next actions) belongs in a separate table so it can evolve independently of the evaluation logic.
**Impact:** Schema grows to 3 tables. The system now tracks not just "who has pain" but "what is the commercial status of this opportunity." Supports future multi-step sales workflow management.

**Fields added:** contact_name, contact_role, contact_phone, contact_email, contact_status (7 states), meeting_status (5 states), meeting_date, meeting_notes, budget_min, budget_max, budget_currency, objections, follow_up_notes, sales_observations, next_action, next_action_date, assigned_to, close_probability, lost_reason.

---

### [ARCH-006] Scoring Weight Philosophy Revised

**Date:** 2026-06-10
**Decision:** Revised scoring weights to prioritize revenue loss over automation maturity.

**Previous weights:**
- Automation Readiness: 25%
- Customer Follow-up: 25%
- Lead Generation: 20%
- Online Presence: 15%
- Reputation: 10%
- Conversion: 5%

**New weights:**
- Lead Generation: 25%
- Customer Follow-up: 25%
- Conversion Process: 20%
- Automation Opportunity: 15%
- Online Presence: 10%
- Reputation: 5%

**Reason:** The goal is identifying companies losing revenue today, not simply companies lacking automation tools. A business with poor lead capture and no follow-up is actively bleeding money. A business without automation is missing efficiency. Revenue loss is more urgent and directly maps to Kronos service urgency.
**Impact:** Companies with poor lead capture and follow-up now score higher. Companies that only lack technical automation (but capture leads well) score lower. This aligns scoring with Kronos's primary value proposition: stopping revenue leakage.

---

### [ARCH-007] `outreach_history` Table Added

**Date:** 2026-06-10
**Decision:** Add a fourth table `outreach_history` to store every outreach attempt and response permanently.
**Reason:** Without this table, the system has no memory of which businesses were contacted, through which channel, when, and what happened. The commercial journey from diagnosis to client is invisible. Every outreach attempt must be a permanent, queryable record.
**Impact:** Schema grows to 4 tables. The system can now track the full commercial lifecycle. Indexes on company_id, sent_at, channel, response_type, and next_follow_up_at enable all planned analytics queries.

**Future-proofing fields included (unused in MVP):**
- `sequence_number` — tracks which attempt this is (1st, 2nd, 3rd...)
- `template_used` — for future AI message generation tracking
- `channel_account` — for future multi-account outreach
- `is_automated` — for future outreach automation

---

### [ARCH-008] Industry Field Changed from Enum to Free Text

**Date:** 2026-06-10
**Decision:** Remove the database-level industry enum restriction. Change `industry` to a free text field with predefined UI suggestions.
**Reason:** Restricting industry to dental, real estate, and law firm prevents Kronos from evaluating construction companies, logistics firms, marketing agencies, healthcare providers, educators, automotive businesses, and any other industry they encounter. The system should work for any business Kronos wants to evaluate.
**Impact:** No schema change required — field was already TEXT. Change is entirely in the UI (combobox with suggestions instead of a locked dropdown). Data consistency risk is mitigated by showing canonical suggestions. Filter and analytics queries must handle case-insensitive matching.

**Predefined UI suggestions (not enforced in DB):**
dental, real_estate, law_firm, construction, logistics, healthcare, education, consulting, automotive, agency, restaurant, retail, other

---

### [ARCH-009] Revenue Opportunity Module Added

**Date:** 2026-06-10
**Decision:** Add three revenue opportunity fields to `evaluations` table and implement `lib/value-estimator.ts`.
**Reason:** The sales team needs to communicate financial impact, not only technical problems. "You have a weak follow-up process" is abstract. "You are losing approximately $8,000 per month in unconverted leads" is a sales conversation. The system must quantify business pain in dollars, not just in signal counts.
**Impact:** Three new fields in `evaluations`: `estimated_leads_lost_per_month`, `estimated_revenue_lost_per_month`, `estimated_roi_potential`. New business logic module added to `lib/`. Revenue figures are auto-calculated on evaluation save and manually overridable by sales reps. Must be presented as estimates in client conversations.

---

### [ARCH-010] Service Match Engine Added

**Date:** 2026-06-10
**Decision:** Add `lib/service_match.ts` and five new fields to `evaluations` to map detected signals to specific Kronos billable services.
**Reason:** The dashboard should not only detect problems — it should recommend exactly what Kronos should sell and at what price. A sales rep leaving an evaluation session should know: which services to propose, how long implementation takes, and what price range to quote. This removes guesswork from the sales conversation.
**Impact:** Five new fields in `evaluations`: `recommended_services[]`, `implementation_difficulty`, `implementation_time_estimate`, `estimated_project_price_min`, `estimated_project_price_max`. New module `lib/service_match.ts` with a 10-service catalog. Services are mapped via signal pattern matching. Output is computed and stored on every evaluation save.

**Kronos Services Catalog (10 services):**
1. WhatsApp Automation
2. Appointment Booking System
3. Lead Capture Funnel
4. CRM & Follow-up Automation
5. Google Business Setup
6. Review Management
7. Social Media Presence Package
8. Website Development
9. Sales Process Automation
10. Digital Presence Audit

---

### [ARCH-011] Final Architecture Validated (v3)

**Date:** 2026-06-10
**Decision:** Architecture Validation Report v3 approved. All four modifications integrated. Ready to begin Phase 1.
**Reason:** Three full rounds of architecture review completed. All major business and technical decisions are documented and approved. No open questions remain on schema, scoring logic, or service catalog.
**Impact:** Phase 1 implementation can begin. The schema is final. No further design changes are expected before the first code is written. Any changes after Phase 1 begins will require a Change Request with impact analysis.

**Final readiness scores:**
- Architecture: 9/10
- Scalability: 8/10
- Maintainability: 9/10
- Business Alignment: 10/10

---

### [PROCESS-001] Technical Review Report Requirement Established

**Date:** 2026-06-10
**Decision:** After every implementation phase, generate a mandatory 13-section Technical Review Report before marking the phase complete. Wait for explicit user approval before beginning the next phase.
**Reason:** The report is reviewed simultaneously by a CTO, a business consultant, and an external auditor. No phase should be declared complete without this review being on record.
**Impact:** Every phase boundary requires a formal review cycle. This slows velocity slightly but ensures architectural integrity is maintained across all phases. The report covers: Phase Completed, Files Created, Folder Structure, Database Changes, Business Logic, Scoring Logic, Dashboard Components, Dependencies, Architecture Decisions, Future Risks, What Still Needs To Be Built, Readiness Assessment (1–10), and Executive Summary.

---

---

### [ARCH-012] Append-Only Evaluation History

**Date:** 2026-06-10
**Decision:** Switch evaluations to append-only architecture. Every re-evaluation creates a new `evaluations` record. Previous evaluations are never overwritten or deleted. Dashboard reads from three denormalized fields on `companies` (`latest_opportunity_score`, `latest_priority_level`, `latest_evaluated_at`) that are updated atomically in the same transaction as the new evaluation insert.
**Reason:** Overwriting evaluations permanently destroys historical data. A company re-evaluated after 3 months should show a score history — "was 45 in January, now 72 in June" — which is a powerful sales narrative and a measure of Kronos's impact. The denormalized fields on `companies` solve the dashboard sorting problem without complex lateral joins.
**Impact:**
- `companies` table gains 3 new fields: `latest_opportunity_score`, `latest_priority_level`, `latest_evaluated_at`
- `PUT /api/companies/:id` now updates identity fields only — no evaluation logic
- New endpoints: `GET /api/companies/:id/evaluations` (history) and `POST /api/companies/:id/evaluations` (re-evaluate)
- Total API endpoints: 7 → 9
- Seed data must create multiple evaluations per company to demonstrate the history feature

---

### [ARCH-013] Lead Source Field Added to `companies`

**Date:** 2026-06-10
**Decision:** Add `lead_source TEXT` (nullable) to the `companies` table.
**Reason:** Without lead source data, Kronos cannot answer: "Are our LinkedIn leads scoring higher than our Google Maps leads? Which prospecting channel produces the highest-priority opportunities?" This single field enables channel attribution analysis with zero additional infrastructure.
**Impact:**
- `companies` table gains 1 new field: `lead_source TEXT` (nullable)
- `companies` field count: 13 → 14 (before denormalized fields) → 17 (including denormalized)
- `POST /api/companies` body includes `lead_source`
- `PUT /api/companies/:id` body includes `lead_source`
- Seed data should include varied lead sources across the 5 sample companies
- UI: combobox with predefined suggestions in company form

**Lead source suggestions (UI only, not enforced in DB):**
google_maps, linkedin, instagram, facebook, referral, website, cold_outreach, event, other

---

## Pending — To Be Logged After Implementation

| Entry | Trigger |
|---|---|
| [PHASE-001] Phase 1 Completed | After Phase 1 Technical Review Report is approved |
| [PHASE-002] Phase 2 Completed | After Phase 2 Technical Review Report is approved |
| [PHASE-003] Phase 3 Completed | After Phase 3 Technical Review Report is approved |
| [PHASE-004] Phase 4 Completed | After Phase 4 Technical Review Report is approved |
| [PHASE-005] Phase 5 Completed | After Phase 5 Technical Review Report is approved |
| [PHASE-006] Phase 6 Completed | After Phase 6 Technical Review Report is approved |
