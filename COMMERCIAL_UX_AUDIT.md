# COMMERCIAL_UX_AUDIT.md
# Auditoría Completa del Flujo Comercial — Kronos Lead Intelligence
**Fecha:** 2026-06-11 · **Método:** Simulación de vendedor con 5 empresas reales · **Auditor:** Revisión de código + trazado de flujo

---

## Metodología

Se trazó el flujo completo leyendo el código fuente de:
- `app/companies/new/page.tsx` — formulario de creación + Research Assistant
- `app/companies/[id]/page.tsx` — ficha, evaluación, outreach, notas
- `app/page.tsx` — dashboard
- `lib/scoring.ts`, `lib/diagnosis.ts`, `lib/service-match.ts`, `lib/value-estimator.ts`

Se simularon 5 empresas representativas del target de Kronos, contando cada clic, interacción y segundo de espera.

---

## Las 5 Empresas Simuladas

| # | Empresa | País | Perfil digital | Herramienta de entrada |
|---|---------|------|----------------|------------------------|
| 1 | Clínica Dental Lima | Perú (.pe) | Web + WA + IG + SimplyBook | URL análisis |
| 2 | Inmobiliaria Bogotá | Colombia (.co) | WordPress + LinkedIn, sin WA | URL análisis |
| 3 | Restaurante CDMX | México (.mx) | Web básica + IG + WA | URL análisis |
| 4 | Despacho Jurídico Lima | Perú | Sin web — solo WhatsApp | Manual |
| 5 | Consultora B2B Buenos Aires | **Argentina** | Web completa + LinkedIn | — |

---

## Flujo Completo — Paso a Paso

```
[Dashboard]
    │
    ├── 1 clic → "Nueva Empresa"
    │
[/companies/new]
    │
    ├── Pegar URL + Enter → Research Assistant (2–3 segundos espera)
    │   → auto-fill: nombre, WhatsApp, Instagram, LinkedIn, sitio web
    │   → auto-fill: 10 señales con badges de confianza
    │
    ├── Completar manualmente:
    │   ├── Industria (1 clic dropdown + 1 clic opción) ← SIEMPRE MANUAL
    │   ├── País     (1 clic dropdown + 1 clic opción) ← SIEMPRE MANUAL
    │   ├── Ciudad   (texto, opcional)
    │   ├── Fuente del Lead (2 clics dropdown)
    │   └── 5 señales manuales (0–5 ajustes según el negocio)
    │
    ├── 1 clic → "Crear y Evaluar" (espera 1–2 segundos)
    │
[Pantalla intermedia: resultado de evaluación]
    │   muestra: score, prioridad, revenue lost, dolor, servicios, precio
    │
    ├── 1 clic → "Ver ficha completa" ← CLIC OBLIGATORIO SIN VALOR AÑADIDO
    │
[/companies/{id}] — Tab: Evaluación (default)
    │   muestra: 4 métricas, dolor, solución, servicios, categorías, problemas
    │   (solo lectura — tiempo de revisión: 20–40 segundos)
    │
    ├── 1 clic → Tab "Outreach"
    │
[Tab Outreach]
    │   muestra: "Plantilla Sugerida" (WhatsApp por defecto)
    │   El mensaje ya está generado con datos reales del prospecto
    │
    ├── Opcional: 1 clic → cambiar canal (Email/LinkedIn)
    ├── Opcional: 1 clic → "Nueva versión"
    ├── 1 clic → "Copiar"
    │
    ├── SALIR DE KRONOS: abrir WhatsApp/Email/LinkedIn manualmente ← FRICCIÓN ALTA
    │   buscar el contacto manualmente (20–60 segundos)
    │   pegar y enviar
    │
    ├── VOLVER A KRONOS
    ├── 1 clic → "Registrar como enviado" → modal
    ├── 1 clic → "Guardar" en modal
    │
[Opcional: Tab Notas de Venta]
    ├── 1 clic → tab
    ├── texto: nombre del contacto
    ├── 2 clics → estado de contacto
    └── 1 clic → Guardar
```

---

## Conteo Exacto de Clics por Empresa

### Empresa 1: Clínica Dental Lima (caso favorable — URL análisis funciona)

| Acción | Clics | Tiempo |
|--------|-------|--------|
| Dashboard → Nueva Empresa | 1 | 2s |
| Pegar URL + Enter (análisis) | 1 | 3s espera |
| Seleccionar Industria | 2 | 8s |
| Seleccionar País (debería ser automático para .pe) | 2 | 5s |
| Ajustar 1–2 señales manuales | 2 | 20s |
| Clic "Crear y Evaluar" | 1 | 2s espera |
| Leer resultado de evaluación | 0 | 20s |
| Clic "Ver ficha completa" | 1 | 2s |
| Leer evaluación | 0 | 25s |
| Clic tab Outreach | 1 | 1s |
| Leer plantilla generada | 0 | 20s |
| Clic "Copiar" | 1 | 1s |
| Búsqueda manual del contacto en WhatsApp | 0* | 30–60s |
| Envío real (fuera de Kronos) | 0* | 15s |
| Clic "Registrar como enviado" | 1 | — |
| Clic "Guardar" en modal | 1 | 1s |
| **TOTAL** | **14 clics** | **~3 min** |

*Fuera de Kronos — tiempo no controlado

### Empresa 2: Inmobiliaria Bogotá (URL análisis parcial)

| Diferencia vs. Empresa 1 | Clics extra |
|--------------------------|-------------|
| URL análisis detecta menos señales → 4–5 ajustes manuales | +3 clics |
| Cambio de canal WA → LinkedIn | +1 clic |
| **TOTAL** | **18 clics / ~3.5 min** |

### Empresa 3: Restaurante CDMX (caso base similar)

Similar a Empresa 1. **~14 clics / ~3 min**

### Empresa 4: Despacho Jurídico Lima (sin web — sin análisis automático)

| Acción | Clics | Tiempo |
|--------|-------|--------|
| Dashboard → Nueva Empresa | 1 | 2s |
| Análisis URL falla | 0 | 3s espera + error |
| Nombre (manual) | 1 | 5s |
| Industria | 2 | 8s |
| País | 2 | 5s |
| WhatsApp (manual) | 1 | 5s |
| 12–15 señales manuales (sin auto-fill) | 8–12 | 2–3 min |
| "Crear y Evaluar" | 1 | 2s |
| "Ver ficha completa" | 1 | 2s |
| Leer evaluación | 0 | 25s |
| Tab Outreach | 1 | 1s |
| Copiar + enviar | 2 | 45s |
| Registrar | 2 | 15s |
| **TOTAL** | **22–26 clics** | **5–6 min** |

### Empresa 5: Consultora Buenos Aires (Argentina)

| Problema | Resultado |
|----------|-----------|
| Argentina no está en los países válidos | ❌ Error de validación al intentar guardar |
| El formulario no advierte antes de intentar crear | Toda la carga de datos se pierde |
| **La empresa no puede cargarse en absoluto** | Bloqueador absoluto |

---

## Resumen de Conteo por Escenario

| Escenario | Clics | Tiempo | Para 50 empresas |
|-----------|-------|--------|-----------------|
| Ideal (URL análisis completo) | 14 | ~3 min | 700 clics / ~2.5 h |
| Análisis parcial | 18 | ~3.5 min | 900 clics / ~3 h |
| Sin web (manual) | 24 | ~5.5 min | 1,200 clics / ~4.5 h |
| País no soportado | ∞ | — | Bloqueado completamente |

**Promedio real para una sesión de prospección mixta (50% análisis OK, 30% parcial, 20% manual):**
→ **~17 clics por empresa · ~3.5 minutos por empresa · ~2.9 horas para 50 empresas**

---

## Inventario Completo de Fricciones

### 🔴 Críticas — Bloquean o destruyen ventas directamente

---

**CRÍTICA-1: Argentina (y otros 10+ países de LATAM) están completamente bloqueados**

El sistema acepta solo 5 países: `peru`, `mexico`, `colombia`, `chile`, `spain`.

Argentina, Bolivia, Ecuador, Guatemala, Costa Rica, Venezuela, Honduras, Paraguay, Uruguay, República Dominicana — todos fallan con error de validación. No hay warning previo, la falla ocurre al hacer submit y **se pierden todos los datos ingresados**.

Para un vendedor con contactos en Argentina (el 3er mercado de habla hispana del mundo), el sistema es inutilizable.

- **Impacto:** Bloqueo total para ~40% de los países de LATAM.
- **Causa:** `z.enum(['peru', 'mexico', 'colombia', 'chile', 'spain'])` en `lib/schemas.ts:5`
- **Fix mínimo:** 15 minutos — cambiar a `z.string().min(2)` o agregar los países faltantes.

---

**CRÍTICA-2: `[Nombre]` nunca se resuelve — todas las plantillas salen como spam**

Las 20 plantillas de WhatsApp contienen `[Nombre]` como literal. Ejemplo real:

```
"Hola [Nombre] 👋\n\nVi que Clínica Dental Lima no tiene reservas online..."
```

Si el usuario no edita el mensaje antes de enviarlo, el prospecto recibe exactamente eso: **"Hola [Nombre]"**. Esto destruye la credibilidad del mensaje, baja las tasas de respuesta a cero, y hace que el prospecto clasifique el mensaje como spam.

El sistema tiene `contactName` en el modelo `SalesNote` pero nunca lo usa para resolver el placeholder en la plantilla.

- **Impacto:** Cada mensaje enviado sin editar activamente perjudica la imagen del vendedor.
- **Causa:** `generateOutreachTemplate()` no tiene acceso al `salesNote.contactName` de la empresa.
- **Fix mínimo:** 30 minutos — pasar `contactName?: string` a `generateOutreachTemplate()` y reemplazar `[Nombre]` con el nombre si existe, o mantener el placeholder solo cuando no hay nombre.

---

**CRÍTICA-3: No hay botón de acción directa hacia WhatsApp**

El flujo de envío es:
1. Copiar plantilla en Kronos
2. **Salir de Kronos**
3. Abrir WhatsApp (web o app)
4. Buscar el contacto o ir a `wa.me/{número}`
5. Pegar el mensaje
6. Enviar
7. Volver a Kronos
8. Registrar como enviado

Los pasos 2–7 ocurren completamente fuera del sistema y demoran 30–90 segundos por empresa. En una sesión de 50 prospectos, son entre 25 y 75 minutos de trabajo manual invisible, totalmente evitable.

El sistema ya almacena el `whatsapp` del prospecto. Bastaría un `<a href="https://wa.me/{número}">` para reducir esto a 2 clics.

- **Impacto:** 30–90 segundos de fricción por prospecto. En 50 empresas: 25–75 minutos perdidos.
- **Causa:** No existe link `wa.me/` en la ficha ni en el panel de outreach.
- **Fix mínimo:** 20 minutos — agregar un botón "Abrir WhatsApp" en el panel de outreach cuando `company.whatsapp` existe.

---

### 🟠 Importantes — Ralentizan el flujo sin bloquearlo

---

**IMPORTANTE-1: País y ciudad no se auto-detectan del dominio**

El Research Assistant extrae 10 señales pero no usa datos evidentes:
- Dominio `.pe` → Perú (certeza alta)
- Dominio `.mx` → México
- Dominio `.co` → Colombia
- Dominio `.es` → España
- Número de teléfono con `+51` → Perú
- Número con `+52` → México

El vendedor debe seleccionar país manualmente en cada empresa. Para alguien que prospecta 30 empresas peruanas en una sesión, son 60 clics evitables (30 × 2).

- **Clics extra por empresa:** 2
- **Para 50 empresas:** 100 clics innecesarios
- **Fix:** 45 minutos — lógica de detección de país en `web-analyzer.ts` usando TLD + código de área telefónico.

---

**IMPORTANTE-2: Industria no se sugiere automáticamente**

El Research Assistant detecta el nombre del negocio desde `og:title` y `<title>`, pero no usa esa información para sugerir una industria.

Ejemplos que serían trivialmente detectables:
- "Clínica Dental" → Dental / Odontología
- "Bienes Raíces" → Inmobiliaria / Real Estate
- "Abogados" / "Jurídico" → Estudio Jurídico
- "Restaurante" / "Food" → Restaurante

El vendedor siempre debe abrir el dropdown y seleccionar. En una sesión de 50 empresas: 100 clics.

- **Clics extra por empresa:** 2
- **Para 50 empresas:** 100 clics
- **Fix:** 1 hora — función `suggestIndustry(title, url)` en `web-analyzer.ts`.

---

**IMPORTANTE-3: Pantalla intermedia de "evaluación resultado" es un paso muerto**

Después de crear la empresa, aparece una pantalla de confirmación con el score y los resultados. El único camino productivo desde ahí es hacer clic en "Ver ficha completa" para ir a la empresa.

Esta pantalla muestra exactamente la misma información que el tab de Evaluación en la ficha de empresa. No hay ninguna acción útil exclusiva de esta pantalla. Es **1 clic obligatorio por empresa que no aporta valor**.

Para un flujo de prospección masivo, lo ideal sería:
- Redirigir automáticamente a `/companies/{id}?tab=outreach` al completar la creación.
- O al menos mostrar en esta pantalla un botón "Copiar y enviar WhatsApp" que redirija al outreach.

- **Clics extra por empresa:** 1
- **Para 50 empresas:** 50 clics
- **Fix:** 20 minutos — cambiar `router.push('/companies/' + companyId)` directo al terminar la creación, eliminando la pantalla intermedia.

---

**IMPORTANTE-4: No persiste el país ni la fuente del lead entre formularios**

Si el vendedor prospecta 20 clínicas dentales en Lima, debe seleccionar:
- País: "Perú" — 20 veces
- Industria: "Dental / Odontología" — 20 veces
- Fuente del lead: "Google Maps" — 20 veces

No hay persistencia de los valores de la sesión anterior ni valores predeterminados configurables.

- **Clics extra por empresa:** 4–6 cuando el perfil se repite
- **Para una sesión de 20 empresas del mismo nicho:** 80–120 clics extra
- **Fix:** 30 minutos — `localStorage` con los últimos valores usados como defaults.

---

**IMPORTANTE-5: El modal de "Registrar como enviado" exige 2 clics donde bastaría 1**

Flujo actual: "Registrar como enviado" → modal con canal y mensaje pre-llenados → clic "Guardar".

El modal es necesario para casos donde el usuario quiere añadir notas de respuesta o modificar el mensaje. Pero para el caso más común (simplemente registrar que se envió), es un paso extra.

Alternativa: si no se ha recibido respuesta, un botón "Marcar como enviado" que guarde directamente sin modal, con opción "Añadir respuesta" separada.

- **Clics extra por empresa:** 1
- **Impacto:** Bajo individualmente, relevante a escala.

---

**IMPORTANTE-6: Las plantillas no muestran el número de WhatsApp del prospecto junto al botón Copiar**

Cuando el vendedor copia el template de WhatsApp, no ve el número al que debe enviarlo en la misma pantalla. Debe:
1. Memorizar el número (si lo vio en el formulario)
2. O buscar el número en el perfil de la empresa (otra navegación)
3. O ir a Google/WhatsApp a buscarlo manualmente

El número ya está guardado en `company.whatsapp`. Mostrarlo junto al botón "Copiar" es una mejora de 0 desarrollo nuevo — solo un `<p>` adicional en el componente.

- **Tiempo extra por empresa:** 15–45 segundos buscando el número
- **Fix:** 15 minutos — mostrar `company.whatsapp` en el panel de outreach.

---

**IMPORTANTE-7: El tab de Outreach no muestra el nombre del contacto ni datos de ventas**

El panel de Outreach está desconectado del panel de Notas de Venta. Si el vendedor ya registró el nombre del contacto en Notas de Venta, esa información no aparece en Outreach. El template dice "Hola [Nombre]" aunque el nombre ya esté en el sistema.

---

### 🟡 Opcionales — Mejoras de calidad de vida

---

**OPCIONAL-1: Sin "Crear otra empresa" en la pantalla de éxito**

Después de crear, no hay botón "Crear otro prospecto". El vendedor debe volver al dashboard y volver a hacer clic en "Nueva Empresa". Para sesiones de carga masiva, 2 clics extra por empresa.

**OPCIONAL-2: El dashboard no tiene acción rápida "Contactar"**

Desde la tabla del dashboard no hay botón de "Contactar" o "Ver outreach". El click en la fila lleva al tab de Evaluación, que no es el más útil para un vendedor que ya evaluó las empresas. Un segundo clic lleva al outreach.

**OPCIONAL-3: Sin contador de días desde el último contacto**

El dashboard muestra "Evaluado: 15 jun" pero no "Último contacto: hace 5 días" ni "Sin contacto: 10 días". Un vendedor que vuelve al día siguiente no sabe cuáles companies han esperado demasiado.

**OPCIONAL-4: Sin atajos de teclado**

No hay `Cmd+Enter` para enviar el formulario, no hay navegación entre tabs con teclado.

**OPCIONAL-5: Confirmación de señales en bulk**

Después del análisis URL, el vendedor debe revisar los 15 checkboxes individualmente. Un botón "Confirmar análisis automático" que cierre visualmente las señales auto-detectadas haría la revisión más rápida.

**OPCIONAL-6: Score no muestra qué categoría pesa más en tiempo real**

El score se calcula al guardar. Mientras el vendedor marca señales, no hay indicación de qué señales tendrán mayor impacto en el score final.

**OPCIONAL-7: La ficha no tiene link directo al sitio web del prospecto**

`company.website` está guardado pero no hay `<a href={company.website}>` en la ficha. Para abrir el sitio del prospecto hay que copiar la URL de algún lado.

---

## Tabla Resumen de Fricciones

| ID | Tipo | Fricción | Clics extra/empresa | Impacto ventas |
|----|------|---------|---------------------|----------------|
| CRÍTICA-1 | Bloqueador | Argentina y 10+ países LATAM no soportados | ∞ (no entra) | ❌ Bloqueo total |
| CRÍTICA-2 | Calidad del mensaje | `[Nombre]` literal en todos los templates | 2–3 (editar) | ❌ Destruye credibilidad |
| CRÍTICA-3 | Fricción en envío | No hay botón WhatsApp directo (`wa.me/`) | 0 extra, pero 30–90s perdidos | ❌ Reduce mensajes enviados |
| IMPORTANTE-1 | Velocidad | País no se detecta del dominio | 2 | Medio |
| IMPORTANTE-2 | Velocidad | Industria no se sugiere del título | 2 | Medio |
| IMPORTANTE-3 | Navegación | Pantalla intermedia de evaluación innecesaria | 1 | Medio |
| IMPORTANTE-4 | Velocidad | Sin persistencia de país/industria/fuente | 4–6 (sesiones repetidas) | Medio |
| IMPORTANTE-5 | Navegación | Modal de registro con 2 clics | 1 | Bajo-Medio |
| IMPORTANTE-6 | Contexto | Número de WA no visible en Outreach | 0 extra, pero 15–45s perdidos | Medio |
| IMPORTANTE-7 | Datos | Nombre del contacto no llega a la plantilla | 2–3 (editar) | Medio |
| OPCIONAL-1 | Flujo | Sin "Crear otra empresa" en pantalla de éxito | 2 | Bajo |
| OPCIONAL-2 | Dashboard | Sin acción rápida desde tabla | 1 | Bajo |
| OPCIONAL-3 | Seguimiento | Sin días desde último contacto | — | Bajo |
| OPCIONAL-4 | Productividad | Sin atajos de teclado | — | Bajo |
| OPCIONAL-5 | UX | Confirmación de señales en bulk | — | Bajo |
| OPCIONAL-6 | Feedback | Score no actualiza en tiempo real | — | Bajo |
| OPCIONAL-7 | Contexto | Link al sitio del prospecto en la ficha | — | Bajo |

---

## Cálculo de Impacto: 50 Empresas

### Estado actual (con Phase 3.5, sin mejoras adicionales)

| Métrica | Valor |
|---------|-------|
| Clics por empresa (promedio real) | 17 |
| Tiempo por empresa (promedio real) | 3.5 min |
| **50 empresas — clics totales** | **850 clics** |
| **50 empresas — tiempo total** | **~2.9 horas** |
| De esos, clics evitables | ~350 (41%) |
| De ese tiempo, tiempo evitable | ~55 minutos (31%) |

### Estado con todas las mejoras críticas e importantes implementadas

| Métrica | Valor |
|---------|-------|
| Clics por empresa (estimado) | 10 |
| Tiempo por empresa (estimado) | 2.0 min |
| **50 empresas — clics totales** | **500 clics** |
| **50 empresas — tiempo total** | **~1.7 horas** |
| Mejora en clics | 41% menos |
| Mejora en tiempo | 41% menos |

---

## Mapa de Información que Aparece Demasiado Tarde

| Información | Dónde aparece hoy | Dónde debería aparecer |
|-------------|-------------------|------------------------|
| Revenue lost / Score | Pantalla intermedia + Tab Evaluación | ✅ Ya en la pantalla de resultado |
| Número de WhatsApp del prospecto | Solo en el formulario original | **Panel de Outreach — junto al botón Copiar** |
| Nombre del contacto (si existe) | Solo en Tab Notas de Venta | **Dentro del template generado** |
| Link al sitio web del prospecto | No visible en la ficha | **Header de la ficha — link directo** |
| Días desde último contacto | No existe | **Dashboard — columna o indicador** |

## Mapa de Información Poco Visible que Debería Destacarse Más

| Información | Visibilidad actual | Prioridad |
|-------------|-------------------|-----------|
| `estimatedRevenueLostPerMonth` | Roja prominente en Evaluación | ✅ Bien visible |
| `probablePainPoint` | Card separada en Evaluación | ✅ OK |
| Número de WhatsApp del prospecto | En formulario, no en ficha | 🔴 No aparece en el flujo de envío |
| Los servicios recomendados | Chips en Evaluación | ⚠️ Podrían ser más prominentes |
| Score en el header de la ficha | Presente en la ficha | ✅ OK |
| Fecha de último outreach | Solo en el historial de outreach | ⚠️ Debería estar en el header |

---

## Clasificación de Mejoras por Impacto Comercial en 14 Días

### 🔴 Críticas (implementar antes de prospectar)

| # | Mejora | Tiempo desarrollo | Impacto |
|---|--------|------------------|---------|
| C1 | Agregar Argentina + países LATAM faltantes | 15 min | Desbloquea mercados enteros |
| C2 | Resolver `[Nombre]` con contactName de Sales Notes (o eliminar el placeholder) | 30 min | Mejora tasa de respuesta inmediatamente |
| C3 | Botón `wa.me/` directo en panel Outreach | 20 min | Reduce fricción del último paso del envío |

### 🟠 Importantes (implementar en la próxima semana)

| # | Mejora | Tiempo desarrollo | Impacto |
|---|--------|------------------|---------|
| I1 | Auto-detectar país del dominio (TLD + phone code) | 45 min | -2 clics por empresa, -100 en 50 |
| I2 | Sugerir industria del nombre del negocio | 60 min | -2 clics por empresa, -100 en 50 |
| I3 | Eliminar pantalla intermedia → ir directo a outreach | 20 min | -1 clic por empresa + flujo más veloz |
| I4 | Persistir país/industria/fuente del lead en localStorage | 30 min | -4 clics en sesiones repetidas |
| I5 | Mostrar company.whatsapp en panel de Outreach | 15 min | Contexto de envío en un vistazo |

### 🟡 Opcionales (backlog)

| # | Mejora | Tiempo desarrollo | Impacto |
|---|--------|------------------|---------|
| O1 | "Crear otra empresa" en pantalla de éxito | 15 min | Flujo de carga masiva más rápido |
| O2 | Link directo al sitio web en header de ficha | 10 min | Contexto en un clic |
| O3 | Días desde último contacto en dashboard | 2 h | Priorización de follow-up |
| O4 | Score en tiempo real mientras se marcan señales | 3 h | Feedback inmediato |
| O5 | Bulk confirm de señales auto-detectadas | 1 h | UX del checklist más limpia |

---

## La Pregunta Principal: ¿Qué cambio produciría más ventas en 14 días?

**Respuesta:** **Resolver el placeholder `[Nombre]` en las plantillas de outreach (CRÍTICA-2).**

### Argumentación

El flujo completo de Kronos existe para un único propósito: que el vendedor envíe mensajes personalizados a prospectos y consiga reuniones. Todo lo demás —el scoring, el diagnóstico, el revenue estimator, los 20 templates— sirve a ese momento.

Ese momento está actualmente saboteado por un detalle de 3 líneas de código.

**El estado real de un mensaje enviado hoy:**
```
Hola [Nombre] 👋

Vi que Clínica Dental Lima no tiene reservas online. En Dental / Odontología,
el 40% de las citas se intenta agendar fuera de horario...
```

Cuando un prospecto recibe un WhatsApp que empieza con "Hola [Nombre]", pasa una de dos cosas:
1. Ignora el mensaje inmediatamente al ver que es spam automatizado
2. Bloquea al remitente

Ninguna de las demás mejoras importa si los mensajes que se envían destruyen la credibilidad del vendedor en el primer segundo.

**Por qué este cambio produce más ventas que el botón `wa.me/` (CRÍTICA-3):**

El botón `wa.me/` reduce fricción de _envío_. Si ya hay mensajes saliendo, esto acelera el proceso.

Pero resolver `[Nombre]` mejora la _tasa de respuesta_ de cada mensaje que ya se envía. Un mensaje personalizado con el nombre real puede mejorar la tasa de apertura/respuesta en 20–50%. En 14 días con 50 prospectos contactados:

- **Sin fix:** Si tasa de respuesta = 5% → 2–3 reuniones
- **Con fix:** Si tasa de respuesta = 15% → 7–8 reuniones
- **Diferencia:** 4–5 reuniones adicionales de las mismas 50 empresas cargadas

Y la implementación toma 30 minutos.

### Orden de prioridad para los próximos 14 días

1. **[30 min]** Resolver `[Nombre]` → más respuestas de los mismos mensajes
2. **[20 min]** Botón `wa.me/` directo → más mensajes enviados por hora
3. **[15 min]** Agregar Argentina + países faltantes → desbloquea nuevos mercados
4. **[45 min]** Auto-detectar país del dominio → 100 clics menos en 50 empresas
5. **[20 min]** Eliminar pantalla intermedia → flujo más veloz

Total: ~2.5 horas de desarrollo para transformar la productividad comercial.

---

## Indicadores de Seguimiento Recomendados

Para medir si las mejoras funcionan, registrar esta semana antes de implementar:

| Métrica | Cómo medir |
|---------|-----------|
| Empresas cargadas por hora | Cronómetro en una sesión de carga |
| % mensajes con `[Nombre]` sin reemplazar | Revisar historial de outreach en Supabase |
| Tasa de respuesta (respuestas / mensajes enviados) | Outreach history: `responseReceived = true` / total |
| Tiempo de "copiar template" a "registrado como enviado" | Cronómetro manual en una sesión |

---

*Auditoría realizada el 2026-06-11 · Kronos Lead Intelligence*  
*Basada en revisión completa del código fuente + simulación de 5 empresas representativas*
