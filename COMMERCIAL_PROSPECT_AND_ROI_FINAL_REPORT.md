# COMMERCIAL_PROSPECT_AND_ROI_FINAL_REPORT
## Kronos Lead Intelligence — Phase 3.9
**Fecha:** 2026-06-12  
**Commits:** d80d968 (Phase 3.9 engine) → 6161522 (reprocess + validation)  
**Branch:** master  
**Estado:** COMPLETO — esperando aprobación explícita

---

## 1. OBJETIVO DE LA FASE

Resolver el problema fundamental de calidad: el sistema encontraba "Construcción de Metro 2 de Lima" entre los mejores prospectos. La causa raíz: sin filtro de entidad comercial, sin ROI por industria, sin capacidad de pago inferida, y sin score que combine todos esos factores.

**Prioridad absoluta según especificación:**
> "Kronos no debe encontrar simplemente empresas con defectos digitales. Debe encontrar empresas privadas, contactables, con capacidad probable de pago y problemas cuyo impacto económico justifique contratar un servicio o paquete de Kronos Data."

---

## 2. NUEVOS ARCHIVOS CREADOS

| Archivo | Descripción |
|---|---|
| `lib/qualification/entity-classifier.ts` | Clasifica entidades: private_business vs government/infrastructure/nonprofit/etc. |
| `lib/economics/industry-models.ts` | 15+ perfiles de industria con rangos de beneficio anual, capacidad base, problema primario, preguntas |
| `lib/qualification/roi-fit.ts` | ROI Fit Score 0-100: ROI múltiplo, meses de recuperación, label excellent/good/limited/not_defensible |
| `lib/qualification/budget-capacity.ts` | Budget Capacity Score 0-100: inferido de industria + tamaño + señales digitales |
| `lib/qualification/commercial-gate.ts` | Gate 5 criterios → qualified / conditionally_qualified / research_required / disqualified |
| `lib/qualification/sales-qualification.ts` | SQS 0-100: score primario de ranking; sellability matrix; whyContact/whyNotContact |

---

## 3. ARCHIVOS MODIFICADOS

| Archivo | Cambios clave |
|---|---|
| `lib/prospecting/prospect-fit.ts` | +3 raw component fields: `opportunityVisibleRaw`, `contactabilityRaw`, `evidenceQualityRaw` (usados por SQS) |
| `lib/prospecting/config.ts` | +SellabilityClass, +CommercialQualification types; +minSQS en SearchModeConfig; overfetch 5×→8× (cap 200); +MIN_SQS_DEFAULT=55 |
| `lib/discovery/types.ts` | DiscoveryCandidate +17 campos Phase 3.9; RawCandidate Omit extendido |
| `lib/discovery/normalizer.ts` | Pipeline de 7 pasos (PFS→entityClass→ROI→Budget→Gate→Industry→SQS); sort por SQS; filtros de entidad |
| `app/api/discovery/route.ts` | +minSalesQualScore, +privateBusiness, +excludePublicProjects en SearchSchema |
| `app/api/discovery/import/route.ts` | ImportSchema +17 campos Phase 3.9; Company.create guarda todo |
| `app/api/companies/[id]/reprocess/route.ts` | Re-ejecuta clasificación + calificación en reprocess; actualiza todos los campos Phase 3.9 |
| `prisma/schema.prisma` | Company model +17 campos (entityType, entityIsCommercial, entityExclusionReason, commercialQualification, salesQualificationScore, sellabilityClass, roiFitScore, roiFitLabel, roiMultiple, paybackMonths, budgetCapacityScore, budgetCapacityLabel, economicModelType, primaryProblem, whyContact[], whyNotContact[], qualificationQuestions[]) |
| `lib/api-client.ts` | Company interface +17 campos Phase 3.9; CompanyListParams +4 nuevos filtros |
| `lib/schemas.ts` | CompanyListQuerySchema +sellabilityClass, +entityType, +minSalesQualScore, +entityIsCommercial; sort +sqs_desc |
| `app/api/companies/route.ts` | Filtros + select + sort para campos Phase 3.9 |
| `app/companies/discover/page.tsx` | Reescritura completa: SQS badge primario, sellability badge, entity exclusion, ROI+budget, whyContact/Not, qualification questions, filtros privateBusiness y excludePublicProjects |
| `app/page.tsx` | +columna SQS, +filtro sellability, +sort sqs_desc |

---

## 4. ENTITY CLASSIFIER — PATRONES DE EXCLUSIÓN

### Por qué "Construcción de Metro 2 de Lima" es excluido ahora

El nombre contiene:
1. `"Construcción de"` → prefijo de construcción
2. `"Metro 2"` → keyword de infraestructura

Resultado: `entityType: 'infrastructure_project'`, `isCommerciallyViable: false`

Mensaje generado: *"Proyecto de infraestructura pública — no es empresa privada con decisor comercial identificable"*

### Tipos de entidad clasificados

| Tipo | Ejemplos | Excluido |
|---|---|---|
| `private_business` | Clínica Dental Lima, Inmobiliaria Perez | No |
| `infrastructure_project` | Construcción de Metro 2, Tramo de la Línea 1 | Sí |
| `government_entity` | Municipalidad de Lima, Ministerio de Salud | Sí |
| `healthcare_public` | Hospital Nacional, ESSALUD, Centro de Salud | Sí |
| `educational_public` | Universidad Nacional, Instituto Nacional | Sí |
| `nonprofit` | Cruz Roja, Fundación sin fines, ONG | Sí |
| `association` | Cámara de Comercio, Colegio de Abogados | Sí |
| `place_landmark` | Parque de la Reserva, Estadio Nacional | Sí |
| `branch_large_chain` | McDonald's, BBVA, Inkafarma | Sí |

---

## 5. SALES QUALIFICATION SCORE (SQS) — FÓRMULA

```
SQS = PFS × 0.25
    + opportunityVisibleRaw × 0.20
    + ROIFitScore × 0.20
    + contactabilityRaw × 0.15
    + budgetCapacityScore × 0.10
    + evidenceQualityRaw × 0.10
```

**Penalizaciones:**
- `disqualified` gate → SQS capped a 15
- `research_required` gate → SQS capped a 45
- `entityIsCommercial: false` → SQS = 0 directo

**Sellability matrix:**

| Clase | Rango SQS | Acción |
|---|---|---|
| `sell_now` | ≥ 70 | Iniciar conversación de ventas |
| `contact_diagnosis` | 50–69 | Contactar para diagnóstico |
| `investigate` | 35–49 | Más datos antes de contactar |
| `nurture` | 20–34 | Recontactar en 3-6 meses |
| `discard` | < 20 | No perseguir |

---

## 6. MODELOS ECONÓMICOS POR INDUSTRIA

| Industria | Modelo | Beneficio anual típico USD | Capacidad base |
|---|---|---|---|
| Dental / odontología | appointment_based | $9,600 | 70 |
| Clínica / salud | appointment_based | $12,000 | 68 |
| Inmobiliaria | quote_based | $18,000 | 75 |
| Estudio jurídico | quote_based | $12,000 | 72 |
| Constructora privada | quote_based | $9,600 | 62 |
| Taller automotriz | appointment_based | $7,200 | 58 |
| Restaurante | appointment_based | $4,800 | 42 |
| Gimnasio / academia | recurring_revenue | $7,200 | 55 |
| Estetica / salón / spa | appointment_based | $4,800 | 48 |
| Veterinaria | appointment_based | $4,800 | 55 |
| Retail / tienda | ecommerce_transactional | $7,200 | 48 |
| Consultoría / agencia | quote_based | $12,000 | 68 |
| Logística / transporte | data_efficiency | $9,600 | 58 |
| Educación privada | recurring_revenue | $6,000 | 52 |
| Finanzas / seguros | quote_based | $18,000 | 78 |
| Default (desconocido) | unknown | $4,800 | 45 |

---

## 7. ROI FIT — NIVELES

| Label | ROI múltiplo | Payback | Score |
|---|---|---|---|
| `excellent` | ≥ 5× | ≤ 3 meses | 88–95 |
| `good` | ≥ 3× | ≤ 6 meses | 70–80 |
| `limited` | ≥ 1.5× | ≤ 12 meses | 45–60 |
| `not_defensible` | < 1.5× | > 12 meses | 10–25 |

**Precio de referencia Kronos:** proyecto típico $1,200 USD; rango $350–$3,500.

**Entidad no comercial:** ROI Fit siempre `not_defensible` con score 0.

---

## 8. BUDGET CAPACITY

| Label | Score | Condición |
|---|---|---|
| `high` | ≥ 66 | Base alta de industria + tamaño + señales |
| `medium` | 36–65 | Capacidad moderada estimada |
| `low` | < 36 | Señales mínimas o industria de bajo margen |
| `unknown` | — | Sin web, sin teléfono, tamaño desconocido |

---

## 9. COMMERCIAL QUALIFICATION GATE — 5 CRITERIOS

1. **Entidad comercial privada** — entityIsCommercial = true
2. **Al menos un canal de contacto** — website O teléfono
3. **Oportunidad comercial visible** — opportunityVisibleRaw ≥ 30
4. **ROI defensible** — roiFitLabel = excellent | good | limited
5. **Capacidad de pago estimada** — budgetCapacityLabel = high | medium

| Pass count | Resultado |
|---|---|
| 5/5 | `qualified` |
| 3–4/5 | `conditionally_qualified` |
| 1–2/5 | `research_required` |
| 0/5 o entidad no-comercial | `disqualified` |

---

## 10. DISCOVERY UI — CAMBIOS

**Página discover (app/companies/discover/page.tsx):**

- Badge SQS como indicador primario (reemplaza PFS como título de columna)
- Badge Sellability: Contactar ahora / Diagnóstico / Investigar / Monitorear / Descartar
- Columna "Calificación comercial": muestra entityExclusionReason si es no-comercial; de lo contrario: ROI label, budget label, whyContact (2 reasons), whyNotContact (2 reasons)
- Empresas no-comerciales: opacidad reducida + entity type badge en rojo
- Qualification questions: collapsible `<details>` en columna contacto
- Filtros por defecto: `privateBusiness=true`, `excludePublicProjects=true`
- Nuevos filtros avanzados: SQS mínimo, "Solo empresas privadas", "Excluir entidades públicas"

**Dashboard (app/page.tsx):**

- Columna SQS (reemplaza PFS visible, PFS se mueve a columna oculta en xl)
- Filtro "Sellability" con todos los valores
- Opción de ordenación "SQS desc"

---

## 11. PIPELINE DE ENRIQUECIMIENTO (7 PASOS)

Por cada candidato en el normalizer:

```
1. estimateBusinessSizeFromDiscovery()   → BusinessSizeResult
2. computeProspectFitScore()             → ProspectFitResult (+ raw components)
3. classifyEntity()                      → EntityClassification
4. computeRoiFit()                       → RoiFitResult
5. computeBudgetCapacity()               → BudgetCapacityResult
6. evaluateCommercialGate()              → CommercialGateResult
7. computeSalesQualificationScore()      → SalesQualificationResult (SQS + sellability + whyContact)
```

---

## 12. OVER-FETCH ACTUALIZADO

```
Phase 3.8: overFetchLimit = min(limit × 5, 150)
Phase 3.9: overFetchLimit = min(limit × 8, 200)
```

Justificación: mayor porcentaje de candidatos descartados por entidad-gate requiere pool más grande.

---

## 13. ESQUEMA — NUEVOS CAMPOS COMPANY (Phase 3.9)

```sql
-- Clasificación de entidad
entity_type              TEXT        -- private_business | infrastructure_project | etc.
entity_is_commercial     BOOLEAN DEFAULT true
entity_exclusion_reason  TEXT

-- Calificación comercial
commercial_qualification TEXT        -- qualified | conditionally_qualified | research_required | disqualified
sales_qualification_score INTEGER    -- SQS 0-100 (nuevo score principal)
sellability_class        TEXT        -- sell_now | contact_diagnosis | investigate | nurture | discard
roi_fit_score            INTEGER     -- 0-100
roi_fit_label            TEXT        -- excellent | good | limited | not_defensible
roi_multiple             FLOAT       -- annual_benefit / project_cost
payback_months           INTEGER
budget_capacity_score    INTEGER     -- 0-100
budget_capacity_label    TEXT        -- low | medium | high | unknown
economic_model_type      TEXT        -- appointment_based | quote_based | etc.
primary_problem          TEXT        -- problema principal que Kronos resuelve
why_contact              TEXT[]      -- hasta 4 razones positivas
why_not_contact          TEXT[]      -- hasta 4 señales de alerta
qualification_questions  TEXT[]      -- hasta 3 preguntas para llamada
```

**npx prisma db push** — aplicado exitosamente en Supabase.

---

## 14. SEGURIDAD — CONSTRAINTS MANTENIDAS

| Constraint | Estado |
|---|---|
| HERE_API_KEY solo en servidor, nunca NEXT_PUBLIC | ✅ Mantenido |
| DATABASE_URL solo en .env | ✅ Sin cambios |
| Login no modificado | ✅ Sin cambios |
| Empresa Kronos Data no borrada | ✅ Sin cambios |
| Empresa Dental Zegarra no borrada | ✅ Sin cambios |
| Outreach no automatizado | ✅ Sin cambios |
| Scoring/diagnosis/revenue/service-match no modificados | ✅ Sin cambios |
| Correcciones Phase 3.7/3.8 no deshachas | ✅ Preservadas |
| Paquetes y servicios Kronos sin modificar | ✅ Sin cambios |
| Web oficial kronosdata.tech sigue siendo fuente principal | ✅ En outreach |
| Notas comerciales manuales no sobrescritas | ✅ Sin cambios |
| Claude API no iniciada | ✅ Sin cambios |
| Outreach automático no activado | ✅ Sin cambios |

---

## 15. VERIFICACIÓN DE BUILD Y TIPOS

```
npx tsc --noEmit   → 0 errores
npm run build      → 0 errores, 14/14 páginas generadas
git push           → d80d968 (Phase 3.9 engine)
git push           → 6161522 (reprocess + validation scripts + classifier fix)
```

**Corrección adicional en entity-classifier.ts (commit 6161522):**
- Añadido `'hospital publico'` a PUBLIC_HEALTHCARE_PATTERNS
- "Hospital Público Ramos Mejía" ahora clasifica correctamente como `healthcare_public`

---

## 16. VALIDACIÓN DE CALIDAD — 12 ESCENARIOS (COMPLETADO)

Pipeline ejecutado con `scripts/validate-discovery-quality.ts` sobre 32 candidatos representativos de 6 países. Todos los tests pasan.

| # | Búsqueda | Ciudad | País | Top resultado | SQS | Excluidos correctamente |
|---|---|---|---|---|---|---|
| 1 | dental | Lima | Peru | Clínica Dental Sonrisa | 75 sell_now | — |
| 2 | inmobiliaria | Lima | Peru | Inmobiliaria Perez | 75 sell_now | Metro 2 → discard |
| 3 | abogados | Bogotá | Colombia | Estudio Jurídico Ramírez | 77 sell_now | Colegio Abogados → discard |
| 4 | taller | Santiago | Chile | AutoService Santiago | 67 contact_diagnosis | — |
| 5 | restaurante | CDMX | Mexico | El Rincón Mexicano | 67 contact_diagnosis | — |
| 6 | construccion | Lima | Peru | Constructora García | 73 sell_now | Metro L3 + Ministerio → discard |
| 7 | dental | Medellín | Colombia | Clínica Oral Medellín | 77 sell_now | — |
| 8 | clinica | Buenos Aires | Argentina | Clínica Privada San Martín | 77 sell_now | Hospital Público → discard |
| 9 | veterinaria | Lima | Peru | Clínica Vet. Los Álamos | 74 sell_now | — |
| 10 | gimnasio | Lima | Peru | Gimnasio FitLife Lima | 68 contact_diagnosis | — |
| 11 | consultoria | Lima | Peru | Consultora Estratégica | 71 sell_now | — |
| 12 | inmobiliaria | Caracas | Venezuela | Inmobiliaria Caracas Mod. | 78 sell_now | — |

**Resultados spot checks:**
- Metro 2 excluido: ✅ (infrastructure_project, SQS=0)
- Dental calificada: ✅ (SQS=75, sell_now)
- Municipalidad excluida: ✅ (government_entity)
- Hospital público excluido: ✅ (healthcare_public)
- Inmobiliaria calificada: ✅ (SQS=75, ROI=excellent, 15×)

---

## 17. REPROCESSING — COMPLETADO

`scripts/reprocess-phase39.ts` ejecutado contra las 6 empresas en base de datos:

| Empresa | EntityType | SQS | Sellability |
|---|---|---|---|
| Kronos Data | private_business | 71 | sell_now |
| Real Systems S.A. | private_business | 62 | contact_diagnosis |
| Denta Clear | private_business | 64 | contact_diagnosis |
| Dental Zegarra | private_business | 29 | nurture |
| Clínica Dental ODONTOBELL'E | private_business | 29 | nurture |
| Construcción de Metro 2 de Lima | infrastructure_project | 0 | discard |

**Resultado:** Metro 2 correctamente excluido. Las 5 empresas comerciales tienen SQS actualizado.

---

Para futuras importaciones, el reprocess endpoint también está disponible:
```
POST /api/companies/{id}/reprocess
```

---

*Generado automáticamente por Kronos Lead Intelligence CI — Phase 3.9*
*Commit: d80d968 | Branch: master | Build: CLEAN*
