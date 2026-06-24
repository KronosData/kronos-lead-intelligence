# V2 Prospect Signal Engine — Technical Cleanup Report

**Branch:** `v2-clean-prospect-signal-engine`  
**Date:** 2026-06-13  
**Build status:** ✅ `npx tsc --noEmit` → 0 errors · `npm run build` → 0 errors  

---

## 1. Executive Summary

This refactor converts Kronos Lead Intelligence from an automatic business diagnostician into a lightweight **Symptom Detection + Pre-Qualification for Free 15-Minute Audit** engine.

**Core principle enforced throughout:** The app does NOT diagnose the client before talking to them. It only detects external visible symptoms that justify a free 15-minute audit. Diagnosis happens after the audit. Commercial proposal happens after the diagnosis.

All contaminated v1 logic (ROI estimates, revenue loss projections, auto-diagnoses, package recommendations before talking to the prospect) has been either archived or removed from the execution path.

---

## 2. Problem Statement — What Was Wrong With v1

| Contaminated behavior | Why it was a problem |
|---|---|
| `generateDiagnosis()` auto-created pain point narratives from boolean signals | Invented diagnoses without talking to the client |
| `estimateRevenueOpportunity()` generated `$X/month loss` figures | Revenue loss invented from industry averages, not real data |
| `computeRoiFit()` / `recommendPackage()` assigned ROI multiples pre-audit | Created a false sense of certainty before any conversation |
| `matchServices()` matched services from symptoms before qualification | Services recommended without knowing the client's real situation |
| SQS (Sales Qualification Score) mixed ROI + budget + fit into one opaque score | Conflated unverifiable estimates with observable signals |
| Outreach templates included `${revenue}/month` and `${painPoint}` claims | Outreach made factual claims about prospects that were invented, not observed |

---

## 3. New Architecture — Prospect Signal Engine v2

### 3.1 Signal Engine (`lib/signal-engine/`)

New clean engine with 7 files:

| File | Responsibility |
|---|---|
| `types.ts` | `ProspectSignalInput`, `ProspectSignals`, `CommercialStateV2`, `VisibleSymptom` |
| `icp-fit.ts` | ICP Fit Score (0–100) based on industry × country — no invented revenue |
| `visible-symptoms.ts` | Visible Symptoms Score (0–100) — only `positive`/`negative` confirmed evidence |
| `contactability.ts` | Contactability Score (0–100) — phone, WhatsApp, email, social presence |
| `commercial-state.ts` | `OFFER_AUDIT | CONTACT_READY | RESEARCH_REQUIRED | DISQUALIFIED` |
| `audit-questions.ts` | 3–5 targeted audit questions from confirmed symptoms |
| `index.ts` | `computeProspectSignals()` — orchestrates all 6 sub-engines |

### 3.2 New v2 Scores

| v2 field | Maps to DB field | Description |
|---|---|---|
| `icpFitScore` | `icpFitScore` | How well the company fits the ICP (0–100) |
| `visibleSymptomsScore` | `painScore` | Observable symptoms that justify contacting (0–100) |
| `contactabilityScore` | `contactabilityScore` | How reachable the prospect is (0–100) |
| `auditPriorityScore` | `salesOpportunityScore` | Composite priority score (0–100) |
| `commercialState` | `commercialState` + `latestPriorityLevel` | `OFFER_AUDIT | CONTACT_READY | RESEARCH_REQUIRED | DISQUALIFIED` |
| `auditHook` | `qualificationReason` | Primary outreach hook based on top symptom |
| `confirmedSymptoms` | `whyContact` (labels) | Evidence-backed symptoms only |
| `auditQuestions` | `qualificationQuestions` | Questions for the 15-min audit call |
| `disqualificationReason` | `disqualificationReason` | Reason for DISQUALIFIED state |

### 3.3 Audit Priority Score formula

```
APS = ICP Fit × 0.40 + Visible Symptoms × 0.35 + Contactability × 0.25
```

### 3.4 Commercial State decision tree

```
isCommercial=false                         → DISQUALIFIED
icpFitScore < 15                           → DISQUALIFIED
icpFitScore < 40                           → RESEARCH_REQUIRED
contactabilityScore < 30 AND coverage < 20 → RESEARCH_REQUIRED
visibleSymptomsScore > 0 AND icp >= 40     → OFFER_AUDIT
contactabilityScore >= 50                  → CONTACT_READY
else                                       → RESEARCH_REQUIRED
```

---

## 4. Archived v1 Files (with `@legacy` headers)

All archived files remain on disk for audit trail. They are NOT imported by any active route.

| File | Reason archived |
|---|---|
| `lib/value-estimator.ts` | Revenue loss / ROI projections invented from industry averages |
| `lib/roi-fit.ts` | ROI multiple scores without real client data |
| `lib/budget-capacity.ts` | Budget capacity scores from business size estimates |
| `lib/diagnosis.ts` | Auto-generated pain point narratives from boolean signals |
| `lib/composite-scorer.ts` | SQS composite that mixed unverifiable estimates with signals |
| `lib/service-match.ts` | Service matching before client conversation |
| `lib/package-mapper.ts` | Package recommendations before audit |
| `lib/prospect-fit.ts` | Phase 3.8 prospect fit (kept for metadata, scoring replaced) |
| `lib/sales-qualification.ts` | Phase 3.9 SQS pipeline (kept for metadata, scoring replaced) |

---

## 5. API Routes Updated

### 5.1 `POST /api/discovery/import` (Task 4 ✅)

- **Before:** Ran `computeScoresWithEvidence → generateDiagnosis → matchServices → estimateRevenueOpportunity → recommendPackage → applyEvidence → computeCommercialState` (7 contaminated pipeline stages)
- **After:** Single `computeProspectSignals()` call. No diagnosis, no revenue estimate, no package recommendation before audit.
- All v2 scores stored correctly. `isLegacyEval: false`. `evaluationSource: 'discovery_engine_v2'`.

### 5.2 `POST /api/companies/[id]/reprocess` (Task 5 ✅)

- **Before:** ~418 lines, full v1 pipeline with all contaminated stages
- **After:** ~180 lines, single `computeProspectSignals()` call
- Safety mechanism `isLowCoverageHold` preserved: if coverage drops from ≥40% to <40%, saves evaluation as history but doesn't overwrite company state
- Raw signals stored in Evaluation for transparency (no neutralization pre-storage)

### 5.3 `POST /api/companies/[id]/evaluate` (Task 6 ✅)

- Manual evaluation route — still accepts manual signal flags
- Runs v2 signal engine on manual evidence (`evidenceCoverage: 100%`)
- Output flagged with `isLegacyEval: true` — manual paradigm is legacy; `reprocess_engine_v2` is the preferred path
- `legacyReason` stored: "Evaluación manual con scoring legacy (v1) — scoring v2 calculado desde evidencia"

---

## 6. UI Updated

### 6.1 Company Detail Page (`app/companies/[id]/page.tsx`) (Task 7 ✅)

**Removed from EvaluationView:**
- Auto-generated revenue loss cards (`estimatedRevenueLostPerMonth`)
- Category scores section (hidden when `hasLegacyCategoryScores = false`)
- Pain point / recommended solution (hidden when null)
- Package recommendation panel

**Added to EvaluationView:**
- `ProspectSignalPanel` — shows v2 commercial state badge, ICP Fit / Visible Symptoms / Contactability score bars, audit hook, confirmed symptom badges, audit questions, disqualification reason, next action
- Fallback: CompositeScorePanel alias routes to ProspectSignalPanel for backward compatibility

**OutreachPanel — complete rewrite:**
- New `generateOutreachTemplate()` signature: accepts `commercialState`, `auditHook`, `confirmedSymptoms` — no revenue/diagnosis fields
- OFFER_AUDIT state → audit invitation template
- CONTACT_READY state → direct contact template (no diagnosis claims)
- RESEARCH_REQUIRED / DISQUALIFIED → no template shown (shows blocker notice instead)
- All templates include `https://www.kronosdata.tech/` exactly once
- Template type selector (package/individual/free_audit/exploratory) removed — type determined by commercial state

### 6.2 Discovery Page (`app/companies/discover/page.tsx`) (Task 8 ✅)

**Replaced:**
- `sqsBadge()` → `commercialStateBadge()` using `candidate.commercialState`
- `sellabilityBadge()` → removed (merged into commercial state)
- `roiBadge()` → `icpFitBadge()` showing `candidate.prospectFitScore`
- `budgetBadge()` → `contactabilityBadge()` showing `candidate.contactabilityScore`
- Table header "SQS" → "Estado"
- Column header "Calificación comercial" → "Señales visibles"
- Footer text updated to remove SQS language

**Post-import result badge** updated: shows `commercialStateBadge(result.priorityLevel)` and labels score "APS" (Audit Priority Score).

---

## 7. Type Safety

### 7.1 `lib/api-client.ts` updates

- Added `commercialState: string | null` and `websiteVerificationStatus: string | null` to `Company` interface
- Made all legacy Evaluation fields nullable (`scoreLeadGeneration | null`, etc.)
- Added `evaluationSource: string | null` and `isLegacyEval: boolean` to `Evaluation`

### 7.2 Null-safety fixes across UI

- `app/companies/[id]/page.tsx` — history table scores/priority, `setCompany` callback
- `app/companies/[id]/edit/page.tsx` — `priorityLevel` badge
- `app/companies/new/page.tsx` — all v1 evaluation fields wrapped in null guards

---

## 8. Scripts Created

### `scripts/cleanup-legacy-evaluations.ts`
- **Purpose:** Marks all existing v1 evaluations with `isLegacyEval: true`
- **Default:** Dry-run — shows count and sample, no writes
- **Apply:** Pass `--apply` flag to execute
- **Safety:** Batch-updates in chunks of 100 to avoid timeout

### `scripts/validate-prospect-signal-engine.ts`
- **Purpose:** 8 deterministic test cases for `computeProspectSignals()`
- **Cases cover:**
  1. Non-commercial entity → DISQUALIFIED
  2. Unknown industry (ICP < 15) → DISQUALIFIED
  3. All-positive evidence → no symptoms
  4. All-negative evidence, good ICP → OFFER_AUDIT + symptoms
  5. Zero coverage, no contact → RESEARCH_REQUIRED
  6. Partial negative signals → symptoms detected
  7. MISMATCH website → websiteMismatch symptom
  8. Denta Clear profile → OFFER_AUDIT (regression test)

---

## 9. Security Constraints Compliance

| Constraint | Status |
|---|---|
| HERE_API_KEY server-only, never NEXT_PUBLIC | ✅ Not touched |
| DATABASE_URL never hardcoded | ✅ Only in .env via process.env |
| No new login modifications | ✅ Auth routes untouched |
| No Supabase/Vercel env changes | ✅ Not touched |
| No auto outreach sending | ✅ Templates are generate-only, no send |
| No company deletion | ✅ No delete operations performed |
| No Kronos Data test company deletion | ✅ Not touched |
| Official URL `https://www.kronosdata.tech/` in all templates | ✅ All templates include exactly once |
| No Claude API usage | ✅ Not touched |
| No new discovery sources added | ✅ Discovery unchanged |

---

## 10. Build Verification

```
npx tsc --noEmit   → 0 errors
npm run build      → 0 errors, 24 routes
```

All 24 routes compiled successfully:
- 4 static pages (`/`, `/_not-found`, `/companies/discover`, `/companies/new`, `/login`)
- 19 dynamic API routes
- 2 dynamic page routes (`/companies/[id]`, `/companies/[id]/edit`)

---

## 11. Files Changed (Summary)

| File | Change |
|---|---|
| `lib/signal-engine/` (7 files) | **New** — clean v2 engine |
| `app/api/discovery/import/route.ts` | **Rewritten** — v2 engine only |
| `app/api/companies/[id]/reprocess/route.ts` | **Rewritten** — v2 engine only |
| `app/api/companies/[id]/evaluate/route.ts` | **Rewritten** — manual → isLegacyEval=true |
| `lib/api-client.ts` | **Updated** — nullable fields, new types |
| `app/companies/[id]/page.tsx` | **Updated** — ProspectSignalPanel, v2 OutreachPanel |
| `app/companies/[id]/edit/page.tsx` | **Updated** — null-safe priorityLevel |
| `app/companies/new/page.tsx` | **Updated** — null-safe evaluation fields |
| `app/companies/discover/page.tsx` | **Updated** — v2 badges, no SQS/ROI/budget |
| `scripts/cleanup-legacy-evaluations.ts` | **New** — dry-run flagging script |
| `scripts/validate-prospect-signal-engine.ts` | **New** — 8-case validation script |
| `lib/value-estimator.ts` (+ 8 others) | **Archived** — @legacy headers, not imported |

---

## 12. Pending After This Report

1. **Run cleanup script (dry-run):** `npx ts-node scripts/cleanup-legacy-evaluations.ts` — review output, then apply with `--apply` if approved
2. **Run validation script:** `npx ts-node scripts/validate-prospect-signal-engine.ts` — confirm 8/8 pass
3. **Commit + push** to `origin/v2-clean-prospect-signal-engine`
4. **Vercel deployment** — monitor build log
5. **Reprocess Denta Clear** — verify OFFER_AUDIT state and symptom labels

---

## 13. Approval Required

This report must be reviewed and approved before:
- Committing to `origin/v2-clean-prospect-signal-engine`
- Running the legacy cleanup script with `--apply`
- Merging to main

**Awaiting explicit approval.**
