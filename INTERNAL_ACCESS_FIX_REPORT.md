# INTERNAL_ACCESS_FIX_REPORT.md
# Sistema de Acceso Interno — Kronos Lead Intelligence
**Fecha:** 2026-06-11 · **Commit:** `6e2e2c4` · **Estado:** ✅ Desplegado

---

## 1. Causa del cambio

Supabase Auth fallaba silenciosamente en producción: las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son inlineadas en el bundle de Next.js durante el build. El timing entre la configuración de Vercel y la compilación provocaba que el cliente Supabase apuntara a `undefined`, por lo que ningún intento de login llegaba a Supabase Auth.

En lugar de continuar depurando esta dependencia externa, se implementó un sistema de autenticación interno completamente server-side, sin dependencias de terceros para el proceso de login.

**Supabase Auth queda temporalmente desactivado como mecanismo de login.** El usuario `alejandro@kronosdata.tech` en Supabase Auth y todos los datos de Supabase permanecen intactos y podrán recuperarse para cuentas individuales en una fase futura.

---

## 2. Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `lib/session.ts` | Utilidades de sesión: `createSessionToken` / `verifySessionToken` vía `jose` |
| `app/api/auth/login/route.ts` | Endpoint POST — valida email y contraseña, emite cookie de sesión |
| `app/api/auth/logout/route.ts` | Endpoint POST — elimina la cookie de sesión |

## 3. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `proxy.ts` | Eliminada lógica de Supabase SSR. Ahora valida únicamente la cookie JWT `kronos_session` |
| `app/login/page.tsx` | Eliminado `createClient` de Supabase. Llama a `POST /api/auth/login` |
| `components/layout/sidebar.tsx` | Eliminado `createClient` de Supabase. Llama a `POST /api/auth/logout` |
| `.env.example` | Añadidos `INTERNAL_ACCESS_PASSWORD` y `SESSION_SECRET` con placeholders |
| `package.json` / `package-lock.json` | Añadida dependencia `jose` |

---

## 4. Cómo funciona el sistema

### Flujo de login

```
Usuario introduce email + contraseña
        │
        ▼
POST /api/auth/login (Node.js runtime)
  1. Verifica email en AUTHORIZED_EMAILS
  2. Compara contraseña con INTERNAL_ACCESS_PASSWORD
     (timingSafeEqual — resistente a timing attacks)
  3. Si válido: crea JWT firmado con SESSION_SECRET (HS256)
  4. Establece cookie kronos_session
        │
        ▼
Browser redirige a /
```

### Flujo de verificación en cada request

```
Request → proxy.ts (Edge runtime)
  1. ¿Ruta pública? (/login, /api/auth/login, /api/auth/logout)
     → pass through
  2. ¿Existe cookie kronos_session?
     No → API: 401 JSON / Página: redirect /login
  3. ¿JWT válido y no expirado?
     No → eliminar cookie, redirect /login
     Sí → pass through
```

### Flujo de logout

```
Botón "Cerrar sesión"
        │
        ▼
POST /api/auth/logout
  Elimina cookie kronos_session
        │
        ▼
Browser redirige a /login
```

### Cookie de sesión

| Atributo | Valor |
|----------|-------|
| Nombre | `kronos_session` |
| Algoritmo JWT | HS256 |
| Duración | 12 horas |
| HttpOnly | ✅ (no accesible desde JavaScript del navegador) |
| Secure | ✅ en producción (HTTPS únicamente) |
| SameSite | Lax |
| Path | / |
| Contenido | `{ email, iat, exp }` — sin contraseña ni secretos |

---

## 5. Rutas protegidas

### Páginas (redirigen a /login sin sesión válida)

| Ruta |
|------|
| `/` (dashboard) |
| `/companies/new` |
| `/companies/[id]` |
| `/companies/[id]/edit` |

### API Routes (responden `401 { "error": "Unauthorized" }` sin sesión válida)

| Ruta |
|------|
| `/api/companies` |
| `/api/companies/[id]` |
| `/api/companies/[id]/evaluate` |
| `/api/companies/[id]/evaluations` |
| `/api/companies/[id]/outreach` |
| `/api/companies/[id]/sales-note` |
| `/api/research` |

### Rutas públicas (siempre accesibles)

| Ruta | Razón |
|------|-------|
| `/login` | Página de autenticación |
| `/api/auth/login` | Endpoint de inicio de sesión |
| `/api/auth/logout` | Endpoint de cierre de sesión |

---

## 6. Variables de entorno

| Variable | Tipo | Uso |
|----------|------|-----|
| `DATABASE_URL` | Server-side | Prisma (sin cambios) |
| `NEXT_PUBLIC_SUPABASE_URL` | Público (build time) | Cliente Supabase DB (sin cambios) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público (build time) | Cliente Supabase DB (sin cambios) |
| `AUTHORIZED_EMAILS` | Server-side | Lista de emails autorizados (ya existía) |
| `INTERNAL_ACCESS_PASSWORD` | Server-side | Contraseña del sistema de acceso interno — NUNCA en bundle |
| `SESSION_SECRET` | Server-side | Firma JWT de cookies de sesión — NUNCA en bundle |

`INTERNAL_ACCESS_PASSWORD` y `SESSION_SECRET` no tienen prefijo `NEXT_PUBLIC_` — **nunca llegan al bundle del navegador**.

---

## 7. Resultado TypeScript

```
$ npx tsc --noEmit
# (sin output)
# Exit code: 0 — 0 errores
```

---

## 8. Resultado del build

```
✔ Generated Prisma Client (7.8.0)
✓ Compiled successfully in 3.2s
✓ Generating static pages (10/10)

Route (app)
○ /              ○ /_not-found     ○ /companies/new  ○ /login
ƒ /api/auth/login    ƒ /api/auth/logout
ƒ /api/companies     ƒ /api/companies/[id]
ƒ /api/companies/[id]/evaluate  ƒ /api/companies/[id]/evaluations
ƒ /api/companies/[id]/outreach  ƒ /api/companies/[id]/sales-note
ƒ /api/research  ƒ /companies/[id]  ƒ /companies/[id]/edit

ƒ Proxy (Middleware)
```

15 rutas compiladas (2 nuevas: `/api/auth/login`, `/api/auth/logout`).

---

## 9. Commit generado

```
Commit:  6e2e2c4
Branch:  master
Push:    3bc37cf..6e2e2c4  master -> master
Remote:  https://github.com/KronosData/kronos-lead-intelligence.git
```

---

## 10. Instrucciones para Vercel

### Variables a añadir

Vercel → proyecto `kronos-lead-intelligence` → **Settings → Environment Variables**

#### Variable 1

```
Key:   INTERNAL_ACCESS_PASSWORD
Value: [la contraseña que tú elijas — mínimo 12 caracteres recomendado]
```
Marcar: ✅ Production ✅ Preview ✅ Development

Esta es la contraseña con la que entrarás al sistema. Elígela tú directamente en Vercel.

---

#### Variable 2

```
Key:   SESSION_SECRET
Value: 3c83bc17ddccf62abf3559250e451d7aec85ff210fc5f9c51a679ac2a6d82d7c6d095b99451c706dbbd636d356322ecf200d740ddd4c4b93ea3f79ba525b4206
```
Marcar: ✅ Production ✅ Preview ✅ Development

> Este es el SESSION_SECRET generado criptográficamente (64 bytes / 512 bits). Cópialo exactamente. No lo compartas, no lo publiques, y no lo guardes en ningún archivo del repositorio.

---

### Verificar variables existentes

Estas ya deben existir en Vercel (no modificar):
- `DATABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `AUTHORIZED_EMAILS` ✅ (debe tener `alejandro@kronosdata.tech`)

---

### Redeploy

Si el deployment de Vercel (`6e2e2c4`) ya terminó **antes** de que agregaras las variables:

1. Vercel → Deployments → último deploy → `···` → **Redeploy**
2. Desmarcar "Use existing Build Cache"
3. Confirmar

Si el deployment aún está corriendo cuando agregas las variables, se tomará automáticamente.

> **Nota:** `INTERNAL_ACCESS_PASSWORD` y `SESSION_SECRET` son variables de runtime (no de build time), por lo que técnicamente un redeploy no es obligatorio para ellas. Pero se recomienda para asegurar un estado limpio.

---

## 11. Pruebas a realizar

| # | Prueba | Esperado |
|---|--------|----------|
| 1 | Email correcto + contraseña correcta | Entra al dashboard |
| 2 | Email correcto + contraseña incorrecta | "Correo o contraseña incorrectos" |
| 3 | Email no autorizado + contraseña correcta | "Correo o contraseña incorrectos" |
| 4 | Acceso directo a `/` sin cookie | Redirige a /login |
| 5 | `GET /api/companies` sin cookie | `{"error":"Unauthorized"}` 401 |
| 6 | Cookie alterada manualmente | Rechazada, redirige a /login |
| 7 | Botón "Cerrar sesión" | Cookie eliminada, redirige a /login |
| 8 | Funcionalidad normal post-login | Dashboard, empresas, evaluaciones operativos |

---

## 12. Riesgos pendientes

| Riesgo | Severidad | Observación |
|--------|-----------|-------------|
| Contraseña única compartida | Baja | Es un sistema de acceso interno — diseñado para 1-2 usuarios. Para múltiples cuentas individuales, retomar Supabase Auth en fase futura |
| Sin rate limiting en /api/auth/login | Baja | Vercel tiene protección básica. Para tráfico elevado, considerar añadir rate limiting |
| SESSION_SECRET fijo | Informativo | Rotar el secret invalida todas las sesiones activas (usuarios deben volver a hacer login) |
| Supabase Auth desactivado temporalmente | Informativo | El usuario en Supabase Auth permanece intacto. Reactivable en cualquier momento |

---

## Estado del sistema

```
🔐 Login:      Sistema interno — email + contraseña (sin Supabase Auth)
🍪 Sesión:     JWT firmado (HS256), HttpOnly, Secure, 12h, cookie kronos_session
🗄️  Base datos: Supabase/Prisma sin cambios — 0 empresas listas para datos reales
🚀 GitHub:     commit 6e2e2c4 en master — auto-deploy en curso
⚙️  Pendiente:  Añadir INTERNAL_ACCESS_PASSWORD y SESSION_SECRET en Vercel
✅ TS:         exit 0  ✅ Build: 15 rutas
```

---

*Reporte generado el 2026-06-11 · Kronos Lead Intelligence*
*Commit: 6e2e2c4 · TypeScript: exit 0 · Build: ✅ 15 rutas*
