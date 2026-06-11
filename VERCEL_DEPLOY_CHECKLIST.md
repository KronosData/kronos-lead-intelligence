# VERCEL_DEPLOY_CHECKLIST.md
# Instrucciones de Despliegue — Kronos Lead Intelligence en Vercel
**Fecha:** 2026-06-11 · **Tiempo estimado total: ~35 minutos**

---

## Prerequisitos

- [ ] Cuenta en GitHub (gratuita)
- [ ] Cuenta en Vercel (gratuita en: vercel.com/signup)
- [ ] Acceso al panel de Supabase del proyecto `uepkrruszvwetrmdllke`
- [ ] Build local verificado (`npm run build` exitoso — ya completado)

---

## PASO 1 — Obtener la URL de Pooler de Supabase

*(~3 minutos)*

1. Ir a [supabase.com](https://supabase.com) → iniciar sesión
2. Seleccionar el proyecto Kronos (`uepkrruszvwetrmdllke`)
3. En el panel lateral: **Project Settings** → **Database**
4. Buscar la sección **"Connection string"**
5. Seleccionar modo: **"Transaction"** (no "Session" ni "Direct")
6. Copiar la URL que empieza con `postgresql://postgres.uepkrrus...@aws-0-...pooler.supabase.com:6543/postgres`
7. Reemplazar `[YOUR-PASSWORD]` en la URL con la contraseña real del proyecto

> La URL del Pooler usa puerto **6543**. La URL directa usa 5432. Para Vercel usar siempre 6543.

---

## PASO 2 — Crear repositorio en GitHub y hacer push

*(~5 minutos)*

### Si el repositorio ya existe en GitHub

```bash
cd "C:\Users\Usuario\Documents\Nueva carpeta\Claude Code\kronos-lead-intelligence"
git add package.json lib/web-analyzer.ts .env.example
git commit -m "fix: prisma generate in build, timeout tuning, env example for Vercel"
git push origin main
```

### Si NO existe repositorio en GitHub todavía

```bash
cd "C:\Users\Usuario\Documents\Nueva carpeta\Claude Code\kronos-lead-intelligence"

# Inicializar git (si no está inicializado)
git init
git add .
git commit -m "initial: Kronos Lead Intelligence — Phase 3 complete, Vercel-ready"

# Crear repositorio en GitHub (via GitHub CLI si está instalado)
gh repo create kronos-lead-intelligence --private --source=. --push

# O manualmente:
# 1. Ir a github.com/new
# 2. Nombre: kronos-lead-intelligence
# 3. Privado (recomendado)
# 4. Sin README (el repo local ya tiene código)
# 5. Copiar los comandos que GitHub muestra y ejecutarlos
```

> **Importante:** Verificar que `.gitignore` excluye `.env` antes del push.
> Ejecutar `git status` y confirmar que `.env` NO aparece en los archivos para commit.

---

## PASO 3 — Conectar Vercel con GitHub

*(~5 minutos)*

1. Ir a [vercel.com](https://vercel.com) → iniciar sesión / crear cuenta
2. En el dashboard: clic en **"Add New..."** → **"Project"**
3. En "Import Git Repository": buscar `kronos-lead-intelligence`
4. Si no aparece: clic en **"Adjust GitHub App Permissions"** → autorizar el repositorio
5. Seleccionar el repositorio y clic en **"Import"**

---

## PASO 4 — Configurar el proyecto en Vercel

*(~3 minutos)*

En la pantalla de configuración del proyecto:

### Framework Preset
- Vercel detecta automáticamente: **Next.js** ✅
- No cambiar nada

### Build & Output Settings
- Build Command: `npm run build` ✅ (hereda `prisma generate && next build` del package.json)
- Output Directory: `.next` ✅ (por defecto)
- Install Command: `npm install` ✅ (por defecto)

### Environment Variables

Añadir la siguiente variable:

| Key | Value | Environments |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres.uepkrrus...:CONTRASEÑA@aws-0-REGION.pooler.supabase.com:6543/postgres` | ✅ Production ✅ Preview ✅ Development |

> Usar la URL del Pooler (6543) copiada en el Paso 1.
> Pegar la URL completa con la contraseña real ya incluida.

---

## PASO 5 — Deploy

*(~4 minutos de build)*

1. Clic en **"Deploy"**
2. Esperar mientras Vercel:
   - Clona el repositorio
   - Ejecuta `npm install` (instala todas las dependencias incluidas devDeps)
   - Ejecuta `prisma generate` (genera el cliente Prisma)
   - Ejecuta `next build` (compila la aplicación)
   - Despliega los archivos estáticos y las funciones serverless
3. Al completarse, Vercel muestra: **"Congratulations!"** con la URL del proyecto

**URL generada:** `https://kronos-lead-intelligence-[hash].vercel.app`

Si el build falla, ver sección de **Troubleshooting** al final de este documento.

---

## PASO 6 — Verificación post-deploy

*(~5 minutos)*

Abrir la URL de Vercel y verificar cada punto:

- [ ] **Dashboard carga** — la página principal muestra el pipeline de leads
- [ ] **Lista de empresas** — se ven las empresas existentes en Supabase
- [ ] **Crear empresa** — ir a `/companies/new`, crear empresa de prueba, guardar
- [ ] **API funciona** — `https://[URL]/api/companies` devuelve JSON con las empresas
- [ ] **Research Assistant** — abrir una empresa, pegar una URL, ejecutar análisis
- [ ] **Evaluación** — completar señales y guardar evaluación, verificar score
- [ ] **Outreach panel** — verificar que la plantilla no muestra `[Nombre]`
- [ ] **WhatsApp button** — si hay número, verificar que aparece botón verde

---

## PASO 7 — Configurar dominio personalizado (opcional)

*(~10 minutos + propagación DNS de 1-24h)*

En Vercel Dashboard → Project → **Settings** → **Domains**:

1. Clic en **"Add"**
2. Ingresar: `kronos.tu-dominio.com` (o el subdominio que prefieras)
3. Vercel muestra los registros DNS a configurar
4. Ir al panel de DNS del proveedor del dominio
5. Añadir el registro CNAME o A que indica Vercel
6. Esperar propagación (generalmente 5-30 minutos)

---

## Troubleshooting: Build Failures Comunes

### Error: `Cannot find module '@/app/generated/prisma/client'`

**Causa:** `prisma generate` no corrió antes de `next build`.
**Fix:** Verificar que `package.json` tiene `"build": "prisma generate && next build"`. Está ya aplicado.

### Error: `Error: connect ECONNREFUSED` o `P1001: Can't reach database server`

**Causa:** `DATABASE_URL` incorrecta o faltante en Vercel.
**Fix:**
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Verificar que `DATABASE_URL` existe y tiene el valor correcto
3. Confirmar que usa la URL del **Pooler** (puerto 6543), no la directa (5432)
4. Hacer redeploy: Deployments → [último deploy] → Redeploy

### Error: `invalid input syntax for type uuid` u otros errores de DB

**Causa:** La base de datos de producción no tiene las tablas creadas.
**Fix:** Las tablas ya existen en Supabase (fueron creadas durante el desarrollo con Prisma). No requiere acción adicional.

### Build timeout en Vercel

**Causa:** El build tardó más de 45 minutos (límite Hobby).
**Causa probable:** Primera instalación pesada en Hobby plan.
**Fix:** Hacer redeploy — Vercel cachea `node_modules` entre deploys.

### Warning: `5 moderate severity vulnerabilities`

**Causa:** Vulnerabilidades reportadas por `npm audit` en dependencias transitivas.
**Impacto:** Bajo — son vulnerabilidades en herramientas de desarrollo, no en el runtime de producción.
**Acción:** No bloquean el deploy. Resolver por separado con `npm audit fix`.

---

## Estado del proyecto post-deploy

Una vez completado el deploy exitosamente:

| Característica | Estado |
|---------------|--------|
| URL pública accesible | ✅ |
| Base de datos Supabase conectada | ✅ |
| Todas las rutas API funcionando | ✅ |
| Pipeline completo: research → score → outreach | ✅ |
| HTTPS automático (Vercel) | ✅ |
| Deploy automático en cada git push | ✅ |
| **Autenticación de usuarios** | ❌ Fase 4 pendiente |
| **Protección de acceso** | ❌ Cualquier persona con la URL puede ver los datos |

> **Importante:** Hasta completar la Fase 4 (autenticación), la URL de Vercel da acceso completo a todos los datos sin login. Compartir la URL solo con personas de confianza hasta que auth esté implementada.

---

## Próximo paso: Fase 4 — Autenticación

Con Kronos en producción, el siguiente paso según `PHASE_PRIORITY_AUDIT.md`:

**Supabase Auth (2.5 horas de desarrollo)**
- Login con email + contraseña para `alejandro@kronosdata.tech`
- Middleware de protección de rutas
- Página `/login`
- Solo usuarios autenticados pueden acceder al dashboard

Esto convierte la URL pública en una herramienta protegida lista para demos con clientes y onboarding formal.

---

*Checklist generado el 2026-06-11 · Kronos Lead Intelligence*  
*Build local verificado ✅ · Listo para deploy en Vercel*
