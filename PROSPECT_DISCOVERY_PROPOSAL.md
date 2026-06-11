# PROSPECT_DISCOVERY_PROPOSAL.md
# Fase 3.6 — Prospect Discovery Engine
**Kronos Lead Intelligence · Propuesta Técnica y Comercial**
**Fecha:** 2026-06-11 · **Estado:** En análisis — no implementar

---

## Resumen Ejecutivo

El Prospect Discovery Engine permitirá que Kronos encuentre empresas automáticamente a partir de una búsqueda por industria y ciudad, las enriquezca con Phase 3.5 (Research Assistant), las evalúe con el motor de scoring existente, y las agregue al pipeline listas para outreach — **sin intervención humana en el proceso de descubrimiento**.

Reducción proyectada: de **5–8 minutos/empresa** a **~30 segundos/empresa** en el paso de descubrimiento + carga.

---

## 1. Fuentes Públicas Disponibles

### Evaluación de todas las opciones relevantes

| Fuente | API | Free Tier | Cobertura LATAM | Datos clave | Recomendación |
|--------|-----|-----------|----------------|-------------|--------------|
| **HERE Places Discover** | ✅ Oficial | 250,000 req/mes | Alta (LATAM incluido) | Nombre, dir, tel, web, categoría | ✅ PRIMARIA |
| **OpenStreetMap (Overpass)** | ✅ Oficial | Ilimitado (throttling) | Media–Alta | Nombre, tel, web, horario | ✅ SECUNDARIA |
| **TomTom Places** | ✅ Oficial | 2,500 req/día | Alta | Nombre, dir, tel, web | ⚠️ Límite bajo |
| **Yelp Fusion** | ✅ Oficial | 5,000 req/día | Baja en LATAM | Nombre, tel, categoría, rating | ❌ Mala cobertura |
| **Foursquare Places** | ✅ Oficial | 10K/mes (expira jun-26) | Media | Nombre, dirección, categoría | ❌ Inestable |
| **Google Places API** | ✅ Oficial | $0.17–0.40/req | Excelente | Todo | ❌ Costo prohibitivo |
| **Páginas Amarillas** | ❌ HTML only | $0 | Media (varies) | Nombre, tel, dirección | ⚠️ Frágil |
| **SUNAT/RUC (Perú)** | ❌ Indirecto | Pagado ($) | Solo Perú | Razón social, RUC | ❌ No viable gratis |
| **LinkedIn** | ❌ Restringida | N/A | Alta | Nombre, industria | ❌ Bloqueado |
| **Google Maps scraping** | ❌ Ninguna | $0 | Excelente | Todo | ❌ IP ban seguro |
| **Instagram scraping** | ❌ Ninguna | $0 | Alta | Handle, posts | ❌ Bloqueado |

### Fuentes seleccionadas y justificación

**HERE Places Discover API — Fuente Primaria**
- Free tier: **250,000 transacciones/mes** (~8,333/día) — más que suficiente para prospección intensiva
- Requiere: API key gratuita (registro sin tarjeta de crédito)
- Endpoint clave: `GET https://discover.search.hereapi.com/v1/discover`
- Parámetros: `q=clínica dental`, `at=lat,lon` (coordenadas de la ciudad), `limit=20`, `categories`
- Devuelve: nombre, dirección, teléfono, URL del sitio web, categoría, coordenadas
- Costo si supera free tier: $1/1,000 transacciones

**OpenStreetMap Overpass API — Fuente Secundaria / Fallback**
- Free tier: **ilimitado** (throttling suave, no hay límite fijo)
- Sin API key — acceso directo
- Endpoint: `https://overpass-api.de/api/interpreter`
- Query: busca `amenity`, `shop`, `office` por nombre/tipo en área geográfica
- Devuelve: nombre, teléfono, web, email, dirección, coordenadas
- Calidad: muy buena en capitales y ciudades grandes de LATAM; irregular en ciudades medianas
- Cobertura: lo que la comunidad de OSM ha registrado — típicamente bien cubierto en Lima, Bogotá, CDMX, Buenos Aires, Santiago

**Por qué no Google Places:**
A $0.17–$0.40 por request, 1,000 búsquedas costarían $170–$400. No es viable para uso intensivo.

**Por qué no Páginas Amarillas (scraping):**
El HTML de estos sitios es parseable pero cada país tiene una estructura diferente, cualquier rediseño del sitio rompe el parser, y el throttling IP puede cortar el acceso. Viable como opción opcional, pero no como fuente primaria.

---

## 2. Datos Extraíbles Automáticamente

### Desde la fuente de descubrimiento (HERE / OSM)

| Campo | Automático | Confianza | Fuente |
|-------|-----------|-----------|--------|
| Nombre del negocio | ✅ Siempre | Alta | HERE / OSM |
| Dirección | ✅ Siempre | Alta | HERE / OSM |
| Ciudad | ✅ Siempre | Alta | HERE / OSM |
| País | ✅ Siempre | Alta | Inferido del search |
| Teléfono | ✅ ~70% | Alta | HERE / OSM |
| Sitio web URL | ✅ ~55% | Alta | HERE / OSM |
| Industria / Categoría | ✅ Siempre | Media | HERE categories / OSM tags |
| Google Business URL | ✅ ~60% | Alta | HERE (some POIs link to GBP) |

**Nota crítica:** Solo ~55% de los negocios LATAM en HERE tienen URL de sitio web. Para el 45% restante, el Research Assistant no puede ejecutarse.

### Desde Research Assistant (Phase 3.5 — ya construido)

Se ejecuta automáticamente si existe URL del sitio web:

| Campo | Automático | Confianza |
|-------|-----------|-----------|
| WhatsApp number | ✅ ~65% de sitios | Alta |
| Instagram URL | ✅ ~50% de sitios | Alta |
| LinkedIn URL | ✅ ~30% de sitios | Alta |
| Señal: tiene sitio web activo | ✅ 100% | Alta |
| Señal: tiene WhatsApp visible | ✅ 100% | Alta |
| Señal: tiene formulario de contacto | ✅ 100% | Alta/Media |
| Señal: tiene sistema de reservas | ✅ 100% | Alta/Media |
| Señal: tiene Instagram activo | ✅ 100% | Alta |
| Señal: tiene LinkedIn | ✅ 100% | Alta |
| Señal: tiene Google Business (embed) | ✅ 100% | Alta/Media* |
| Señal: tiene CTA claro | ✅ 100% | Media |
| Señal: captura de leads | ✅ 100% | Alta/Media |
| Señal: presencia online débil | ✅ 100% | Inferida |

### Señales que siguen siendo manuales (siempre)
- Tiene reseñas en Google → requiere Google Places API
- Tiene reseñas sin responder → requiere verificación manual
- Respuesta lenta → requiere interacción real
- Seguimiento débil → requiere interacción real
- Trabajo manual repetitivo → requiere conocimiento interno

### Resumen de cobertura de datos

| Empresa con web | Empresa sin web |
|----------------|----------------|
| 10–13 campos auto | 4–5 campos auto |
| 10 señales auto | 1 señal auto (has_website=false) |
| 5 señales manuales | 14 señales manuales |

---

## 3. Porcentaje de Automatización del Flujo

### Flujo actual (sin Discovery Engine)

```
Vendedor busca en Google Maps            → 100% MANUAL   (5–8 min)
Copia URL de la empresa                  → manual
Pega en Research Assistant               → Phase 3.5
Rellena: industria, país, ciudad         → 80% MANUAL
Submit → evaluación → score              → 100% AUTO
Review resultado → outreach              → semi-auto
TOTAL tiempo por empresa: 3–6 minutos
```

### Flujo con Discovery Engine

```
Vendedor ingresa: "clínicas dentales" + "Lima, Perú"    → 30 segundos
Sistema busca en HERE → lista de 20 empresas            → 100% AUTO
Sistema corre Research Assistant por cada URL           → 100% AUTO
Sistema evalúa cada empresa con scoring engine          → 100% AUTO
Vendedor revisa lista ordenada por score                → 2 min para 20 empresas
Vendedor selecciona cuáles importar                     → minimal (checkboxes)
Empresas aparecen en dashboard listas para outreach     → 100% AUTO
TOTAL tiempo por batch de 20 empresas: ~4 minutos
= ~12 segundos/empresa vs 3–6 minutos/empresa ACTUAL
```

### Desglose por etapa

| Etapa | Estado actual | Con Discovery | Mejora |
|-------|--------------|---------------|--------|
| Descubrimiento de empresas | 100% manual | 100% automático | **5 min → 0** |
| Extracción de datos básicos | 100% manual | 90% automático | **2 min → 0** |
| Detección de señales digitales | ~35% auto (Phase 3.5) | ~70% auto | **2× más rápido** |
| Evaluación + scoring | 100% automático | 100% automático | Sin cambio |
| Generación de plantilla | 100% automático | 100% automático | Sin cambio |
| Envío de outreach | ~80% manual (wa.me) | ~80% manual | Sin cambio |
| **TOTAL DEL FLUJO** | **~35% automatizado** | **~85% automatizado** | **2.4× mejora** |

---

## 4. Diseño del Prospect Discovery Engine

### Flujo técnico completo

```
[Usuario]
    │
    ├── Ingresa: query + city + country + industry + max_results
    │
[POST /api/discovery]
    │
    ├── Adapter HERE Places Discover
    │   → GET https://discover.search.hereapi.com/v1/discover
    │   → q={query}, at={city_coords}, limit={max}
    │   → Returns: name, address, phone, website, category
    │
    ├── Adapter OSM Overpass (si HERE da < 5 resultados)
    │   → POST https://overpass-api.de/api/interpreter
    │   → Returns: name, phone, website, tags
    │
    ├── Normalizar + deduplicar resultados
    │   → merge by name+city
    │   → filter: already exists in DB?
    │
    └── Returns: ProspectCandidate[]
    
[Usuario revisa lista en /companies/discover]
    │
    ├── Ve: nombre, web, teléfono, ciudad, categoría de fuente
    ├── Selecciona con checkboxes cuáles importar
    └── Clic "Importar seleccionadas"
    │
[POST /api/discovery/import]
    │
    ├── Para cada ProspectCandidate seleccionado:
    │   │
    │   ├── 1. createCompany (POST /api/companies)
    │   │      → name, industry, country, city, website, phone
    │   │
    │   ├── 2. analyzeUrl (si tiene website)
    │   │      → Research Assistant — enriquece WhatsApp, IG, señales
    │   │      → update company con datos encontrados
    │   │
    │   └── 3. evaluateCompany (POST /api/companies/{id}/evaluate)
    │          → scoring engine → diagnosis → revenue → services
    │
    ├── Progress streaming (done/total)
    └── Returns: { imported, failed, errors }
    
[Dashboard]
    └── Empresas nuevas aparecen ordenadas por score
        → listas para outreach inmediato
```

### Esquema de tipos nuevos

```typescript
// lib/discovery.ts

export interface DiscoveryQuery {
  query: string          // "clínicas dentales"
  city: string           // "Lima"
  country: Country       // "peru"
  industry: string       // "Dental / Odontología"
  maxResults: number     // 1–50
  source?: 'here' | 'osm' | 'auto'  // default: 'auto'
}

export interface ProspectCandidate {
  externalId: string        // ID de la fuente (evita duplicados)
  source: 'here' | 'osm'
  name: string
  website: string | null
  phone: string | null
  address: string | null
  city: string
  country: Country
  category: string          // categoría de la fuente
  lat?: number
  lon?: number
  alreadyInDB: boolean      // true si ya existe en Kronos
}

export interface DiscoveryResult {
  query: DiscoveryQuery
  candidates: ProspectCandidate[]
  total: number
  source: string
  errors: string[]
}

export interface ImportJob {
  total: number
  done: number
  failed: number
  errors: string[]
  companyIds: string[]     // IDs creados en esta sesión
}
```

### Nuevos endpoints API (2)

```
POST /api/discovery
  Body: DiscoveryQuery
  Response: DiscoveryResult

POST /api/discovery/import
  Body: { candidates: ProspectCandidate[], industry: string }
  Response: ImportJob (streaming opcional)
```

### Nueva página frontend (1)

```
/companies/discover
  ├── Panel izquierdo: formulario de búsqueda
  │   ├── Campo: Búsqueda (e.g., "clínicas dentales")
  │   ├── Select: País
  │   ├── Input: Ciudad
  │   ├── Select: Industria (pre-rellena el campo del formulario)
  │   └── Slider: máximo de resultados (5–50)
  │
  ├── Panel derecho: lista de resultados
  │   ├── Badge fuente (HERE / OSM)
  │   ├── Badge "Ya en Kronos" si alreadyInDB
  │   ├── Checkbox de selección
  │   ├── Nombre, ciudad, web (link), teléfono
  │   └── Categoría de la fuente
  │
  ├── Barra inferior:
  │   ├── "{N} seleccionadas"
  │   ├── Toggle: "Analizar sitios web automáticamente"
  │   └── Botón: "Importar y evaluar seleccionadas"
  │
  └── Panel de progreso (durante importación):
      ├── Barra de progreso
      ├── "Creando empresa N/M..."
      ├── "Analizando website de {nombre}..."
      └── "Score: {score} — {priority}" (en tiempo real)
```

### Adapter HERE Places — Pseudocódigo

```typescript
// lib/discovery.ts

async function searchHERE(query: DiscoveryQuery): Promise<ProspectCandidate[]> {
  const coords = await geocodeCity(query.city, query.country)
  // HERE Geocoding API → lat/lon de la ciudad

  const url = new URL('https://discover.search.hereapi.com/v1/discover')
  url.searchParams.set('q', query.query)
  url.searchParams.set('at', `${coords.lat},${coords.lon}`)
  url.searchParams.set('limit', String(Math.min(query.maxResults, 100)))
  url.searchParams.set('apiKey', process.env.HERE_API_KEY!)

  const res = await fetch(url.toString())
  const data = await res.json()

  return data.items.map((item: HEREItem) => ({
    externalId: `here_${item.id}`,
    source: 'here',
    name: item.title,
    website: item.contacts?.[0]?.www?.[0]?.value ?? null,
    phone: item.contacts?.[0]?.phone?.[0]?.value ?? null,
    address: item.address?.label ?? null,
    city: item.address?.city ?? query.city,
    country: query.country,
    category: item.categories?.[0]?.name ?? query.industry,
    lat: item.position?.lat,
    lon: item.position?.lng,
    alreadyInDB: false,
  }))
}
```

### Adapter OSM Overpass — Pseudocódigo

```typescript
async function searchOSM(query: DiscoveryQuery): Promise<ProspectCandidate[]> {
  const coords = await geocodeCity(query.city, query.country)
  const radius = 10000 // 10km

  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["name"~"${query.query}",i](around:${radius},${coords.lat},${coords.lon});
      way["name"~"${query.query}",i](around:${radius},${coords.lat},${coords.lon});
    );
    out body;
  `

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(overpassQuery)}`,
  })
  const data = await res.json()

  return data.elements.map((el: OSMElement) => ({
    externalId: `osm_${el.type}_${el.id}`,
    source: 'osm',
    name: el.tags?.name ?? '',
    website: el.tags?.website ?? el.tags?.url ?? null,
    phone: el.tags?.phone ?? el.tags?.['contact:phone'] ?? null,
    address: buildAddress(el.tags),
    city: query.city,
    country: query.country,
    category: el.tags?.amenity ?? el.tags?.shop ?? el.tags?.office ?? query.industry,
    alreadyInDB: false,
  }))
}
```

### Detección de duplicados

```typescript
async function markExistingCompanies(
  candidates: ProspectCandidate[]
): Promise<ProspectCandidate[]> {
  const names = candidates.map(c => c.name.toLowerCase())
  const existing = await prisma.company.findMany({
    where: {
      name: { in: names, mode: 'insensitive' },
    },
    select: { name: true },
  })
  const existingNames = new Set(existing.map(e => e.name.toLowerCase()))
  return candidates.map(c => ({
    ...c,
    alreadyInDB: existingNames.has(c.name.toLowerCase()),
  }))
}
```

---

## 5. Estimación

### Horas de desarrollo

| Tarea | Horas |
|-------|-------|
| `lib/discovery.ts` — adapters HERE + OSM + geocoding + dedup | 4h |
| `app/api/discovery/route.ts` — endpoint de búsqueda | 1h |
| `app/api/discovery/import/route.ts` — batch import + progress | 3h |
| `app/companies/discover/page.tsx` — UI completa | 5h |
| Integración con `analyzeUrl` (Phase 3.5) | 1h |
| Integración con `evaluateCompany` (motor existente) | 0.5h |
| Variables de entorno + configuración HERE API key | 0.5h |
| Sidebar: agregar link a /companies/discover | 0.5h |
| TypeScript + testing + edge cases | 2h |
| Reporte de completación | 1h |
| **Total estimado** | **~18.5 horas** |

### Complejidad

| Dimensión | Nivel | Razón |
|-----------|-------|-------|
| Backend | Media | Dos adapters externos + batch async |
| Frontend | Media-Alta | UI más compleja (búsqueda + lista + progreso) |
| Integración | Baja | Reutiliza Phase 3.5 + engines existentes |
| Testing | Media | Depende de APIs externas — mocking necesario |
| **General** | **Media** | Más compleja que Phase 3.5, menos que Phase 4 |

### Dependencias externas

| Dependencia | Tipo | Requerimiento |
|-------------|------|--------------|
| HERE Geocoding API | API externa gratuita | API key (registro gratis, sin tarjeta) |
| HERE Places Discover API | API externa gratuita | Mismo API key |
| OpenStreetMap Overpass API | API externa gratuita | Sin API key |
| `here-api-key` env var | Variable de entorno | Añadir a `.env` |
| Sin nuevas dependencias npm | — | Fetch nativo, ya disponible |

**Nuevas variables de entorno requeridas:**
```
HERE_API_KEY=tu_api_key_aqui
```

No se requieren nuevas tablas ni migraciones de base de datos.

### Costos mensuales

| Componente | Costo |
|-----------|-------|
| HERE Places Discover API | **$0** (250K req/mes gratis) |
| HERE Geocoding API | **$0** (incluido en free tier) |
| OpenStreetMap Overpass | **$0** (ilimitado) |
| **Total mensual** | **$0** |

**Cuándo se pagaría:**
- Solo si se superan **250,000 búsquedas/mes** en HERE (equivale a buscar batchs de 20 empresas 12,500 veces al mes — irreal para un solo vendedor)
- En ese caso: $1 por cada 1,000 requests adicionales

---

## 6. Limitaciones y Riesgos

### Limitaciones inherentes al stack gratuito

| Limitación | Impacto | Severidad |
|-----------|---------|-----------|
| Solo ~55% de negocios LATAM en HERE tienen URL de web | Research Assistant no se ejecuta para el 45% restante — menos señales auto | Media |
| Cobertura OSM irregular en ciudades pequeñas | Menos resultados en Trujillo, Barranquilla, Arequipa vs. Lima/CDMX | Baja–Media |
| HERE puede devolver negocios cerrados o desactualizados | Empresa en la lista que ya no existe | Baja |
| Número de teléfono ≠ WhatsApp garantizado | El número de HERE puede ser fijo, no WA | Baja |
| No hay acceso a reseñas de Google (sin Places API de pago) | Las 5 señales manuales siguen siendo manuales | Sin cambio |

### Riesgos técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| HERE API key inválida o expirada | Baja | Alto | Fallback automático a OSM |
| OSM devuelve datos desactualizados | Media | Bajo | Solo fuente secundaria |
| Batch import falla a mitad (timeout) | Media | Medio | Retry individual por empresa, no abortar todo |
| Sitio de prospecto bloquea el Research Assistant (403) | Alta (15-20%) | Bajo | Ya manejado — degrada a modo manual |
| Empresa importada es duplicado con nombre diferente | Media | Bajo | Dedup por website URL además de nombre |

### Lo que NO cambia

- Las 5 señales manuales siguen siendo manuales (sin Google Places API)
- El outreach sigue siendo manual (intencional — el vendedor personaliza y envía)
- No hay envío automatizado de mensajes

---

## Comparativa de Impacto Comercial

| Métrica | Hoy (Phase 3.5) | Con Phase 3.6 | Mejora |
|---------|----------------|---------------|--------|
| Tiempo para cargar 50 empresas | ~2.9 horas | ~25–35 minutos | **5–7× más rápido** |
| Tiempo por empresa (discovery + carga) | 3–5 min | ~30 seg | **6–10× más rápido** |
| Intervención manual para encontrar leads | Alta (Google Maps manual) | Mínima (revisar lista) | **90% reducción** |
| Empresas prospectadas por hora | ~15–20 | ~80–100 | **5× más** |
| Costo adicional mensual | $0 | $0 | Sin cambio |

---

## Recomendación

**Implementar Phase 3.6 como la siguiente prioridad después de validar el sistema actual en producción real.**

La razón: Phase 3.6 es un multiplicador directo del valor ya construido en Phases 3, 3.1 y 3.5. Reutiliza todos los engines existentes (scoring, diagnosis, research assistant) y solo añade la capa de descubrimiento externo. La inversión de ~18.5 horas produce un impacto desproporcionado: pasar de "el vendedor busca empresas manualmente" a "el vendedor aprueba una lista ya evaluada".

**Prerequisito antes de implementar:**
Prospectar al menos 20–30 empresas reales manualmente con el sistema actual para:
1. Validar que el scoring y las plantillas generan respuestas reales
2. Identificar si hay ajustes en el motor de evaluación antes de escalar
3. Confirmar que el flujo de outreach funciona en condiciones reales

---

## Archivos que se crearían

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `lib/discovery.ts` | Nuevo | Adapters HERE + OSM, geocoding, dedup |
| `app/api/discovery/route.ts` | Nuevo | POST /api/discovery |
| `app/api/discovery/import/route.ts` | Nuevo | POST /api/discovery/import |
| `app/companies/discover/page.tsx` | Nuevo | UI de búsqueda + resultados + importación |
| `lib/api-client.ts` | Modificado | +tipos y funciones de discovery |
| `components/layout/sidebar.tsx` | Modificado | +link a /companies/discover |
| `.env.example` | Modificado | +HERE_API_KEY |

**Archivos NO modificados:** toda la arquitectura principal — schemas, prisma, engines de negocio, API routes existentes.

---

*Propuesta generada el 2026-06-11 · Kronos Lead Intelligence*  
*Estado: pendiente de aprobación · No implementar hasta confirmación explícita*
