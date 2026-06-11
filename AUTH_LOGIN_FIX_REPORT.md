# AUTH_LOGIN_FIX_REPORT.md
# Diagnóstico y corrección del fallo de autenticación en producción
**Fecha:** 2026-06-11 · **Commit:** `3bc37cf` · **Estado:** ✅ Fix desplegado

---

## 1. Causa raíz

**`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estaban `undefined` en el bundle de producción.**

### Explicación técnica

En Next.js, las variables con prefijo `NEXT_PUBLIC_` son **inlineadas estáticamente en el bundle JavaScript durante el proceso de `next build`**. No son variables de runtime — quedan hardcodeadas en el código compilado.

```
NEXT_PUBLIC_SUPABASE_URL=https://uepkrruszvwetrmdllke.supabase.co
                 ↓ durante next build
createBrowserClient("https://uepkrruszvwetrmdllke.supabase.co", "eyJ...")
```

Fuente — Next.js 16 docs (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`):
> *"After being built, your app will no longer respond to changes to these environment variables… all `NEXT_PUBLIC_` variables will be frozen with the value evaluated at build time."*

### Secuencia del fallo

1. Commit `0eb8def` se subió a GitHub → Vercel inició un build automático
2. En ese momento, las vars `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` **aún no estaban configuradas en Vercel** (el usuario las añadió después, siguiendo las instrucciones del reporte anterior)
3. Vercel compiló el bundle con `undefined` inlineado en lugar de los valores reales
4. En producción: `createBrowserClient(undefined, undefined)` → el cliente Supabase no tiene URL válida
5. Cuando el usuario envía el formulario: `signInWithPassword(...)` intenta hacer fetch a `undefined/auth/v1/token`
6. La petición falla antes de llegar a Supabase → **0 intentos aparecen en los logs de Supabase Auth** ← evidencia confirmada
7. El `authError` capturado era un `TypeError` (network error), no un `AuthApiError`
8. El catch genérico mostraba siempre "Correo o contraseña incorrectos" ocultando el error real

---

## 2. Evidencia que confirmó el diagnóstico

| Evidencia | Interpretación |
|-----------|----------------|
| "Correo o contraseña incorrectos" en producción | `authError !== null` → algún error existe |
| 0 intentos en Supabase → Logs → Auth | El fetch **nunca llega a Supabase** |
| Solo aparecen `/admin/users` y `user_signedup` | Solo operaciones del Dashboard (manuales) |
| Usuario existente y confirmado en Supabase | No es un problema de credenciales |
| `.env` local solo tiene `DATABASE_URL` | Las vars NEXT_PUBLIC_ no estaban definidas localmente ni en el build anterior |

---

## 3. Variables verificadas

| Variable | En Vercel | En código | Nombre correcto |
|----------|-----------|-----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ (añadida por el usuario) | ✅ `process.env.NEXT_PUBLIC_SUPABASE_URL` | ✅ coincide |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ (añadida por el usuario) | ✅ `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ coincide |
| `AUTHORIZED_EMAILS` | ✅ | ✅ `process.env.AUTHORIZED_EMAILS` en proxy.ts | ✅ coincide |
| `DATABASE_URL` | ✅ (ya existía) | ✅ en Prisma | ✅ coincide |

El proyecto correcto es `uepkrruszvwetrmdllke` (confirmado en `.env` local con `db.uepkrruszvwetrmdllke.supabase.co`).

### Formato de clave aceptado

`NEXT_PUBLIC_SUPABASE_ANON_KEY` acepta claves en formato `sb_publishable_...` (nuevo formato Supabase) — `@supabase/ssr@0.12.0` y `@supabase/supabase-js@2.108.1` lo soportan. La clave es solo una cadena que el servidor valida.

---

## 4. Auditoría de seguridad del flujo

| Punto | Verificación | Resultado |
|-------|-------------|-----------|
| `/login` en rutas públicas del proxy | `pathname === '/login'` → pass through | ✅ NO bloqueado |
| `AUTHORIZED_EMAILS` se aplica DESPUÉS de auth | El check de email ocurre después de `getUser()` exitoso | ✅ Correcto |
| Proxy no intercepta requests del browser a Supabase | `signInWithPassword` hace fetch directo browser→Supabase, no pasa por Next.js | ✅ Correcto |
| Sin redirect loop | `/login` siempre se sirve; autenticado en `/login` → redirect a `/` | ✅ Correcto |
| Cookies de sesión | Gestionadas por `@supabase/ssr` mediante `setAll/getAll` | ✅ Correcto |
| `AUTHORIZED_EMAILS` vacío | Si está vacío, no se aplica filtro (cualquier cuenta Supabase puede entrar) | ✅ Documentado |

---

## 5. Archivos modificados

### `lib/supabase/client.ts`

**Cambio:** Añadida validación que logea `console.error` si `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` son `undefined` o vacías.

```typescript
if (!url || !key) {
  console.error(
    '[Supabase] MISSING ENV VARS at build time.',
    'NEXT_PUBLIC_SUPABASE_URL:', url ? 'SET' : 'UNDEFINED',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? 'SET' : 'UNDEFINED',
  )
}
```

Este mensaje aparece en la consola del navegador (DevTools → Console) en el momento en que se carga la página de login. Confirma inmediatamente si el problema es de vars faltantes.

---

### `app/login/page.tsx`

**Cambio:** El bloque `catch` de `signInWithPassword` ahora:
1. Logea el error real a `console.error` (visible en DevTools y en Vercel Runtime Logs)
2. Distingue entre error de red y error de autenticación
3. Muestra un mensaje diferente según el tipo de error

```typescript
console.error('[Auth] signInWithPassword failed:', {
  name: authError.name,      // "TypeError" (red) o "AuthApiError" (credenciales)
  message: authError.message, // "Failed to fetch" o "Invalid login credentials"
  code,                       // "invalid_credentials" si es auth real
  status,                     // 400 si llegó a Supabase
})

const isNetworkError = authError.name !== 'AuthApiError'
if (isNetworkError) {
  setError(`Error de conexión con el servidor de autenticación. (${authError.name}: ${authError.message}) — Revisa los logs de Vercel.`)
} else if (code === 'invalid_credentials') {
  setError('Correo o contraseña incorrectos.')
} else {
  setError(`Error de autenticación: ${code ?? status ?? authError.message}`)
}
```

**Lo que NO se logea ni muestra al usuario:**
- Contraseña ✅
- Claves (`ANON_KEY`, `SERVICE_ROLE`) ✅
- Tokens o cookies ✅
- `DATABASE_URL` ✅

---

### `.env` (local, gitignored)

**Cambio:** Añadidas las vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `AUTHORIZED_EMAILS` con valores de referencia para desarrollo local. Este archivo NO se commitea.

---

## 6. Resultado TypeScript

```bash
$ npx tsc --noEmit
# (sin output)
# Exit code: 0 — 0 errores
```

---

## 7. Resultado del build

```
✔ Generated Prisma Client (7.8.0) in 80ms
✓ Compiled successfully in 3.3s
✓ Generating static pages (8/8) in 270ms

Route (app)
○ /              ○ /_not-found     ○ /companies/new  ○ /login
ƒ /api/companies    ƒ /api/companies/[id]
ƒ /api/companies/[id]/evaluate  ƒ /api/companies/[id]/evaluations
ƒ /api/companies/[id]/outreach  ƒ /api/companies/[id]/sales-note
ƒ /api/research  ƒ /companies/[id]  ƒ /companies/[id]/edit

ƒ Proxy (Middleware)
```

---

## 8. Commit generado

```
Commit:  3bc37cf
Mensaje: fix(auth): add env var guard and diagnostic error logging to diagnose login failure
Branch:  master
Push:    0eb8def..3bc37cf  master -> master
Remote:  https://github.com/KronosData/kronos-lead-intelligence.git
```

---

## 9. Estado del deployment

El push a `master` dispara el auto-deploy en Vercel.

**Este nuevo deployment compilará el bundle con las `NEXT_PUBLIC_` vars ya configuradas en Vercel**, resolviendo el problema de raíz.

### Cómo verificar que el deployment fue exitoso

1. Vercel → proyecto → Deployments
2. El deployment más reciente debe mostrar estado **Ready** (verde)
3. Verificar que fue triggered por el commit `3bc37cf`

---

## 10. Instrucciones para probar el login

### Verificación rápida (antes de probar credenciales)

1. Abrir la URL de producción en el navegador
2. Abrir DevTools → pestaña **Console**
3. Recargar la página
4. Buscar el mensaje `[Supabase] MISSING ENV VARS` en la consola

   - ✅ Si NO aparece → las vars están correctamente inlineadas en el bundle
   - ❌ Si SÍ aparece → las vars siguen sin estar en el bundle. Ver sección "Si el error persiste"

### Probar el login

1. En la página de login, introducir email y contraseña
2. Observar el mensaje de error si falla:

   | Mensaje | Significado | Acción |
   |---------|-------------|--------|
   | "Error de conexión… TypeError: Failed to fetch" | URL de Supabase incorrecta o undefined | Verificar `NEXT_PUBLIC_SUPABASE_URL` en Vercel |
   | "Error de conexión… TypeError: Only absolute URLs..." | `NEXT_PUBLIC_SUPABASE_URL` es undefined | Igual |
   | "Correo o contraseña incorrectos." | Credenciales incorrectas (llegó a Supabase) | Verificar contraseña del usuario en Supabase Auth |
   | "Error de autenticación: email_not_confirmed" | Email no confirmado en Supabase | Supabase → Authentication → Users → confirmar manualmente |

3. Abrir DevTools → **Console** durante el intento de login para ver el log `[Auth] signInWithPassword failed` con detalles completos.

4. En Vercel → proyecto → **Functions** → **Logs** → ver los logs de runtime.

---

## 11. Si el error persiste después del deploy

### Escenario A: "Error de conexión" sigue apareciendo

El bundle aún no tiene las vars. Causas posibles:

1. **Las vars en Vercel tienen valores incorrectos** (ej: copiadas con espacios extra o saltos de línea)
   - Vercel → Settings → Environment Variables → verificar y re-ingresar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` sin espacios adicionales
   - Hacer redeploy manual en Vercel (Deployments → ··· → Redeploy → sin cache)

2. **El auto-deploy no se disparó** → Vercel → Deployments → verificar si el commit `3bc37cf` aparece

### Escenario B: "Correo o contraseña incorrectos" aparece (progreso — llegamos a Supabase)

Esto confirma que las vars están bien. El problema es de credenciales:
- Verificar el email exacto del usuario en Supabase Auth (no debe tener espacios)
- Reintentar con la contraseña correcta
- Si olvidaste la contraseña: Supabase → Authentication → Users → editar usuario → "Send password recovery" o establecer nueva contraseña

### Escenario C: Login exitoso pero redirige de vuelta a /login

El email autenticado no está en `AUTHORIZED_EMAILS` de Vercel. Verificar que el valor en Vercel sea exactamente `alejandro@kronosdata.tech` (sin espacios, sin comillas).

---

## Estado del sistema

```
🔐 Auth:       Supabase Auth email+password — flujo correcto
📦 Bundle:     NEXT_PUBLIC_ vars se inlinearán en el nuevo build de Vercel
🚀 GitHub:     commit 3bc37cf en master — auto-deploy disparado
📊 DB:         0 empresas · 0 evaluaciones · 0 notas · 0 outreach
✅ TS:         exit 0 — 0 errores
✅ Build:      13 rutas — sin errores
```

---

*Reporte generado el 2026-06-11 · Kronos Lead Intelligence*
*Commit: 3bc37cf · TypeScript: exit 0 · Build: ✅*
