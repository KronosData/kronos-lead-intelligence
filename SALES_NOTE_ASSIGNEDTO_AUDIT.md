# Sales Note assignedTo — Auditoría Completa
**Kronos Lead Intelligence**
**Fecha:** 2026-06-11

---

## Causa Raíz

**Escenario 5 confirmado: registros existentes en Supabase con el valor incorrecto.**

El campo `assignedTo` en el módulo Sales Notes (y equivalentes en outreach e evaluaciones) mostraba `alejandro@kronosdata.com` en la interfaz porque los registros fueron insertados en la base de datos vía `prisma/seed.ts` **antes de que se corrigiera el email en el código fuente**. El seed se ejecutó con el dominio `.com`, los datos quedaron almacenados, y la UI los leía correctamente — mostrando lo que estaba en la base de datos.

### Por qué no era un problema de código

| Fuente | Estado | Evidencia |
|--------|--------|-----------|
| Componente frontend (`SalesNotePanel`) | ✅ Sin hardcode | `useState(initial?.assignedTo ?? '')` — inicializa desde la API |
| API route `PATCH /api/.../sales-note` | ✅ Sin hardcode | Lee de `request.json()`, escribe lo que recibe |
| Schema Prisma | ✅ Sin default | `assignedTo String? @map("assigned_to")` — nullable, sin `@default` |
| `prisma/seed.ts` | ✅ Ya corregido | `assignedTo: 'alejandro@kronosdata.tech'` (corregido en sesión anterior) |
| Base de datos Supabase | ❌ **Causa raíz** | 4 registros en `sales_notes` con `assigned_to = 'alejandro@kronosdata.com'` |

---

## Registros encontrados ANTES de la migración

| Tabla | Columna | Registros con `.com` |
|-------|---------|----------------------|
| `sales_notes` | `assigned_to` | **4** |
| `outreach_history` | `sent_by` | **5** |
| `evaluations` | `evaluated_by` | **5** |
| **Total** | | **14** |

---

## SQL ejecutado

```sql
-- Tabla: sales_notes
UPDATE sales_notes
SET assigned_to = 'alejandro@kronosdata.tech'
WHERE assigned_to = 'alejandro@kronosdata.com';

-- Tabla: outreach_history
UPDATE outreach_history
SET sent_by = 'alejandro@kronosdata.tech'
WHERE sent_by = 'alejandro@kronosdata.com';

-- Tabla: evaluations
UPDATE evaluations
SET evaluated_by = 'alejandro@kronosdata.tech'
WHERE evaluated_by = 'alejandro@kronosdata.com';
```

Ejecutado vía `scripts/fix-email-db.mjs` usando el driver `pg` con `DATABASE_URL` desde `.env`.

---

## Registros actualizados

| Tabla | Columna | Filas actualizadas |
|-------|---------|-------------------|
| `sales_notes` | `assigned_to` | 4 |
| `outreach_history` | `sent_by` | 5 |
| `evaluations` | `evaluated_by` | 5 |
| **Total** | | **14** |

---

## Verificación post-migración

```sql
-- Consulta de verificación ejecutada tras el UPDATE
SELECT
  (SELECT COUNT(*) FROM sales_notes      WHERE assigned_to  = 'alejandro@kronosdata.com') AS sales_notes,
  (SELECT COUNT(*) FROM outreach_history WHERE sent_by       = 'alejandro@kronosdata.com') AS outreach_history,
  (SELECT COUNT(*) FROM evaluations      WHERE evaluated_by  = 'alejandro@kronosdata.com') AS evaluations;

-- Resultado:
-- sales_notes | outreach_history | evaluations
--           0 |                0 |           0
```

**✅ 0 registros con dominio `.com` en la base de datos.**

---

## Archivos modificados en esta auditoría

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `scripts/fix-email-db.mjs` | Nuevo | Script de migración de datos (reutilizable) |
| `SALES_NOTE_ASSIGNEDTO_AUDIT.md` | Nuevo | Este reporte |

No se modificó ningún archivo de código fuente (el problema era exclusivamente de datos).

---

## Confirmación final — Fuentes de verdad para `.com`

### Código fuente (`.ts`, `.tsx`, `.mjs`, `.json`, `.prisma`)
```
grep -rn "kronosdata\.com" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git
```
**Resultado:** Solo aparece en:
- `EMAIL_FIX_REPORT.md` — documentación histórica de la corrección anterior
- `scripts/fix-email-db.mjs` — el propio script de migración (usa `.com` como término de búsqueda, no como valor de salida)

Ninguna de estas referencias afecta la UI ni genera datos nuevos con `.com`.

### Base de datos Supabase
**0 registros** con `.com` en `sales_notes`, `outreach_history` ni `evaluations`.

### Comportamiento para nuevas empresas
El seed corregido y el código fuente usan `.tech`. Cualquier empresa nueva o re-evaluada usará `alejandro@kronosdata.tech`.

### Comportamiento para empresas antiguas
Los 14 registros migrados ahora muestran `.tech`. Las fichas de empresas antiguas que abran el tab "Notas de Venta" verán el campo "Asignado a" con `alejandro@kronosdata.tech`.

---

## Estado final

| Verificación | Resultado |
|---|---|
| Nuevas empresas usan `.tech` | ✅ |
| Empresas antiguas (datos migrados) usan `.tech` | ✅ |
| Código fuente sin referencias funcionales a `.com` | ✅ |
| Base de datos sin registros con `.com` | ✅ |
| Script de migración disponible para re-ejecución segura | ✅ |

---

*Auditoría cerrada el 2026-06-11 · No iniciar Fase 4 sin aprobación explícita.*
