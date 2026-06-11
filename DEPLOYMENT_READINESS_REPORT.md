# DEPLOYMENT_READINESS_REPORT.md
# Auditoría de Despliegue — Kronos Lead Intelligence
**Fecha:** 2026-06-11 · **Objetivo:** localhost → Vercel producción
**Veredicto final:** ⚠️ CASI LISTO — 1 fix crítico requerido antes del deploy

---

## Resumen ejecutivo

| Categoría | Estado | Riesgo |
|-----------|--------|--------|
| Build script | ❌ Falta `prisma generate` | **CRÍTICO — build fallará en Vercel** |
| Variables de entorno | ⚠️ Solo `DATABASE_URL` — sin `.env.example` | Importante |
| Prisma + Supabase en serverless | ✅ Configuración correcta | Sin riesgo |
| Rutas API (Node.js runtime) | ✅ Todas compatibles con Vercel | Sin riesgo |
| Timeout de `/api/research` | ⚠️ 8s fetch en límite de 10s Hobby | Importante |
| Secrets / seguridad | ✅ `.env*` en `.gitignore`, `DATABASE_URL` solo server-side | Sin riesgo |
| Next.js App Router | ✅ Vercel es el host oficial de Next.js | Sin riesgo |
| Middleware | ✅ No existe (sin complejidad adicional) | Sin riesgo |
| Supabase DB (cloud) | ✅ Ya en la nube — no requiere migración | Sin riesgo |

**Tiempo total para estar en producción: ~45 minutos** (incluyendo el fix crítico)

---

## 1. Variables de Entorno Requeridas

### Variables actuales del proyecto

| Variable | Usada en | Tipo | Estado |
|----------|----------|------|--------|
| `DATABASE_URL` | `lib/db.ts` | Server-only | ✅ Presente en `.env` local |

**No existen variables `NEXT_PUBLIC_*`** — ningún secret se expone al cliente. Correcto.

### Variables a configurar en Vercel Dashboard

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.uepkrruszvwetrmdllke.supabase.co:5432/postgres
```

> **Recomendación:** Para producción serverless usar el **Supabase Pooler** (puerto 6543) en lugar de la conexión directa (5432). Cada invocación de función Vercel puede crear una nueva conexión; el pooler las reutiliza.
>
> URL del pooler en Supabase: Project Settings → Database → Connection pooling → Connection string
> Puerto: 6543 (Transaction mode)

### Archivo `.env.example` faltante

El proyecto **no tiene `.env.example`**. Este archivo debe existir para documentar las variables requeridas sin exponer los valores reales.

**Fix:** crear `C:\Users\Usuario\Documents\Nueva carpeta\Claude Code\kronos-lead-intelligence\.env.example`
```
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

---

## 2. Fix Crítico: Build Script — `prisma generate` faltante

### El problema

El archivo `.gitignore` excluye correctamente el directorio generado:

```
# En .gitignore:
/app/generated/prisma
```

Esto significa que en Vercel, al clonar el repositorio, **el directorio `app/generated/prisma/` no existirá**. El proceso de build intentará importar:

```typescript
import { PrismaClient } from '@/app/generated/prisma/client'  // lib/db.ts
import { PrismaClient } from '../app/generated/prisma/client' // prisma/seed.ts
```

Y fallará con:

```
Module not found: Can't resolve '@/app/generated/prisma/client'
Build failed.
```

### El fix

En `package.json`, el script `build` debe ejecutar `prisma generate` primero:

**Antes:**
```json
"build": "next build"
```

**Después:**
```json
"build": "prisma generate && next build"
```

`prisma generate` lee `prisma/schema.prisma`, genera el cliente TypeScript en `app/generated/prisma/`, y luego `next build` compila con el cliente ya disponible. No requiere conexión a la base de datos — solo lee el schema.

**Impacto:** Sin este fix, el primer deploy fallará 100% de las veces. Con este fix, el build pasa.

---

## 3. Compatibilidad Next.js + Vercel

### Next.js 16.2.9 en Vercel

Vercel es el mantenedor oficial de Next.js. Next.js 16.x es compatible con Vercel sin configuración adicional.

| Característica | Estado |
|---------------|--------|
| App Router | ✅ Fully supported |
| `async params` en route handlers (`await ctx.params`) | ✅ Patrón correcto para Next.js 15+ |
| `Response.json()` en API routes | ✅ Web APIs estándar — compatible |
| Server Components | ✅ Soportado |
| Client Components (`'use client'`) | ✅ Soportado |

### API Routes — compatibilidad Vercel Functions

Todas las rutas usan el runtime de Node.js (por defecto). Ninguna usa Edge Runtime. Esto es correcto para Prisma + pg.

| Ruta | Runtime | Prisma | Compatible |
|------|---------|--------|-----------|
| `GET /api/companies` | Node.js | ✅ | ✅ |
| `POST /api/companies` | Node.js | ✅ | ✅ |
| `GET /api/companies/[id]` | Node.js | ✅ | ✅ |
| `PATCH /api/companies/[id]` | Node.js | ✅ | ✅ |
| `DELETE /api/companies/[id]` | Node.js | ✅ | ✅ |
| `POST /api/companies/[id]/evaluate` | Node.js | ✅ | ✅ |
| `GET /api/companies/[id]/evaluations` | Node.js | ✅ | ✅ |
| `GET/POST /api/companies/[id]/outreach` | Node.js | ✅ | ✅ |
| `GET/PUT /api/companies/[id]/sales-note` | Node.js | ✅ | ✅ |
| `POST /api/research` | Node.js | N/A | ⚠️ Ver sección 5 |

---

## 4. Configuración Prisma para Producción

### Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  // Sin campo url — correcto con driver adapter (@prisma/adapter-pg)
}
```

Con `@prisma/adapter-pg`, la conexión se pasa directamente al adaptador en runtime:

```typescript
// lib/db.ts
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
```

Este patrón es correcto para Prisma 7.x con driver adapters. `prisma generate` no necesita conectarse a la DB — solo lee el schema. ✅

### Patrón Global Client (`lib/db.ts`)

```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- En **desarrollo**: el cliente se reutiliza entre hot-reloads via `globalThis`
- En **producción**: `globalForPrisma.prisma` no se asigna — cada función crea su propio cliente

En producción serverless (Vercel), este patrón es el recomendado por Next.js y Prisma. ✅

### Recomendación: Supabase Pooler para producción

| Conexión | URL | Uso |
|----------|-----|-----|
| Directa | `...supabase.co:5432` | Migraciones y seed (local) |
| Pooler (Transaction) | `...pooler.supabase.com:6543` | Producción serverless |

**Para Vercel:** configurar `DATABASE_URL` con la URL del Pooler (puerto 6543).
La URL directa (5432) seguirá en `.env` local para `npx prisma db seed` y herramientas de admin.

---

## 5. Riesgo: Timeout de `/api/research`

### Situación

`lib/web-analyzer.ts` usa un timeout de **8 segundos** para el fetch del sitio externo:

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 8000) // 8s
```

**Vercel Hobby plan:** timeout de función = **10 segundos** por defecto
**Vercel Pro plan:** hasta 60 segundos (configurable por ruta)

Con 8s de fetch + parsing de hasta 600KB + overhead de inicio de función, el límite de 10s del plan Hobby es ajustado. En sitios lentos, la función podría timeout antes de que el fetch complete su cleanup.

### Opciones

**Opción A — Vercel Hobby (bajo costo, riesgo bajo):**

Reducir el timeout del fetch a 6 segundos para dejar headroom:

```typescript
// lib/web-analyzer.ts, línea 233
const timeoutId = setTimeout(() => controller.abort(), 6000) // 6s → margin para Hobby
```

El usuario ya ve el mensaje "El sitio tardó más de 8 segundos" — con 6s seguirá siendo informativo.

**Opción B — Vercel Pro (recomendado al tener primer cliente):**

Añadir a `app/api/research/route.ts`:
```typescript
export const maxDuration = 30 // segundos — requiere Vercel Pro
```

Esto elimina el riesgo completamente y permite analizar sitios más lentos.

**Decisión para el deploy inicial:** Aplicar Opción A (cambio mínimo, cero costo). Migrar a Pro + Opción B cuando haya revenue.

---

## 6. Checklist de Despliegue

### Antes de hacer deploy

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 1 | Cambiar `"build"` en `package.json` a `"prisma generate && next build"` | **CRÍTICO** | ❌ Pendiente |
| 2 | Crear `.env.example` con placeholder de `DATABASE_URL` | Importante | ❌ Pendiente |
| 3 | Reducir timeout de fetch en `web-analyzer.ts` de 8s a 6s (si Hobby plan) | Recomendado | ❌ Pendiente |
| 4 | Verificar que `.gitignore` tiene `.env*` y `/app/generated/prisma` | Seguridad | ✅ Ya correcto |
| 5 | Crear repositorio en GitHub (si no existe) | Requerido | ❓ Verificar |
| 6 | Push del código al repositorio | Requerido | ❓ Verificar |

### En Vercel Dashboard

| # | Tarea | Detalle |
|---|-------|---------|
| 7 | Crear cuenta en vercel.com (si no existe) | Gratis |
| 8 | Conectar repositorio GitHub | "Import Git Repository" |
| 9 | Framework: Next.js (autodetectado) | No requiere cambio |
| 10 | Build command: `npm run build` | Heredado del `package.json` |
| 11 | Añadir variable de entorno `DATABASE_URL` | Con valor del Pooler de Supabase |
| 12 | Deploy | Clic en "Deploy" |

### Después del deploy

| # | Verificación |
|---|-------------|
| 13 | Acceder a la URL de Vercel → dashboard carga |
| 14 | `/api/companies` devuelve JSON válido |
| 15 | Crear una empresa de prueba → se guarda |
| 16 | Ejecutar Research Assistant con una URL real |
| 17 | Evaluar una empresa → score calculado |
| 18 | Outreach panel → plantilla generada sin `[Nombre]` |

---

## 7. Riesgos Encontrados (resumen)

| Riesgo | Severidad | Fix | Tiempo |
|--------|-----------|-----|--------|
| `prisma generate` faltante en build | **Crítico** | Editar `package.json` | 1 min |
| Timeout `/api/research` ajustado en Hobby | Importante | Reducir a 6s en `web-analyzer.ts` | 1 min |
| Sin `.env.example` | Informativo | Crear el archivo | 2 min |
| Conexión directa (5432) vs Pooler (6543) | Recomendación | Usar URL del Pooler en Vercel | 2 min |
| Sin dominio personalizado | Cosmético | Configurar en Vercel (post-deploy) | 10 min |

**Total de correcciones necesarias: 3 fixes, ~5 minutos en total**

---

## 8. Instrucciones Exactas de Despliegue

### Paso 1 — Fix crítico (package.json)

Abrir `package.json`, cambiar la línea 7:

```json
"build": "prisma generate && next build",
```

### Paso 2 — Crear `.env.example`

Crear archivo `.env.example` en la raíz del proyecto:

```
# Supabase PostgreSQL — usar URL del Pooler (puerto 6543) en producción
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

### Paso 3 — Reducir timeout (opcional pero recomendado para Hobby)

En `lib/web-analyzer.ts`, línea 233, cambiar `8000` por `6000`.

### Paso 4 — Push a GitHub

```bash
git add package.json .env.example lib/web-analyzer.ts
git commit -m "fix: add prisma generate to build script for Vercel deployment"
git push origin main
```

### Paso 5 — Vercel

1. Ir a [vercel.com](https://vercel.com) → Log in / Sign up
2. "Add New Project" → "Import Git Repository"
3. Seleccionar el repositorio `kronos-lead-intelligence`
4. Framework: **Next.js** (autodetectado)
5. En "Environment Variables":
   - Key: `DATABASE_URL`
   - Value: `postgresql://postgres:[PASSWORD]@[POOLER_HOST]:6543/postgres`
   - Environment: Production + Preview + Development
6. Clic en **"Deploy"**
7. Esperar ~3 minutos (build + deploy)
8. Acceder a la URL generada: `https://kronos-lead-intelligence-xxx.vercel.app`

### Paso 6 — Dominio personalizado (opcional, post-deploy)

En Vercel Dashboard → Project → Settings → Domains:
- Añadir `kronos.tu-dominio.com` o similar
- Seguir instrucciones DNS del proveedor del dominio

---

## 9. Plan Mínimo — Fase 4 Autenticación

Una vez desplegado en Vercel, el siguiente paso es proteger el acceso. El sistema no tiene autenticación: cualquier persona con la URL puede acceder a todos los datos.

### Enfoque recomendado: Supabase Auth

Supabase ya está en el stack. Añadir autenticación con Supabase Auth no requiere ninguna dependencia de base de datos nueva — Supabase gestiona su propia tabla `auth.users` internamente.

### Qué se construye

| Componente | Descripción | Tiempo |
|-----------|-------------|--------|
| `npm install @supabase/ssr @supabase/supabase-js` | Paquetes cliente | 5 min |
| 2 vars de entorno nuevas | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 5 min |
| `lib/supabase.ts` | Clientes browser + server | 20 min |
| `app/login/page.tsx` | Formulario email + contraseña | 45 min |
| `middleware.ts` | Redirige a `/login` si no hay sesión | 30 min |
| Verificar sesión en layout | `<AuthGuard>` o check en root layout | 20 min |
| Deploy + test en Vercel | — | 15 min |
| **Total Fase 4 (single-user)** | Login wall completo | **~2.5 horas** |

### Lo que cubre la Fase 4 mínima

- ✅ Solo usuarios autenticados pueden acceder al dashboard
- ✅ Login con email + contraseña (`alejandro@kronosdata.tech`)
- ✅ Sesión persistente (cookie httpOnly gestionada por Supabase)
- ✅ `/login` es la única ruta pública
- ✅ Logout funcional

### Lo que NO cubre (para después)

- ❌ Multi-usuario (distintos clientes con datos separados) — requiere `userId` en tablas + RLS
- ❌ Registro público de cuentas
- ❌ Recuperación de contraseña (existe en Supabase, solo hay que activarlo)
- ❌ OAuth (Google, GitHub)

**La Fase 4 mínima (2.5h) es suficiente para dar acceso a un primer cliente** — se le crea la cuenta manualmente en el panel de Supabase Auth y se le comparte la URL.

### Nuevas variables de entorno para Fase 4

```
NEXT_PUBLIC_SUPABASE_URL=https://uepkrruszvwetrmdllke.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (desde Supabase Dashboard → Settings → API)
```

---

## 10. Tiempo Total Estimado

| Tarea | Tiempo |
|-------|--------|
| 3 fixes de código (pkg.json + env.example + timeout) | 5 min |
| Git push | 5 min |
| Configuración en Vercel (cuenta, repo, env vars) | 10 min |
| Primer build + deploy | 4 min |
| Verificación en producción | 10 min |
| **Total hasta URL pública funcionando** | **~35 minutos** |
| Fase 4 — Autenticación básica | ~2.5 horas adicionales |
| **Total hasta sistema autenticado en producción** | **~3 horas** |

---

## Veredicto Final

**GO para deploy — con 1 fix obligatorio antes de hacer push.**

El fix crítico (`prisma generate` en build script) tarda 30 segundos. Sin él, el build falla. Con él, el deploy debería completarse sin errores.

El resto del proyecto está estructuralmente sano para Vercel:
- Supabase ya está en la nube
- No hay migraciones pendientes
- No hay secrets en código
- App Router es nativamente compatible con Vercel
- No existe middleware de complejidad añadida

En menos de 1 hora, Kronos puede tener una URL pública funcional. En 3 horas adicionales, puede tener login.

---

*Reporte generado el 2026-06-11 · Kronos Lead Intelligence*  
*Archivos revisados: package.json, next.config.ts, tsconfig.json, prisma/schema.prisma, lib/db.ts, lib/web-analyzer.ts, app/api/research/route.ts, app/api/companies/route.ts, app/api/companies/[id]/evaluate/route.ts, lib/api-helpers.ts, .gitignore*  
*Estado: 1 fix crítico · 2 recomendaciones · 0 blockers de seguridad*
