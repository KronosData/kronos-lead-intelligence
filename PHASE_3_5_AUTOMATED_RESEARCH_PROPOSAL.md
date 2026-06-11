# PHASE_3_5_AUTOMATED_RESEARCH_PROPOSAL.md
# Fase 3.5 — Prospect Research Assistant
**Kronos Lead Intelligence · Propuesta Estratégica**
**Fecha:** 2026-06-11  
**Estado:** Propuesta — pendiente de aprobación

---

## Problema a Resolver

El cuello de botella actual en la operación comercial es el tiempo de investigación manual por empresa. Según la Auditoría Comercial del MVP (2026-06-11), cada prospecto requiere **5–8 minutos** de investigación antes de poder cargarlo en Kronos:

- Abrir el sitio web del prospecto
- Buscar en Google Maps para verificar Google Business
- Revisar Instagram, LinkedIn
- Verificar si tiene formularios, WhatsApp, CTA, sistema de reservas
- Llenar manualmente los 15 campos del checklist

**Objetivo de esta fase:** reducir ese tiempo a **menos de 2 minutos por empresa**, sin perder la calidad del scoring.

---

## Propuesta: Prospect Research Assistant

Un módulo integrado en el formulario de creación (`/companies/new`) que, dada una URL, analiza automáticamente el sitio web del prospecto, pre-llena hasta **10 de 15 señales**, y extrae los datos de presencia digital (WhatsApp, Instagram, LinkedIn, etc.) directamente al formulario.

El vendedor deja de investigar. Solo **confirma o corrige** lo que el sistema encontró.

---

## Flujo Propuesto

```
1. Vendedor pega URL del prospecto
          ↓
2. Clic en "Analizar sitio"
          ↓
3. Servidor Next.js hace fetch server-side (sin CORS)
          ↓
4. HTML parseado: extracción de señales + datos de contacto
          ↓
5. Formulario pre-completado aparece en ~2-3 segundos
          ↓
6. Vendedor revisa los 4-5 campos manuales (30 segundos)
          ↓
7. Clic en "Crear y Evaluar" → score automático
```

### Experiencia de Usuario (mockup conceptual)

```
┌─────────────────────────────────────────────────────────────────┐
│  Nueva Empresa                                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🔍  Analizar sitio web del prospecto                   │    │
│  │                                                          │    │
│  │  URL:  [ https://clinicadental.com.pe          ] [→]    │    │
│  │                                                          │    │
│  │  ✅ 9 señales detectadas · ⚠️ 5 requieren confirmación  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Información de la Empresa (pre-llenada)                        │
│  Nombre:       Clínica Dental Lima Centro           [auto]      │
│  WhatsApp:     +51 987 654 321                      [auto]      │
│  Instagram:    @clinicadentallima                   [auto]      │
│  LinkedIn:     —                                    [vacío]     │
│                                                                  │
│  Checklist de Señales                                           │
│  ✅ Tiene sitio web activo              [detectado automáticamente]│
│  ✅ Tiene WhatsApp visible              [detectado automáticamente]│
│  ✅ Tiene Instagram activo              [detectado automáticamente]│
│  ✅ Tiene formulario de contacto        [detectado automáticamente]│
│  ⚠️  Tiene sistema de reservas          [confirmar manualmente]   │
│  ⚠️  Tiene reseñas sin responder        [confirmar manualmente]   │
│  ⚠️  Señales de respuesta lenta         [confirmar manualmente]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquitectura Propuesta

### Nuevo endpoint

```
POST /api/research
```

**Input:**
```json
{
  "url": "https://clinicadental.com.pe",
  "businessName": "Clínica Dental Lima Centro"  // opcional
}
```

**Output:**
```json
{
  "success": true,
  "fetchedUrl": "https://clinicadental.com.pe",
  "httpStatus": 200,
  "detectedName": "Clínica Dental Lima Centro",
  "detectedPhone": "+51987654321",
  "detectedWhatsapp": "+51987654321",
  "detectedInstagram": "https://instagram.com/clinicadentallima",
  "detectedLinkedin": null,
  "signals": {
    "signalHasWebsite":        { "value": true,  "confidence": "high",   "source": "http_200" },
    "signalHasWhatsapp":       { "value": true,  "confidence": "high",   "source": "wa.me_link" },
    "signalHasContactForm":    { "value": true,  "confidence": "medium", "source": "form_email_input" },
    "signalHasBookingSystem":  { "value": false, "confidence": "medium", "source": "no_booking_keyword" },
    "signalHasInstagram":      { "value": true,  "confidence": "high",   "source": "instagram_link" },
    "signalHasLinkedin":       { "value": false, "confidence": "high",   "source": "no_linkedin_link" },
    "signalHasGoogleBusiness": { "value": true,  "confidence": "low",    "source": "maps_embed" },
    "signalHasClearCta":       { "value": true,  "confidence": "medium", "source": "cta_button_text" },
    "signalHasLeadCapture":    { "value": false, "confidence": "medium", "source": "no_lead_form" },
    "signalWeakOnlinePresence":{ "value": false, "confidence": "high",   "source": "inferred_3_channels" },
    "signalHasReviews":        { "value": null,  "confidence": "none",   "source": "requires_manual" },
    "signalHasUnansweredReviews": { "value": null, "confidence": "none", "source": "requires_manual" },
    "signalSlowResponse":      { "value": null,  "confidence": "none",   "source": "requires_manual" },
    "signalWeakFollowup":      { "value": null,  "confidence": "none",   "source": "requires_manual" },
    "signalManualWork":        { "value": null,  "confidence": "none",   "source": "requires_manual" }
  },
  "autoFilledCount": 10,
  "manualRequiredCount": 5,
  "warnings": []
}
```

### Árbol de archivos nuevos/modificados

```
app/
├── api/
│   └── research/
│       └── route.ts          ← NUEVO: POST /api/research
├── companies/
│   └── new/
│       └── page.tsx          ← MODIFICADO: añadir sección "Analizar URL"
lib/
└── web-analyzer.ts           ← NUEVO: lógica de parsing HTML
```

### Lógica del analizador (`lib/web-analyzer.ts`)

El analizador opera en 4 pasos:

**Paso 1 — Fetch server-side**
```
fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Kronos/1.0)' },
  signal: AbortSignal.timeout(8000),
  redirect: 'follow'
})
```
- Timeout: 8 segundos
- Sigue redirecciones (http→https, www→non-www)
- User-Agent: navegador real para evitar bloqueos básicos

**Paso 2 — Normalización del HTML**
- Convierte a minúsculas para matching case-insensitive
- Extrae atributos `href` de todos los `<a>`
- Extrae texto de `<button>`, `<a>`, `<h1>`, `<h2>`, `<meta>`

**Paso 3 — Detección de señales** (reglas puras, sin deps externas)

| Señal | Regla de detección |
|-------|-------------------|
| `signalHasWebsite` | HTTP status 200 |
| `signalHasWhatsapp` | Link contiene `wa.me/` ó `api.whatsapp.com` ó `web.whatsapp.com/send` |
| `signalHasInstagram` | Link contiene `instagram.com/` (excluye `instagram.com/p/` que son posts embeds) |
| `signalHasLinkedin` | Link contiene `linkedin.com/company/` ó `linkedin.com/in/` |
| `signalHasContactForm` | Existe `<form>` con `input[type=email]` ó `input[type=tel]`; ó keywords: "formulario", "contáctanos", "enviar mensaje" |
| `signalHasBookingSystem` | Keywords: "reservar", "agendar", "agendar cita", "pedir cita", "book", "schedule"; ó dominios embeds: calendly.com, simplybook.me, acuityscheduling.com |
| `signalHasClearCta` | `<button>` ó `<a class="btn">` con texto: "llamar", "whatsapp", "reservar", "cotizar", "contactar", "llamanos" |
| `signalHasLeadCapture` | `<form>` con `input[type=email]` + texto cerca: "newsletter", "descarga", "guía gratuita", "registro", "suscríbete" |
| `signalHasGoogleBusiness` | Link ó iframe contiene `maps.google.com` ó `google.com/maps` ó `business.google.com` |
| `signalWeakOnlinePresence` | Inferido: si `signalHasInstagram=false AND signalHasLinkedin=false AND signalHasWebsite=true pero sin redes` → true |

**Paso 4 — Extracción de datos de contacto**
- Teléfono: regex `\+?[1-9]\d{8,14}` cerca de keywords "tel", "celular", "whatsapp"
- WhatsApp número: extraído del link `wa.me/{número}`
- Email: regex `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- Nombre del negocio: `<title>` o `<meta property="og:title">`

---

## Estimación de Señales Detectables

| Categoría | Señales | Auto | Manual |
|-----------|---------|------|--------|
| Presencia digital | `hasWebsite`, `hasInstagram`, `hasLinkedin` | 3/3 | 0/3 |
| Canales de contacto | `hasWhatsapp`, `hasContactForm` | 2/2 | 0/2 |
| Conversión | `hasClearCta`, `hasLeadCapture` | 2/2 | 0/2 |
| Automatización | `hasBookingSystem` | 1/1 | 0/1 |
| Reputación Google | `hasGoogleBusiness`, `hasReviews`, `hasUnansweredReviews` | 1*/3 | 2/3 |
| Comportamiento | `slowResponse`, `weakFollowup`, `manualWork` | 0/3 | 3/3 |
| Inferida | `weakOnlinePresence` | 1/1 | 0/1 |
| **TOTAL** | **15** | **10** | **5** |

*`hasGoogleBusiness` con confianza baja (60%) en modo básico sin Google Places API.

---

## Opciones de Implementación

### Opción 1 — Básica: HTML Parsing puro (Recomendada)

**Descripción:** Solo fetch + parsing de HTML. Sin APIs externas.

| Dimensión | Valor |
|-----------|-------|
| Señales automatizadas | 10/15 (67%) |
| Confianza promedio | 78% |
| Tiempo de análisis | 1–3 segundos |
| Dependencias nuevas | Ninguna (solo `node` nativo) |
| Costo mensual | $0 |
| Tiempo de desarrollo | **6–7 horas** |
| Riesgo técnico | Bajo |
| Funciona en Vercel | Sí (Edge-compatible con timeout) |

**Limitación principal:** Sitios SPA (React/Vue/Angular) devuelven HTML vacío — el contenido se renderiza con JavaScript. Para los prospectos objetivo de Kronos (pequeños negocios LATAM con WordPress/Wix/Squarespace), esto afecta a ~15–20% de los casos.

---

### Opción 2 — Mejorada: HTML Parsing + Google Places API

**Descripción:** Opción 1 + llamada a Google Places API para detectar Google Business, rating, y conteo de reseñas.

| Dimensión | Valor |
|-----------|-------|
| Señales automatizadas | 12/15 (80%) |
| Confianza promedio | 85% |
| Tiempo de análisis | 2–5 segundos |
| Dependencias nuevas | Google Maps JavaScript API Key |
| Costo mensual | ~$8–25/mes para 500–1,500 prospectos/mes |
| Tiempo de desarrollo | **8–10 horas** (+2h sobre Opción 1) |
| Riesgo técnico | Bajo-Medio |

**Desglose de costos Google Places API:**
- Find Place API: $0.017/request
- 500 prospectos/mes = ~$8.50/mes
- 1,500 prospectos/mes = ~$25/mes

Agrega `signalHasGoogleBusiness` (95% confianza) y `signalHasReviews` (90% confianza).

---

### Opción 3 — Premium: HTML Parsing + Claude API (Vision)

**Descripción:** Envía el HTML + screenshot de la página a Claude Haiku para análisis semántico completo.

| Dimensión | Valor |
|-----------|-------|
| Señales automatizadas | 13/15 (87%) |
| Confianza promedio | 92% |
| Tiempo de análisis | 4–8 segundos |
| Dependencias nuevas | `@anthropic-ai/sdk` (ya en roadmap Fase 4) |
| Costo mensual | ~$3–9/mes para 500–1,500 prospectos/mes |
| Tiempo de desarrollo | **10–12 horas** |
| Riesgo técnico | Medio |

Claude puede analizar el contenido semánticamente: detectar si una página tiene CTA real aunque no use palabras exactas, inferir si el negocio parece operar con procesos manuales basándose en la descripción, detectar indicios de seguimiento débil en la estructura del sitio.

**No supera a la Opción 2 en señales Google** — Claude no puede acceder a Google Business sin la Places API.

---

## Impacto Esperado en Productividad

### Tiempo por empresa (comparativo)

| Actividad | Antes (manual) | Después (con PRA) | Ahorro |
|-----------|---------------|-------------------|--------|
| Abrir y revisar el sitio web | 2–3 min | 0 min (automático) | 100% |
| Verificar redes sociales | 1–2 min | 0 min (automático) | 100% |
| Verificar formularios, CTA, booking | 1–2 min | 0 min (automático) | 100% |
| Llenar campos de presencia digital | 1 min | 0 min (auto-fill) | 100% |
| Confirmar/ajustar 5 señales manuales | — | 30–45 seg | — |
| Esperar el análisis | — | 2–3 seg | — |
| **TOTAL** | **5–8 min** | **~90 seg** | **~75%** |

### Volumen por hora de trabajo (comparativo)

| Métrica | Antes | Después | Multiplicador |
|---------|-------|---------|---------------|
| Empresas evaluadas/hora | 6–10 | 25–35 | **3–4×** |
| Leads Hot/High identificados/día (4h) | 24–40 | 100–140 | **3–4×** |
| Mensajes enviados/día (4h) | 15–25 | 60–90 | **3–4×** |

---

## Beneficios

1. **Velocidad de prospección 3–4× mayor.** El vendedor puede evaluar una empresa mientras toma un café. De 6-10/hora a 25-35/hora.

2. **Consistencia del scoring.** Los signals detectados automáticamente eliminan errores humanos por cansancio (olvidar marcar una señal evidente).

3. **Datos de contacto capturados automáticamente.** WhatsApp, Instagram, LinkedIn — información que antes requería búsqueda manual — aparece pre-llenada.

4. **Reduce la curva de aprendizaje.** Un vendedor nuevo que no sabe exactamente qué buscar en un sitio web recibe los datos en bandeja. El checklist de señales se convierte en una validación, no en una investigación.

5. **Fundamento para futuras automatizaciones.** El endpoint `/api/research` puede reutilizarse para re-análisis periódico de prospectos existentes (¿actualizaron su web? ¿instalaron reservas?).

---

## Riesgos

| Riesgo | Severidad | Probabilidad | Mitigación |
|--------|-----------|-------------|------------|
| Sitios SPA devuelven HTML vacío | Media | 15–20% de casos | Mostrar "Análisis parcial" + dejar campos vacíos para rellenar manualmente |
| Sitio bloquea el bot (403/429) | Baja | 5–10% | Mostrar error claro: "El sitio bloqueó el análisis. Por favor llena manualmente." |
| Timeout (sitio muy lento) | Baja | 3–5% | Timeout de 8s + fallback a formulario manual |
| Falso positivo en señal | Baja | 10–15% | Mostrar nivel de confianza visual (●●● / ●●○ / ●○○) por señal — el vendedor decide |
| Falso negativo en señal | Baja | 15–20% | El vendedor aún puede ajustar cualquier señal antes de guardar |
| URLs de Google Maps o Instagram como input | Media | — | Agregar soporte explícito para estos dominios en v1.1 |
| Privacidad / scraping legal | Baja | — | El análisis es de datos públicos. No almacenamos el HTML. No revendemos los datos. |

**Riesgo neto:** Bajo. El módulo es una ayuda, no un requisito. Si falla, el vendedor llena el formulario manualmente como hoy. No hay degradación del sistema base.

---

## Señales Permanentemente Manuales (y por qué)

Estas 5 señales nunca serán automatizables con el stack propuesto:

| Señal | Por qué no se puede automatizar |
|-------|--------------------------------|
| `signalHasReviews` | Requiere Google Places API o scraping de Maps (dinámico) |
| `signalHasUnansweredReviews` | Ídem, más análisis del contenido de cada reseña |
| `signalSlowResponse` | Requiere que el vendedor contacte al negocio e interprete el tiempo de respuesta |
| `signalWeakFollowup` | Requiere experiencia de interacción real |
| `signalManualWork` | Requiere conocimiento del flujo operativo interno del negocio |

**Nota:** Las 3 señales de comportamiento (`slowResponse`, `weakFollowup`, `manualWork`) son también las que más se responden correctamente con 30 segundos de observación visual. El vendedor que visita el sitio del prospecto puede marcarlas al mismo tiempo que espera el análisis.

---

## Recomendación Final

### Implementar Opción 1 (HTML Parsing puro) como Fase 3.5.

**Justificación:**

1. **Costo cero.** No requiere ninguna API de pago. La Opción 2 (Google Places) puede agregarse en una iteración posterior si el volumen de prospección lo justifica.

2. **Menor tiempo al mercado.** 6–7 horas de desarrollo vs 8–10 de la Opción 2. El MVP sigue siendo un sistema de un solo usuario — la velocidad de entrega importa más que la perfección.

3. **Cobertura suficiente para el target.** Los prospectos de Kronos (dentistas, inmobiliarias, despachos, restaurantes) usan WordPress/Wix en un 80-85% de los casos. El HTML estático funciona perfectamente para este segmento.

4. **Arquitectura preparada para crecer.** El endpoint `/api/research` está diseñado para ser extensible. La Opción 2 (Google Places) y la Opción 3 (Claude API) pueden añadirse como flags opcionales sin tocar la lógica base.

5. **El 10% de ganancia de la Opción 2** (12/15 vs 10/15 señales) no justifica el costo en esta etapa. Con la Opción 1, el vendedor ya tiene 10 señales gratis y solo confirma 5. La diferencia marginal de 2 señales más (ambas de Google) no cambia el score sustancialmente.

### Plan de implementación recomendado

| Paso | Tarea | Tiempo estimado |
|------|-------|-----------------|
| 1 | `lib/web-analyzer.ts`: función `analyzeUrl()` con todas las reglas de detección | 2.5 h |
| 2 | `app/api/research/route.ts`: endpoint POST con validación Zod + manejo de errores | 1.5 h |
| 3 | UI en `app/companies/new/page.tsx`: sección "Analizar URL" + auto-fill de campos + indicadores de confianza | 2 h |
| 4 | Pruebas con 10 URLs reales de prospectos típicos + ajuste de reglas | 1 h |
| **Total** | | **7 horas** |

### Resultado esperado

Un vendedor que hoy tarda 5–8 minutos por empresa, después de esta fase tardará **60–90 segundos**:

1. Pegar URL → Enter (0 seg)
2. Esperar análisis (2–3 seg)
3. Revisar los 5 campos manuales (30–45 seg)
4. Clic en "Crear y Evaluar" (0 seg)
5. Score disponible (1–2 seg)

**Total: ~90 segundos.** Objetivo de 2 minutos cumplido.

---

## Prerequisitos para implementar

- [ ] Aprobación de esta propuesta
- [ ] Confirmar que `npm install` está disponible (en caso de querer `cheerio` como dep)
- [ ] Tener 5–10 URLs de prospectos reales para validar las reglas durante el desarrollo

## Prerequisitos para la Opción 2 (si se decide escalar)

- [ ] Google Cloud Console account con API key
- [ ] Habilitar "Places API" (Find Place endpoint)
- [ ] Variable de entorno `GOOGLE_PLACES_API_KEY` en `.env`
- [ ] Aceptar costo: $0.017/request

---

*Propuesta generada el 2026-06-11 · Kronos Lead Intelligence*  
*No implementar hasta aprobación explícita*
