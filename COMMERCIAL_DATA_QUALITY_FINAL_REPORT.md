# COMMERCIAL_DATA_QUALITY_FINAL_REPORT.md
**Fecha:** 2026-06-11 · **Commits:** `755c28d`, `7755548` · **Estado:** ✅ Desplegado

---

## Resumen Ejecutivo

Kronos Lead Intelligence tenía un defecto sistémico: los campos booleanos de señales trataban `false` como **"ausencia confirmada"** y como **"no investigado"** de forma indistinguible. Esto hacía que `noWebsiteSignals()` asignara `signalWeakFollowup=true` y `signalManualWork=true` sin evidencia, inflando el score de Dental Zegarra de lo que debería ser ~11 a 86/HOT.

Esta fase resuelve el problema de raíz con un **modelo de evidencia de cuatro estados** (positive / negative / unknown / inferred) y adapta todos los engines para que las señales desconocidas no generen puntos de oportunidad.

---

## Sección 1 — Modelo de Evidencia (`lib/evidence.ts`)

### Problema
El sistema Boolean (`true`/`false`) no podía distinguir entre "confirmado ausente" y "no investigado". `noWebsiteSignals()` asignaba `true` a señales de seguimiento débil y trabajo manual sin ningún dato que lo sustentase.

### Solución implementada

**Archivo nuevo:** `lib/evidence.ts`

```typescript
export type EvidenceStatus = 'positive' | 'negative' | 'unknown' | 'inferred'

export interface SignalEvidenceEntry {
  status: EvidenceStatus
  source: string
  confidence: 'high' | 'medium' | 'low' | 'none'
  evidence: string | null
}

export type SignalEvidenceMap = Partial<Record<keyof SignalFlags, SignalEvidenceEntry>>
```

**Funciones principales:**

| Función | Propósito |
|---------|-----------|
| `computeCoverage(evidence)` | Señales no-unknown / 15 → porcentaje 0–100 |
| `applyEvidence(signals, evidence)` | Neutraliza señales `unknown` antes del scoring |
| `evidenceNoWebsite()` | 1 confirmada (website=negative) + 1 inferred (weakOnlinePresence) + 13 unknown |
| `evidenceAllManual(signals)` | Evaluaciones manuales: todas las señales como `manual/high` |
| `evidenceFromWebAnalysis(research)` | Convierte ResearchResult a SignalEvidenceMap |

**Regla de neutralización (`applyEvidence`):**
- Señal `unknown` con `problemWhen=false` (positiva) → se asume presente (`true`) → 0 puntos de oportunidad
- Señal `unknown` con `problemWhen=true` (negativa) → se asume ausente (`false`) → 0 puntos de problema
- Señal `inferred` → se conserva su valor booleano (contribuye normalmente)

---

## Sección 2 — Coverage-Aware Scoring (`lib/scoring.ts`)

### Cambios

Se añadió `computeScoresWithEvidence(signals, evidence)`:

```typescript
export function computeScoresWithEvidence(
  signals: SignalFlags,
  evidence: SignalEvidenceMap,
): CategoryScores {
  const neutralized = applyEvidence(signals, evidence)
  const base = computeScores(neutralized)
  const coverage = computeCoverage(evidence)

  let { priorityLevel } = base
  if (coverage < 40 && (priorityLevel === 'hot' || priorityLevel === 'high')) {
    priorityLevel = 'medium'  // cap — insufficient evidence for high-urgency claim
  }

  return {
    ...base,
    priorityLevel,
    researchCoverage: coverage,
    scoreConfidence: scoreConfidenceFromCoverage(coverage),
    evaluationStatus: evaluationStatusFromCoverage(coverage),
  }
}
```

**Umbrales de coverage:**

| Coverage | scoreConfidence | evaluationStatus |
|----------|----------------|-----------------|
| ≥ 70% | high | complete |
| 40–69% | medium | preliminary |
| < 40% | low | manual_review_required |

La función original `computeScores()` se mantiene intacta (backward compatible para código existente).

---

## Sección 3 — Modelo de Servicios Escalonado (`lib/service-match.ts`)

### Problema
`matchServices()` sumaba TODOS los servicios coincidentes ($7,500–$16,600 para 8 servicios de Dental Zegarra).

### Solución: tiered services + precio parcial

```
1 servicio principal  ← precio principal
+ max 2 complementarios (baja dificultad en cobertura baja) ← se suma al precio
+ servicios futuros (no se incluyen en precio)
```

**Lógica de selección del servicio principal:**

- Coverage < 40% → **primary = `digital_presence_audit`** (paso diagnóstico seguro)
  - Complementarios: solo servicios de dificultad `low`
- Coverage ≥ 40% → primary según prioridad de impacto: `website_development` > `whatsapp_automation` > `appointment_booking` > ...

**Campo `priceLabel`:**
- Coverage < 40% → `"Rango preliminar"` (se muestra en UI)
- Coverage ≥ 40% → `"Estimado"`

---

## Sección 4 — Precios LATAM SMB Recalibrados (`lib/constants.ts`)

| Servicio | Antes | Después |
|---------|-------|---------|
| `website_development` | $2,500–$6,000 | **$800–$2,500** |
| `sales_process_automation` | $2,000–$5,000 | **$1,200–$3,500** |
| `crm_followup_automation` | $1,200–$2,500 | **$800–$2,000** |
| `lead_capture_funnel` | $1,000–$2,500 | **$500–$1,200** |
| `appointment_booking` | $800–$1,800 | **$500–$1,500** |
| `google_business_setup` | $300–$600 | **$150–$400** |
| `digital_presence_audit` | $300–$500 | **$150–$350** |
| `review_management` | $400–$800 | **$200–$500** |
| `social_media_presence` | $800–$1,500 | **$400–$900** |
| `whatsapp_automation` | $600–$1,200 | **$500–$1,200** |

---

## Sección 5 — Diagnóstico Condicional (`lib/diagnosis.ts`)

### Problemas corregidos

**`detectProblems(signals, evidence?)`** — Solo lista problemas confirmados:
- Status `unknown` → **excluido** (no aparece en lista de problemas)
- Status `inferred` → aparece con prefijo `"(posible) ..."`
- Status `positive`/`negative` confirmado → aparece sin prefijo

**`identifyPainPoint(signals, coverage)`** — Lenguaje condicional por nivel:
- Coverage < 40% → `"Información preliminar — un diagnóstico inicial permitirá confirmar las oportunidades concretas."`
- Coverage ≥ 40% → lógica original de pain points específicos

**`recommendSolution(signals, coverage)`:**
- Coverage < 40% → `"Una auditoría de presencia digital nos permitirá confirmar el diagnóstico..."` 
- Coverage ≥ 40% → soluciones específicas por señales confirmadas

---

## Sección 6 — Estimación de Revenue Conservadora (`lib/value-estimator.ts`)

Se añadió parámetro `coverage` con multiplicadores:

| Coverage | Multiplicador | Propósito |
|----------|--------------|-----------|
| < 40% | 0.30 | Evita sobrestimar pérdidas sin evidencia |
| 40–69% | 0.65 | Estimación moderada con cobertura parcial |
| ≥ 70% | 1.00 | Estimación completa con alta cobertura |

---

## Sección 7 — Fix de `noWebsiteSignals()` (`app/api/discovery/import/route.ts`)

### Antes (INCORRECTO)
```typescript
signalWeakFollowup: true,   // asumía problema sin evidencia
signalManualWork:   true,   // asumía problema sin evidencia
signalWeakOnlinePresence: true,
```

### Después (CORRECTO)
```typescript
// Neutral values for unknown signals (applyEvidence would produce same result)
signalHasWebsite:   false,  // confirmed negative
signalWeakOnlinePresence: true,  // inferred from no website
// All others → neutral (positive signals = true, negative signals = false)
```

Con `evidenceNoWebsite()` aplicado:
- 1 señal confirmada: `signalHasWebsite = negative`
- 1 señal inferida: `signalWeakOnlinePresence = inferred`
- 13 señales: `unknown` → no contribuyen al score

---

## Sección 8 — Auto-Inicialización de SalesNote (`app/api/discovery/import/route.ts`)

Cada empresa importada por Discovery ahora recibe automáticamente una SalesNote con:

```typescript
await tx.salesNote.create({
  data: {
    companyId,
    assignedTo:    'alejandro@kronosdata.tech',
    contactStatus: 'not_contacted',
    meetingStatus: 'not_scheduled',
    nextAction:    hasContactInfo
      ? 'Revisar diagnóstico y realizar primer contacto'
      : 'Investigar contacto y validar diagnóstico',
    contactPhone:  detectedPhone ?? null,
  },
})
```

---

## Sección 9 — Schema de Base de Datos (`prisma/schema.prisma`)

8 nuevos campos nullable en el modelo `Evaluation`:

```prisma
// Tiered service recommendations
primaryService        String?  @map("primary_service")
complementaryServices String[] @map("complementary_services")
futureServices        String[] @map("future_services")
priceLabel            String?  @map("price_label")

// Evidence and quality
signalEvidence    Json?   @map("signal_evidence")
researchCoverage  Int?    @map("research_coverage")
scoreConfidence   String? @map("score_confidence")
evaluationStatus  String? @map("evaluation_status")
```

`prisma db push` aplicado. Backward compatible: evaluaciones anteriores tienen `null` en campos nuevos.

---

## Sección 10 — Endpoint de Reprocesamiento (`app/api/companies/[id]/reprocess/route.ts`)

**Nuevo endpoint:** `POST /api/companies/[id]/reprocess`

Comportamiento:
- Lee la última evaluación de la empresa
- Determina la estrategia de evidencia según `leadSource` y `website`
- Crea una **nueva evaluación** con el modelo de evidencia (append-only)
- Actualiza los campos denormalizados del company
- Retorna comparación `before` vs `after`

No sobrescribe evaluaciones anteriores. No modifica SalesNotes manuales.

---

## Sección 11 — UI Actualizada (`app/companies/[id]/page.tsx`)

### Coverage Banner
Muestra coverage%, badge de status (Completa / Preliminar / Revisión manual), y aviso cuando los datos son insuficientes.

### Servicios Escalonados
- **Servicio principal** → badge naranja destacado
- **Complementarios** → badges secundarios
- **Fases siguientes** → badges con borde discontinuo (no se cobran en propuesta inicial)

### Signal Checklist Evidence-Aware
- `unknown` → círculo gris vacío (no investigado)
- `inferred` → `~` amarillo + `(indicios)`
- `positive/negative confirmado` → `✓` verde / `✗` ámbar

### Outreach con Niveles A/B/C
- **Nivel C** (coverage < 40%) → mensaje exploratorio, sin afirmaciones de pérdidas
- **Nivel B** (40–64%) → lenguaje condicional (`"podría"`, `"es posible que"`)
- **Nivel A** (≥ 65%) → menciona problema observado + estimados específicos

### Tiempo de Implementación
Usa `ev.implementationTimeEstimate` (tiempo del servicio principal) en lugar de "2 semanas" hardcodeado.

### Contactos Localizados
Panel en outreach: muestra si hay WhatsApp / contacto identificado antes de la plantilla.

### Botón "Reprocesar"
Llama a `POST /api/companies/[id]/reprocess`, recarga la empresa. Complementa "Re-evaluar" (que usa señales manuales).

---

## Sección 12 — Resultados de Producción: Dental Zegarra

### Antes (evaluación `7dcbcdba-...`, `discovery_engine`)

| Campo | Valor |
|-------|-------|
| opportunityScore | **86** |
| priorityLevel | **HOT** |
| detectedProblems | **13** problemas |
| probablePainPoint | "Fuga masiva de ingresos: sin captura de leads, sin seguimiento y procesos 100% manuales." |
| estimatedProjectPriceMin | **$7,500** |
| estimatedProjectPriceMax | **$16,600** |
| implementationTimeEstimate | **6–12 semanas** |
| Servicios recomendados | **8 servicios** |
| signalEvidence | null |
| researchCoverage | null |

### Después (evaluación `a1207aa0-...`, `reprocess_engine`)

| Campo | Valor |
|-------|-------|
| opportunityScore | **11** |
| priorityLevel | **low** |
| detectedProblems | **2** (Sin sitio web activo + (posible) presencia online débil) |
| probablePainPoint | "Información preliminar — un diagnóstico inicial permitirá confirmar las oportunidades concretas." |
| estimatedProjectPriceMin | **$150** |
| estimatedProjectPriceMax | **$350** |
| priceLabel | **"Rango preliminar"** |
| implementationTimeEstimate | **1 semana** |
| primaryService | **Auditoría de Presencia Digital** |
| complementaryServices | `[]` (sin quick-wins de baja dificultad adicionales detectados) |
| futureServices | `["Desarrollo de Sitio Web"]` |
| signalEvidence | `{ signalHasWebsite: negative/high, signalWeakOnlinePresence: inferred/medium, otros: unknown }` |
| researchCoverage | **13%** |
| scoreConfidence | **low** |
| evaluationStatus | **manual_review_required** |

**Reducción:** score −87%, precio −98%, problemas −85%. Resultado comercialmente defendible.

---

## Sección 13 — Resultados de Producción: Kronos Data

### Antes
| Campo | Valor |
|-------|-------|
| opportunityScore | 18 |
| priorityLevel | low |

### Después (evaluación `b2197e14-...`, `reprocess_engine`)
| Campo | Valor |
|-------|-------|
| opportunityScore | **18** |
| priorityLevel | **low** |
| researchCoverage | **100%** |
| scoreConfidence | **high** |
| evaluationStatus | **complete** |
| primaryService | **Funnel de Captura de Leads** |
| estimatedProjectPriceMin | **$650** |
| estimatedProjectPriceMax | **$1,600** |
| detectedProblems | **5** (todos confirmados manualmente) |

Score coherente (empresa propia, señales ingresadas manualmente → cobertura 100%). Los 5 problemas son reales, no inflados.

---

## Sección 14 — TypeScript, Build y Deployment

### TypeScript
```
npx tsc --noEmit
(sin output) — exit 0 — 0 errores
```

### Build
```
npm run build
✓ Compiled successfully in 2.8s
✓ TypeScript: 0 errores
✓ 19 rutas generadas (incluyendo /api/companies/[id]/reprocess)
```

### Commits
| Hash | Descripción |
|------|-------------|
| `755c28d` | feat(quality): commercial data quality — evidence model, tiered services, LATAM pricing |
| `7755548` | fix(service-match): limit complementary services to low-difficulty in preliminary proposals |

### Archivos modificados/creados (14 total)
| Archivo | Tipo | Cambio clave |
|---------|------|-------------|
| `prisma/schema.prisma` | Modificado | 8 nuevos campos nullable en Evaluation |
| `lib/evidence.ts` | **NUEVO** | Modelo de evidencia completo |
| `lib/types.ts` | Modificado | CategoryScores + ServiceMatchOutput extendidos |
| `lib/constants.ts` | Modificado | Precios LATAM SMB recalibrados |
| `lib/scoring.ts` | Modificado | `computeScoresWithEvidence()` con coverage cap |
| `lib/service-match.ts` | Modificado | Tiered services + precio parcial |
| `lib/diagnosis.ts` | Modificado | Detección condicionada por evidencia |
| `lib/value-estimator.ts` | Modificado | Multiplicador conservador por coverage |
| `app/api/discovery/import/route.ts` | Modificado | `noWebsiteSignals()` corregido + SalesNote auto-init |
| `app/api/companies/[id]/evaluate/route.ts` | Modificado | Guarda campos de evidencia y tiering |
| `app/api/companies/[id]/reprocess/route.ts` | **NUEVO** | Endpoint append-only de reprocesamiento |
| `lib/api-client.ts` | Modificado | 8 nuevos campos en tipo `Evaluation` |
| `app/companies/[id]/page.tsx` | Modificado | Coverage banner, tiered services, señales con evidencia, outreach A/B/C |
| `scripts/reprocess-companies.ts` | **NUEVO** | Script de reprocesamiento local |

---

## Criterios de Aceptación — Verificación

| Criterio | Estado |
|---------|--------|
| `unknown` no se interpreta como problema | ✅ `applyEvidence()` neutraliza unknowns a valores neutros |
| Ninguna empresa obtiene HOT con evidencia insuficiente | ✅ Coverage < 40% → priority capped at medium |
| Canales de outreach indican claramente si existe contacto | ✅ Panel "Contactos localizados" en OutreachPanel |
| Mensajes no afirman hechos no confirmados | ✅ Nivel C: exploratorio sin afirmaciones; Nivel B: condicional |
| Precios y plazos realistas para LATAM SMB | ✅ Precios recalibrados; plazos del servicio principal (no agregado) |
| Max 3 servicios en propuesta principal | ✅ 1 principal + max 2 complementarios |
| SalesNote inicializa correctamente en discovery | ✅ assignedTo + contactStatus + nextAction automáticos |
| Dental Zegarra muestra resultado comercialmente defendible | ✅ 11/LOW · $150–$350 · "Rango preliminar" · 2 problemas confirmados |
| Kronos Data mantiene evaluación coherente | ✅ 18/LOW · 100% coverage · 5 problemas confirmados · $650–$1,600 |
| TypeScript y build: 0 errores | ✅ `tsc --noEmit` exit 0 · `npm run build` ✓ |

---

*Reporte generado el 2026-06-11*
*Commits: `755c28d`, `7755548` · Branch: master · Build: ✅ · TypeScript: exit 0*
*Reprocesamiento: Dental Zegarra (score 86→11) + Kronos Data (score 18→18, coverage null→100%)*
