# RESUME INSTRUCTIONS
**Project:** Kronos Lead Intelligence  
**Resume From:** End of Phase 1 — Phase 2 (API Routes) is next  

---

## STEP 1 — Open the project

```
C:\Users\Usuario\Documents\Nueva carpeta\Claude Code\kronos-lead-intelligence\
```

---

## STEP 2 — Confirm .env exists

The file `.env` is gitignored and must exist locally. If it is missing, create it:

```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.uepkrruszvwetrmdllke.supabase.co:5432/postgres"
```

Replace `[YOUR-PASSWORD]` with the Supabase database password.

---

## STEP 3 — Install dependencies (if on a new machine)

```bash
npm install
npx prisma generate
```

If on the same machine where Phase 1 was completed, skip this step.

---

## STEP 4 — Verify the environment is intact

Run this command first — it confirms the database is reachable and all seed data is present:

```bash
npx tsx scripts/verify-db.ts
```

Expected output:
```
=== TABLE COUNTS ===
  companies:        5
  evaluations:      5
  sales_notes:      5
  outreach_history: 5
✓ ALL VERIFICATION CHECKS PASSED
```

If the check fails, re-run `npx prisma generate` and retry.

---

## STEP 5 — Confirm TypeScript is clean

```bash
npx tsc --noEmit
```

Expected: no output, exit code 0.

---

## STEP 6 — Read context before writing code

Open these files in this order:

1. `PROJECT_SNAPSHOT.md` — full project state and implementation plan
2. `docs/HANDOFF.md` — critical warnings and patterns
3. `docs/PROJECT_STATE.md` — schema reference and business rules

---

## STEP 7 — Start Phase 2

**First file to create:**

```
lib/schemas.ts
```

Write all Zod validation schemas before implementing any route:
- `CreateCompanySchema`
- `UpdateCompanySchema`
- `CreateEvaluationSchema` — 15 boolean signal fields + `evaluatedBy: string`
- `CreateOutreachSchema`
- `UpdateSalesNoteSchema`

**First route to implement:**

```
app/api/companies/route.ts
```

GET (list all, sorted by `latestOpportunityScore DESC`) and POST (create company).

**Critical rule for every route handler:**

```typescript
// ALWAYS await params — Next.js 16 requirement
const { id } = await context.params
```

---

## STEP 8 — Run dev server to test routes

```bash
npm run dev
```

Server starts at `http://localhost:3000`. Test endpoints with a REST client (curl, Postman, or Thunder Client in VS Code).

---

## QUICK REFERENCE

| What | Where |
|------|-------|
| Prisma singleton | `import { prisma } from '@/lib/db'` |
| Prisma import path | `from '@/app/generated/prisma/client'` |
| Scoring engine | `import { computeScores } from '@/lib/scoring'` |
| Diagnosis engine | `import { generateDiagnosis } from '@/lib/diagnosis'` |
| Service match | `import { matchServices } from '@/lib/service-match'` |
| Revenue module | `import { estimateRevenueOpportunity } from '@/lib/value-estimator'` |
| All types | `import type { ... } from '@/lib/types'` |
| All constants | `import { ... } from '@/lib/constants'` |
| DB verification | `npx tsx scripts/verify-db.ts` |
| TypeScript check | `npx tsc --noEmit` |
| New migration | `npx prisma migrate dev --name <name>` |
| Regenerate client | `npx prisma generate` |
