# PROJECT_STATUS.md — Kronos Lead Intelligence
**Última actualización:** 2026-06-11  
**Estado general:** ✅ MVP Listo para ventas  
**Commit activo:** `8634daf`  
**Rama:** `master`

---

## Estado Actual del Proyecto

El sistema está operativo en todas sus capas. Un vendedor puede:
1. Cargar un prospecto (formulario o CSV)
2. Evaluarlo con el motor de scoring
3. Ver pérdida económica estimada, dolor probable y servicios recomendados
4. Generar un mensaje de outreach personalizado por canal
5. Registrar el contacto en el historial
6. Tomar notas de venta, asignar estado y probabilidad de cierre

**No hay autenticación todavía.** El sistema es de un solo usuario.

---

## Fases Completadas

| Fase | Nombre | Commit | Estado |
|------|--------|--------|--------|
| Fase 1 | Fundación, schema y motores de negocio | `d776c05` | ✅ Completa |
| Fase 1 (Auditoría) | Test scripts + audit report | `99cdb4b` | ✅ Completa |
| Fase 2 | Capa de API REST (11 endpoints) | `9685952` | ✅ Completa |
| Fase 2.5 | Architecture Consistency Audit | (sin commit — solo reporte) | ✅ Completa |
| Fase 3 | MVP Frontend — 4 páginas + 13 componentes UI | `8d5c2b0` | ✅ Completa |
| Fase 3.1 | Mejora comercial de Outreach (plantillas + UX) | `8f99d12` | ✅ Completa |
| Auditoría Comercial | SALES_AUDIT_REPORT + correcciones email | `93b57db`, `ef395c4` | ✅ Completa |
| Fix datos DB | Migración 14 registros `.com` → `.tech` | `8634daf` | ✅ Completa |

---

## Arquitectura Final Aprobada

```
kronos-lead-intelligence/
├── app/
│   ├── api/
│   │   └── companies/
│   │       ├── route.ts                    GET (list) + POST (create)
│   │       └── [id]/
│   │           ├── route.ts                GET + PUT + DELETE
│   │           ├── evaluate/route.ts       POST (scoring engine)
│   │           ├── evaluations/route.ts    GET (history)
│   │           ├── outreach/route.ts       GET + POST
│   │           └── sales-note/route.ts     GET + PATCH (upsert)
│   ├── companies/
│   │   ├── new/page.tsx                    Crear empresa + auto-evaluar
│   │   └── [id]/
│   │       ├── page.tsx                    Ficha completa (eval + outreach + notas)
│   │       └── edit/page.tsx               Editar + re-evaluar
│   ├── page.tsx                            Dashboard (pipeline)
│   ├── layout.tsx                          Root layout + sidebar
│   └── globals.css                         Tailwind v4 + design tokens
├── components/
│   ├── layout/sidebar.tsx                  Dark sidebar con navegación
│   └── ui/                                 12 componentes (Radix + CVA)
│       ├── button, badge, input, textarea
│       ├── label, checkbox, card, table
│       ├── select, tabs, dialog, separator
├── lib/
│   ├── scoring.ts          computeScores() — 6 categorías, score 0-100
│   ├── diagnosis.ts        generateDiagnosis() — pain point + solución
│   ├── service-match.ts    matchServices() — servicios recomendados
│   ├── value-estimator.ts  estimateRevenueOpportunity() — ROI + revenue lost
│   ├── constants.ts        SIGNAL_DEFINITIONS, INDUSTRY_SUGGESTIONS, catálogos
│   ├── schemas.ts          Zod validation schemas (todos los endpoints)
│   ├── api-helpers.ts      ok(), created(), notFound(), serverError()
│   ├── api-client.ts       Typed fetch wrappers (11 funciones)
│   ├── csv.ts              Export + Import con aliases en español
│   ├── utils.ts            cn() (clsx + tailwind-merge)
│   ├── types.ts            TypeScript types
│   └── db.ts               PrismaClient singleton con PrismaPg adapter
├── prisma/
│   ├── schema.prisma       4 modelos + 1 migración aplicada
│   └── seed.ts             5 empresas de demo con evaluaciones
└── scripts/
    └── fix-email-db.mjs    Script de migración de datos (reutilizable)
```

**Stack:** Next.js 16.2.9 · TypeScript · Tailwind v4 · Radix UI · Prisma 7.8.0 · Supabase PostgreSQL · Zod 4.4.3

---

## Estado de Supabase

- **Host:** `db.uepkrruszvwetrmdllke.supabase.co:5432`
- **Project ref:** `uepkrruszvwetrmdllke`
- **Conexión:** Via `@prisma/adapter-pg` con `DATABASE_URL` en `.env`
- **Tablas activas:** 4 (`companies`, `evaluations`, `sales_notes`, `outreach_history`)
- **Migración aplicada:** `20260610171335_init` (única migración)
- **Datos de demo:** 5 empresas seed con evaluaciones, outreach y notas
- **Email migrado:** 14 registros actualizados de `.com` → `.tech` (2026-06-11)
- **Seguridad:** `DATABASE_URL` solo en `.env`, gitignoreado vía `.env*`

---

## Estado de Prisma

- **Versión:** 7.8.0
- **Adapter:** `@prisma/adapter-pg` (no usa el cliente Prisma estándar — usa pg driver directamente)
- **Output generado:** `app/generated/prisma/` (client custom path)
- **CLI:** ⚠️ El binario `prisma/build/index.js` está incompleto — `npx prisma` falla. Usar `node scripts/fix-email-db.mjs` para migraciones de datos directas. Las migraciones de schema se aplican vía `prisma migrate dev` si el CLI se instala correctamente.
- **Modelos:**

| Modelo Prisma | Tabla DB | Campos clave |
|---------------|----------|--------------|
| `Company` | `companies` | 15 señales de negocio + 4 campos denormalizados de última evaluación |
| `Evaluation` | `evaluations` | 15 signals + 6 category scores + opportunityScore + diagnosis + services |
| `SalesNote` | `sales_notes` | contacto, estado, probabilidad de cierre, objeciones, próxima acción |
| `OutreachHistory` | `outreach_history` | canal, mensaje, respuesta, secuencia, templateUsed |

---

## Estado de APIs (11 endpoints)

| Método | Endpoint | Función | Estado |
|--------|----------|---------|--------|
| GET | `/api/companies` | Listar con filtros (priority, sort, limit, offset) | ✅ |
| POST | `/api/companies` | Crear empresa | ✅ |
| GET | `/api/companies/[id]` | Detalle con última evaluación + salesNote | ✅ |
| PUT | `/api/companies/[id]` | Actualizar info de empresa | ✅ |
| DELETE | `/api/companies/[id]` | Eliminar (cascade en evaluaciones/notas/outreach) | ✅ |
| POST | `/api/companies/[id]/evaluate` | Correr engine de scoring y guardar evaluación | ✅ |
| GET | `/api/companies/[id]/evaluations` | Historial de evaluaciones | ✅ |
| GET | `/api/companies/[id]/outreach` | Listar registros de outreach | ✅ |
| POST | `/api/companies/[id]/outreach` | Crear registro de outreach | ✅ |
| GET | `/api/companies/[id]/sales-note` | Obtener nota de venta | ✅ |
| PATCH | `/api/companies/[id]/sales-note` | Crear o actualizar nota de venta | ✅ |

**Endpoints faltantes (deuda técnica — no bloqueantes):**
- `PATCH /api/companies/[id]/outreach/[recordId]` — editar outreach existente
- `GET /api/companies/[id]/outreach/[recordId]` — detalle de un registro

---

## Estado del Dashboard (`/`)

| Funcionalidad | Estado |
|---------------|--------|
| Tabla de empresas ordenable | ✅ |
| Búsqueda por nombre/industria | ✅ |
| Filtro por prioridad (hot/high/medium/low) | ✅ |
| Filtro por industria | ✅ |
| Ordenamiento (score asc/desc, fecha) | ✅ |
| Score con colores (rojo/naranja/amarillo) | ✅ |
| Badge de prioridad con colores | ✅ |
| Badge de estado (activo/contactado/cliente) | ✅ |
| Fecha de última evaluación | ✅ |
| CSV Export (lista actual filtrada) | ✅ |
| CSV Import con progress bar y resultados | ✅ |
| Empty state + error state + loading state | ✅ |
| Filtro de score range (min/max) | ❌ Pendiente — la API lo soporta, la UI no |

---

## Estado de Outreach

| Funcionalidad | Estado |
|---------------|--------|
| Plantilla sugerida por canal (WA/Email/LI) | ✅ |
| Detección automática de escenario (6 tipos) | ✅ |
| 2 variantes por escenario/canal (20 plantillas) | ✅ |
| Botón Copiar con feedback | ✅ |
| Botón Editar plantilla | ✅ |
| Botón Nueva versión (alterna variantes) | ✅ |
| Modal de registro pre-llenado desde plantilla | ✅ |
| Historial con badges verde/azul/gris | ✅ |
| "Ver mensaje completo" toggle por registro | ✅ |
| Barra lateral de color por estado de respuesta | ✅ |
| Editar registro de outreach existente | ❌ Pendiente (no hay API PATCH) |
| `templateUsed` guardado en DB | ❌ Pendiente (campo existe en schema, no se usa) |
| Clipboard fallback para HTTP | ❌ Pendiente (funciona solo en HTTPS/localhost) |

---

## Estado de Sales Notes

| Funcionalidad | Estado |
|---------------|--------|
| Contacto principal (nombre, cargo, tel, email) | ✅ |
| Estado de contacto (8 estados) | ✅ |
| Estado de reunión (5 estados) | ✅ |
| % de cierre estimado | ✅ |
| Objeciones detectadas | ✅ |
| Próxima acción | ✅ |
| Observaciones de ventas | ✅ |
| Asignado a | ✅ (valor por defecto vacío — el vendedor lo llena) |
| Historial de notas (múltiples versiones) | ❌ Pendiente — actualmente es upsert (1 nota por empresa) |
| Fecha de próxima acción (campo) | ❌ Pendiente — el campo existe en DB pero no en la UI |

---

## Bugs Corregidos (esta sesión)

| Bug | Causa raíz | Fix aplicado |
|-----|-----------|-------------|
| Campo "Asignado a" mostraba `@kronosdata.com` | Seed ejecutado antes del fix de email — 4 registros en DB | Migración SQL: 14 registros actualizados |
| `alejandro@kronosdata.com` en `API_SPEC.md` | Olvidado en corrección anterior | `sed` reemplazo global |
| `alejandro@kronosdata.com` en reports | Textos históricos | Rephraseado sin exponer el dominio incorrecto |
| OutreachPanel mostraba form inline sin datos de evaluación | No recibía props de evaluación | Refactor completo del componente |

---

## Bugs Abiertos

| ID | Severidad | Descripción | Archivo |
|----|-----------|-------------|---------|
| BUG-001 | Baja | Botón "Copiar" falla silenciosamente en HTTP (non-localhost) | `app/companies/[id]/page.tsx:501` |
| BUG-002 | Baja | `templateUsed` siempre `null` en outreach registrado desde plantilla | `app/companies/[id]/page.tsx` — `handleSave()` |

---

## Deuda Técnica Pendiente

| ID | Prioridad | Descripción | Archivo | Estimado |
|----|-----------|-------------|---------|----------|
| FIND-001 | **Media** | 4 índices faltantes en tabla `companies` (score, status, country, priority) | `prisma/schema.prisma` | 30 min |
| FIND-002 | **Media** | 2 índices faltantes en `sales_notes` (companyId, companyId+createdAt) | `prisma/schema.prisma` | 15 min |
| FIND-003 | Baja | 4 interfaces muertas en `lib/types.ts` (líneas 121–162) | `lib/types.ts` | 10 min |
| FIND-004 | Baja | `badRequest()` exportado pero sin uso en route handlers | `lib/api-helpers.ts:19` | 5 min |
| FIND-005 | Baja | 7 enums duplicados en `types.ts` y `schemas.ts` | `lib/types.ts`, `lib/schemas.ts` | 30 min |
| FIND-006 | Info | Sin endpoint `PATCH /outreach/[recordId]` para editar contactos | API layer | 45 min |
| FIND-007 | Info | `templateUsed` field en schema no se guarda al registrar outreach | `app/companies/[id]/page.tsx` | 15 min |

---

## Funcionalidades Pendientes (Fase 4+)

| Funcionalidad | Impacto Comercial | Fase Recomendada |
|---------------|-------------------|------------------|
| Autenticación (login, sesión, usuarios) | Alto — necesario para equipo | Fase 4 |
| Filtro de score range en Dashboard (UI) | Medio — la API ya lo soporta | Fase 4 |
| Generación de mensajes con IA (Claude API) | Alto — diferenciador real | Fase 4 |
| Editar registro de outreach existente | Medio | Fase 4 |
| Historial de Sales Notes (múltiples versiones) | Medio | Fase 4 |
| Campo "Fecha de próxima acción" en UI | Bajo | Fase 4 |
| Página de estadísticas / pipeline analytics | Alto — gestión del equipo | Fase 5 |
| Notificaciones / recordatorios de follow-up | Alto — productividad | Fase 5 |
| Integración con WhatsApp Business API | Alto — automatización real | Fase 5 |
| Multi-usuario / roles (vendedor, manager) | Alto — escalabilidad | Fase 5 |
| `templateUsed` guardado en DB | Bajo — A/B testing futuro | Fase 4 |

---

## Próxima Fase Recomendada: Fase 4 — Operaciones

**Objetivo:** Hacer el sistema usable en producción por más de una persona y comenzar a medir resultados de ventas.

**Contenido sugerido:**

1. **Autenticación básica** (NextAuth o Supabase Auth) — login con email + password
2. **Filtro de score range en Dashboard** — slider 0-100 (API ya listo)
3. **Índices de base de datos** (FIND-001 y FIND-002) — migración de schema
4. **`PATCH /outreach/[recordId]`** — editar contactos existentes
5. **Generación de mensajes con Claude API** — variantes verdaderamente personalizadas
6. **Clipboard fallback** para HTTP
7. **`templateUsed`** guardado en DB

**Tiempo estimado Fase 4:** 4–6 horas de desarrollo

---

## Próximas 10 Tareas Prioritarias (por impacto comercial)

| # | Tarea | Impacto | Tiempo est. |
|---|-------|---------|-------------|
| 1 | Agregar autenticación básica (NextAuth) | 🔴 Alto — necesario para uso en equipo | 3–4 h |
| 2 | Integrar Claude API para mensajes personalizados | 🔴 Alto — diferenciador comercial clave | 2–3 h |
| 3 | Índices de DB (FIND-001 y FIND-002) + migración | 🟠 Medio — performance a escala | 45 min |
| 4 | Filtro de score range en Dashboard (slider UI) | 🟠 Medio — la API ya existe | 30 min |
| 5 | Endpoint `PATCH /outreach/[recordId]` + UI de edición | 🟠 Medio — flujo de venta completo | 1 h |
| 6 | Guardar `templateUsed` en DB al registrar outreach | 🟡 Bajo-Medio — A/B testing de mensajes | 15 min |
| 7 | Clipboard fallback para HTTP | 🟡 Bajo — bug silencioso en prod | 20 min |
| 8 | Limpiar tipos muertos en `lib/types.ts` (FIND-003) | 🟡 Bajo — mantenibilidad | 10 min |
| 9 | Campo "Fecha de próxima acción" en Sales Notes UI | 🟡 Bajo — el campo existe en DB | 20 min |
| 10 | Historial de Sales Notes (múltiples versiones) | 🟡 Bajo-Medio — trazabilidad de ventas | 45 min |

---

*Documento generado el 2026-06-11 · Kronos Lead Intelligence*
