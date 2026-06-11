# INTERNAL_ACCESS_FIX_REPORT.md
# Sistema de Acceso Interno con Seguridad Reforzada
**Fecha:** 2026-06-11 · **Commit:** `06dbd87` · **Estado:** ✅ Desplegado

---

## 1. Causa del cambio

Supabase Auth fallaba silenciosamente en producción. Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son inlineadas en el bundle de Next.js durante el build — si no estaban presentes cuando Vercel compiló, quedaban `undefined` hardcodeados. Ningún intento de login llegaba a Supabase.

Se implementó un sistema de autenticación propio, completamente server-side, con contraseña hasheada, cookies firmadas, protección contra fuerza bruta, validación de origen y cabeceras de seguridad HTTP.

**Supabase Auth queda temporalmente desactivado como mecanismo de login.** El usuario en Supabase Auth y todos los datos permanecen intactos.

---

## 2. Archivos

### Creados

| Archivo | Descripción |
|---------|-------------|
| `lib/session.ts` | `createSessionToken` / `verifySessionToken` vía `jose` (HS256) |
| `lib/rate-limit.ts` | Rate limiter en memoria — 5 intentos fallidos / 15 min por IP y por email |
| `app/api/auth/login/route.ts` | Endpoint POST de login — hash scrypt, rate limit, validación de origen |
| `app/api/auth/logout/route.ts` | Endpoint POST de logout — elimina cookie, valida origen |
| `scripts/hash-password.mjs` | Script local para generar `INTERNAL_ACCESS_PASSWORD_HASH` |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `proxy.ts` | Valida cookie JWT `kronos_session` — sin dependencia de Supabase Auth |
| `app/login/page.tsx` | Llama a `POST /api/auth/login` — sin Supabase imports |
| `components/layout/sidebar.tsx` | Llama a `POST /api/auth/logout` — sin Supabase imports |
| `next.config.ts` | Cabeceras de seguridad HTTP (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) |
| `.env.example` | `INTERNAL_ACCESS_PASSWORD` renombrada a `INTERNAL_ACCESS_PASSWORD_HASH` |

---

## 3. Seguridad de la contraseña

### Variable

```
INTERNAL_ACCESS_PASSWORD_HASH
```

**La contraseña nunca se almacena en texto plano.** Solo el hash se guarda en Vercel.
No aparece en:
- Bundle del navegador (sin prefijo `NEXT_PUBLIC_`)
- GitHub o archivos versionados
- Logs
- Cookies
- Este reporte

### Algoritmo de hash

**scrypt** (implementación nativa de Node.js, sin dependencias adicionales)

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| N | 65536 (2^16) | Coste CPU/memoria |
| r | 8 | Tamaño de bloque |
| p | 1 | Paralelismo |
| salt | 32 bytes aleatorios | Generado de nuevo en cada hash |
| keylen | 64 bytes | Longitud del hash derivado |

Formato almacenado: `scrypt:65536:8:1:<salt_hex>:<hash_hex>`

### Cómo generar el hash (localmente)

```
node scripts/hash-password.mjs
```

El script pide la contraseña con entrada oculta (sin eco en pantalla). Imprime el hash. No almacena nada. Copia el hash directamente en Vercel como `INTERNAL_ACCESS_PASSWORD_HASH`.

**No compartas la contraseña en este chat ni en ningún archivo.**

### Comparación

- Scrypt asíncrono en Node.js (`node:crypto`)
- `timingSafeEqual` para comparación resistente a timing attacks
- Email y contraseña siempre se validan antes de responder (sin oracle de timing)

---

## 4. Protección contra fuerza bruta

### Límites

| Criterio | Límite |
|----------|--------|
| Intentos fallidos | 5 máximo |
| Ventana de tiempo | 15 minutos |
| Criterio de bloqueo | Por IP **y** por email (independientes) |
| Tiempo de bloqueo | 15 minutos desde el primer intento |

### Implementación

In-memory con `globalThis` (patrón Prisma). Persiste entre invocaciones warm del mismo contenedor serverless. Se resetea en cold starts.

> **Limitación conocida:** En entornos multi-instancia (Vercel alta concurrencia), el contador puede no ser compartido entre instancias. Para un sistema de acceso interno con 1-2 usuarios, esto es aceptable. Para producción de alto tráfico, usar Upstash Redis.

### Logging

Solo se registra:
- Fecha y hora (ISO 8601)
- IP parcialmente anonimizada (último octeto IPv4 = `xxx`, grupos IPv6 = `xxxx`)
- Resultado: `Failed attempt` / `Rate-limited` / `Login success`

Nunca se registra: contraseña, hash, email completo, tokens, cookies.

---

## 5. Sesión segura (cookie)

### Propiedades de la cookie

| Atributo | Valor |
|----------|-------|
| Nombre | `kronos_session` |
| Algoritmo JWT | HS256 firmado con `SESSION_SECRET` |
| Duración | 12 horas (`exp` verificado en cada request) |
| HttpOnly | ✅ No accesible desde JavaScript del navegador |
| Secure | ✅ Solo HTTPS en producción |
| SameSite | `Lax` |
| Path | `/` |
| Contenido | `{ email, iat, exp }` — sin contraseña ni secretos |

### Cómo se rechaza una cookie manipulada

La cookie es un JWT firmado con HMAC-SHA256. Si se modifica cualquier byte del payload o del header, la firma no coincide y `jwtVerify` lanza una excepción. `verifySessionToken` devuelve `null`. El proxy redirige a `/login` y elimina la cookie.

### Cierre de sesión

`POST /api/auth/logout` → `response.cookies.delete(COOKIE_NAME)` → el navegador elimina la cookie completamente.

---

## 6. Validación de origen

Los endpoints `/api/auth/login` y `/api/auth/logout` verifican el header `Origin`:

- Compara `new URL(origin).host === new URL(request.url).host`
- Si no coincide → `403 Forbidden`
- Si falta el header en producción → `403 Forbidden`
- Permite ausencia del header en desarrollo (hot reload, Postman, etc.)

Esto previene que orígenes externos fuercen acciones de login/logout.

---

## 7. Rutas protegidas

### Proxy (`proxy.ts`) — protección completa server-side

| Tipo | Sin sesión | Con sesión expirada/inválida |
|------|-----------|------------------------------|
| Página | Redirect `/login` | Redirect `/login` + elimina cookie |
| `/api/*` | `401 Unauthorized` | `401 Unauthorized` |

### Páginas privadas

`/` · `/companies/new` · `/companies/[id]` · `/companies/[id]/edit`

### APIs privadas

`/api/companies` · `/api/companies/[id]` · `/api/companies/[id]/evaluate` · `/api/companies/[id]/evaluations` · `/api/companies/[id]/outreach` · `/api/companies/[id]/sales-note` · `/api/research`

### Rutas públicas

`/login` · `/api/auth/login` · `/api/auth/logout` · `_next/static/*` · `_next/image/*` · `favicon.ico` · assets estáticos

---

## 8. Cabeceras de seguridad HTTP

Añadidas en `next.config.ts` para todas las rutas (`source: '/(.*)'`):

| Header | Valor | Protección |
|--------|-------|-----------|
| `Content-Security-Policy` | ver abajo | XSS, clickjacking, injection |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking (compatibilidad con navegadores sin CSP) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Fuga de URL en referrer |

#### CSP completa

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' https://*.supabase.co;
frame-src 'none';
frame-ancestors 'none';
object-src 'none';
base-uri 'self'
```

> `unsafe-inline` en script-src es necesario para Next.js (scripts de hidratación inline). Para CSP estricto con nonces, se requiere configuración adicional.

---

## 9. Variables de entorno

| Variable | Tipo | Ubicación |
|----------|------|-----------|
| `DATABASE_URL` | Server-side | Vercel (existente) |
| `NEXT_PUBLIC_SUPABASE_URL` | Build-time público | Vercel (existente) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build-time público | Vercel (existente) |
| `AUTHORIZED_EMAILS` | Server-side runtime | Vercel (existente) |
| `INTERNAL_ACCESS_PASSWORD_HASH` | Server-side runtime | Vercel — **a añadir** |
| `SESSION_SECRET` | Server-side runtime | Vercel — **a añadir** |

`INTERNAL_ACCESS_PASSWORD_HASH` y `SESSION_SECRET` nunca llegan al bundle del navegador (no tienen prefijo `NEXT_PUBLIC_`).

---

## 10. Instrucciones para Vercel

### Paso 1 — Generar el hash de la contraseña (en tu terminal local)

```
node scripts/hash-password.mjs
```

El script pide la contraseña con entrada oculta. Imprime el hash. Copia el resultado.

### Paso 2 — Añadir variables en Vercel

Vercel → proyecto → **Settings → Environment Variables**

#### Variable 1: hash de contraseña

```
Key:   INTERNAL_ACCESS_PASSWORD_HASH
Value: [el hash generado por scripts/hash-password.mjs — empieza con "scrypt:65536:8:1:..."]
```
Marcar: ✅ Production ✅ Preview ✅ Development

#### Variable 2: secreto de sesión

```
Key:   SESSION_SECRET
Value: 3c83bc17ddccf62abf3559250e451d7aec85ff210fc5f9c51a679ac2a6d82d7c6d095b99451c706dbbd636d356322ecf200d740ddd4c4b93ea3f79ba525b4206
```
Marcar: ✅ Production ✅ Preview ✅ Development

> Guarda `SESSION_SECRET` como **Sensitive** en Vercel para que no sea visible después de guardarlo.

### Paso 3 — Redeploy (si el deployment ya terminó)

Si el deployment del commit `06dbd87` terminó antes de que agregaras las variables:

1. Vercel → Deployments → `···` → **Redeploy** → sin cache

> `INTERNAL_ACCESS_PASSWORD_HASH` y `SESSION_SECRET` son runtime (no build-time), así que técnicamente no requieren redeploy. Pero se recomienda para estado limpio.

---

## 11. Pruebas a realizar

| # | Prueba | Esperado |
|---|--------|----------|
| 1 | Email correcto + contraseña correcta | Dashboard — login exitoso |
| 2 | Email correcto + contraseña incorrecta | "Correo o contraseña incorrectos" |
| 3 | Email no autorizado + contraseña correcta | "Correo o contraseña incorrectos" (mensaje genérico) |
| 4 | Acceso directo a `/` sin cookie | Redirige a `/login` |
| 5 | `POST /api/companies` sin cookie | `{"error":"Unauthorized"}` 401 |
| 6 | Cookie alterada manualmente | Rechazada, redirect a `/login` |
| 7 | Botón "Cerrar sesión" | Cookie eliminada, redirect a `/login` |
| 8 | 5 intentos fallidos seguidos | El 6° intento responde igual que un fallo (rate limited) |
| 9 | Login desde origen externo (curl con `Origin: https://otro.com`) | `403 Forbidden` |
| 10 | Sesión válida — funciones actuales | Dashboard, empresas, evaluaciones operativas |

---

## 12. Resultado TypeScript

```
$ npx tsc --noEmit
# (sin output) — Exit code: 0 — 0 errores
```

---

## 13. Resultado del build

```
✔ Generated Prisma Client (7.8.0)
✓ Compiled successfully in 3.1s
✓ Generating static pages (10/10) in 267ms

15 rutas compiladas — ƒ Proxy (Middleware)
```

---

## 14. Commit generado

```
Commit:  06dbd87
Branch:  master
Push:    6e2e2c4..06dbd87  master -> master
Remote:  https://github.com/KronosData/kronos-lead-intelligence.git
```

---

## 15. Riesgos pendientes

| Riesgo | Severidad | Mitigación |
|--------|-----------|-----------|
| Rate limiter in-memory sin compartir entre instancias serverless | Baja | Suficiente para uso interno; scrypt hace brute force computacionalmente caro |
| Contraseña única compartida | Informativo | Sistema de acceso interno — para cuentas individuales, retomar Supabase Auth |
| `unsafe-inline` en CSP script-src | Baja | Necesario para Next.js inline scripts; mitigado por SameSite y no tener datos públicos |
| SESSION_SECRET fijo | Informativo | Rotar el secret invalida todas las sesiones activas (login requerido) |

---

## Estado del sistema

```
🔐 Login:      scrypt hash + cookie JWT HS256 firmada (sin Supabase Auth)
🛡️  Rate limit: 5 intentos / 15 min por IP y por email
🔒 Origen:     validación en login y logout
📋 Headers:    CSP · X-Content-Type-Options · X-Frame-Options · Referrer-Policy
🍪 Cookie:     HttpOnly · Secure · SameSite=Lax · 12h · firmada · rechazo por tamper
🚀 GitHub:     commit 06dbd87 en master
⚙️  Pendiente:  1) generar hash local, 2) añadir INTERNAL_ACCESS_PASSWORD_HASH en Vercel
```

---

*Reporte generado el 2026-06-11 · Kronos Lead Intelligence*
*Commit: 06dbd87 · TypeScript: exit 0 · Build: ✅ 15 rutas*
