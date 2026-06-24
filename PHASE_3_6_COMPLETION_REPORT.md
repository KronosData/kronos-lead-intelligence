# PHASE_3_6_COMPLETION_REPORT.md
**Fecha:** 2026-06-11 · **Commit:** `9aa0177` · **Estado:** ✅ Desplegado

---

## 1. Objetivo

Implementar el **Prospect Discovery Engine** (Fase 3.6): búsqueda automática de empresas prospectas usando HERE Places API como fuente principal y OpenStreetMap Overpass como fuente secundaria/fallback, con pipeline de análisis web, scoring y evaluación automática.

---

## 2. Archivos creados / modificados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `lib/discovery/types.ts` | Nuevo | Tipos `DiscoveryCandidate`, `DiscoverySearchParams`, `ImportedCompanyResult` |
| `lib/discovery/here-adapter.ts` | Nuevo | Adaptador HERE Places: geocodificación + descubrimiento |
| `lib/discovery/osm-adapter.ts` | Nuevo | Adaptador OSM: Nominatim + Overpass API |
| `lib/discovery/normalizer.ts` | Nuevo | Deduplicación Jaccard + detección de empresas existentes en DB |
| `app/api/discovery/route.ts` | Nuevo | `POST /api/discovery` — búsqueda combinada |
| `app/api/discovery/import/route.ts` | Nuevo | `POST /api/discovery/import` — importar empresa individual |
| `app/companies/discover/page.tsx` | Nuevo | UI completa: formulario, tabla, progreso de importación |
| `components/layout/sidebar.tsx` | Modificado | Añadido "Descubrir Empresas" con icono Compass |

---

## 3. Arquitectura técnica

### 3.1 Fuentes de datos

**HERE Places (primaria)**
- Geocodificación: `GET https://geocode.search.hereapi.com/v1/geocode?q=ciudad,país&limit=1&apiKey=KEY`
- Descubrimiento: `GET https://discover.search.hereapi.com/v1/discover?at=lat,lng&q=query&limit=N&apiKey=KEY`
- Filtra solo `resultType === 'place'`
- Normaliza códigos ISO 3166-1 alpha-3 (PER→peru, MEX→mexico, etc.)
- Confianza base: 55% + website(+20) + phone(+10) + position(+10) + street(+5)
- Fallback silencioso si `HERE_API_KEY` no está configurada

**OpenStreetMap (secundaria/fallback)**
- Geocodificación: Nominatim `https://nominatim.openstreetmap.org/search`
- Búsqueda: Overpass API `https://overpass-api.de/api/interpreter`
- Mapeo industria → etiquetas OSM: dental→amenity=dentist, abogado→office=lawyer, etc.
- Name~ regex como fallback cuando no hay etiquetas específicas
- Sin API key — siempre disponible
- Confianza base: 35% + website(+25) + phone(+15) + lat(+10) + street(+10) + city_tag(+5)

### 3.2 Deduplicación (`lib/discovery/normalizer.ts`)

1. **Intra-batch**: algoritmo Jaccard sobre bigramas de 2 caracteres con umbral 0.72
2. **Cross-source**: HERE y OSM se fusionan, HERE tiene prioridad por orden de merge
3. **Detección DB**: `prisma.company.findMany` filtrado por países — compara website (normalizeHost) y nombre (Jaccard)
4. Ordenamiento final por confianza descendente

### 3.3 Pipeline de importación (`POST /api/discovery/import`)

Un request por empresa para garantizar < 60s de tiempo de función Vercel:

```
1. Validación Zod del candidato
2. Dedup guard: findFirst por nombre+país (case-insensitive)
3. analyzeUrl(website) — si hay website
4. researchToSignals(ResearchResult) → SignalFlags
   └─ si no hay website → noWebsiteSignals() (asume debilidades conocidas)
5. computeScores(signals) + generateDiagnosis + matchServices + estimateRevenueOpportunity
6. prisma.$transaction:
   ├─ company.create (leadSource: 'here_discovery' | 'osm_discovery')
   ├─ evaluation.create (evaluatedBy: 'discovery_engine')
   └─ company.update (latestOpportunityScore, latestPriorityLevel, latestEvaluatedAt)
7. Retorna ImportedCompanyResult (status, score, priority, phone, link a ficha)
```

**Nota sobre Zod enums**: `leadSource` y `country` en el import bypass la validación Zod de `CompanyCreateSchema` ya que `here_discovery`/`osm_discovery` no son valores del enum `LeadSource`. El campo `leadSource` en Prisma es `String?` y acepta cualquier valor.

### 3.4 UI (`/companies/discover`)

- Formulario: industria (datalist con INDUSTRY_SUGGESTIONS), ciudad, país (COUNTRIES), límite (10/20/30/50)
- Tabla: checkbox, nombre+industria, contacto (teléfono, web), dirección, confianza, estado, fuente
- Selección: toggle individual + "Seleccionar todas las nuevas"
- Importación: loop cliente — fetch secuencial por empresa, progreso en tiempo real
- Estados por fila: Importando/Importada/Ya existe/Error/Nueva/Sin web
- Post-import: muestra score, prioridad y link a ficha de empresa
- Banner resumen: N importadas / N ya existían / N fallidas + link al dashboard

---

## 4. Seguridad

| Requisito | Estado |
|-----------|--------|
| `HERE_API_KEY` solo en servidor | ✅ No en `NEXT_PUBLIC_*`, no en cliente, no en logs |
| API key no aparece en logs | ✅ `hereGet()` trunca la URL al base path antes de logear HTTP errors |
| No outreach automático | ✅ Solo crear empresa + evaluación, ningún envío de mensajes |
| No modificar login | ✅ Ningún cambio a auth flow |
| No modificar scoring engines | ✅ Solo se reutilizan (`computeScores`, `generateDiagnosis`, `matchServices`, `estimateRevenueOpportunity`) |
| `DATABASE_URL` no hardcodeado | ✅ Solo en `.env`, nunca en código fuente |

---

## 5. Comportamiento sin HERE_API_KEY

Si `HERE_API_KEY` no está configurada en Vercel:
- `hereAvailable()` retorna `false`
- `searchHere()` retorna `[]` inmediatamente sin hacer ningún request
- OSM funciona normalmente (sin API key)
- La UI muestra "HERE: no disponible (sin API key)" en la info de fuentes
- Los resultados son solo de OSM con confianza base más baja

---

## 6. TypeScript y Build

```
$ npx tsc --noEmit
(sin output) — exit 0 — 0 errores

$ npm run build
✓ Compiled successfully in 3.2s
✓ TypeScript: 0 errores
✓ 17 rutas generadas

Route (app)
├ ƒ /api/discovery           POST — search
├ ƒ /api/discovery/import    POST — single import
├ ○ /companies/discover      UI — discovery page
```

---

## 7. Commit y deployment

```
Commit:  9aa0177
Branch:  master
Push:    6cb05e6..9aa0177  master → master

Archivos:  8 (7 nuevos, 1 modificado)
Líneas:    +1426 / -1
```

Vercel auto-deploy desde push a master. El deployment aparece en el Vercel Dashboard en ~60 segundos.

---

## 8. Próximos pasos requeridos

### 8.1 Configurar HERE_API_KEY (recomendado, no bloqueante)

Sin esta clave, el sistema funciona solo con OSM pero los resultados son más limitados.

**Cómo obtenerla:**
1. Ve a [developer.here.com](https://developer.here.com) — cuenta gratuita
2. Crea un proyecto → API Keys → Generate API Key
3. En Vercel: Settings → Environment Variables → New Variable:
   - Key: `HERE_API_KEY`
   - Value: la clave generada
   - Environments: Production + Preview + Development
4. Re-deploy (o esperar al siguiente push)

**Límites del plan gratuito HERE:**
- 250,000 requests geocoding/mes
- 250,000 requests discover/mes
- Más que suficiente para uso interno

### 8.2 Eliminar logs diagnósticos del login

Pendiente desde commit `bb231c3`. Una vez confirmado que el login funciona en producción:
- `proxy.ts` — eliminar `console.log` de path/token/session
- `app/api/auth/login/route.ts` — eliminar `console.log` de login success

Commit: `chore(auth): remove diagnostic logs after login fix verified`

---

## 9. Tests funcionales definidos

| # | Prueba | Esperado |
|---|--------|----------|
| 1 | GET `/companies/discover` autenticado | Renderiza formulario correctamente |
| 2 | Buscar "dental" en Lima, Peru | Devuelve candidatos de OSM + HERE (si hay key) |
| 3 | Candidato con website | Confianza ≥ 75%, badge "Nueva" |
| 4 | Candidato ya en DB | Badge "Ya existe", checkbox deshabilitado |
| 5 | Importar 1 empresa con web | Score 0-100, prioridad, link a ficha |
| 6 | Importar empresa sin web | Score bajo, `signalWeakOnlinePresence=true` |
| 7 | Importar duplicado (nombre similar) | Status "duplicate", no crea registro |
| 8 | HERE_API_KEY ausente | OSM funciona, UI muestra aviso |
| 9 | Buscar sin HERE key | Solo resultados OSM, sin error |
| 10 | Límite de resultados | Retorna exactamente N candidatos únicos |

---

## 10. Limitaciones conocidas

1. **OSM coverage**: Overpass tiene mejor cobertura en Europa que en Latinoamérica. Para mercados LATAM, HERE ofrece mayor densidad de datos.
2. **Páginas SPA**: `analyzeUrl` puede tener análisis parcial en sites React/Vue con renderizado client-side. El import sigue funcionando pero con menos señales detectadas.
3. **Bounding box OSM**: Ciudades muy grandes (CDMX, Buenos Aires) pueden retornar menos resultados ya que el bbox puede ser muy amplio para el límite de Overpass.
4. **Rate limiting OSM**: Nominatim tiene límite de 1 req/segundo. No aplicable para búsquedas manuales pero relevante si se usan múltiples búsquedas en ráfaga.

---

*Reporte generado el 2026-06-11 · Kronos Lead Intelligence*
*Commit: 9aa0177 · TypeScript: exit 0 · Build: ✅ · 8 archivos · 1426 líneas*
