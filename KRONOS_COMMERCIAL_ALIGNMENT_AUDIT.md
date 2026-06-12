# KRONOS_COMMERCIAL_ALIGNMENT_AUDIT.md
**Fecha:** 2026-06-11 · **Auditor:** Kronos Lead Intelligence Phase 3.7
**Fuente de verdad comercial:** https://www.kronosdata.tech/
**Proyecto auditado:** Kronos Lead Intelligence

---

## 1. FUENTE DE VERDAD — KRONOS DATA WEB

### Identidad
- **Nombre oficial:** Kronos Data
- **Tagline:** "Ingeniería de Eficiencia y Consultoría Administrativa"
- **Propuesta central:** Inteligencia de datos y automatización estratégica para transformación operativa

### Paquetes oficiales (4 servicios + 1 entrada gratuita)

| # | Nombre oficial | Subtítulo oficial |
|---|---------------|------------------|
| 1 | **Auditoría Gratuita / Diagnóstico** | Paso de entrada gratuito vía Calendly |
| 2 | **Sistemas de Operaciones Autónomas** | "Ingeniería de flujos de trabajo mediante n8n para la eliminación de procesos manuales y escalabilidad operativa" |
| 3 | **Arquitectura de Datos y Dashboards** | "Limpieza, procesamiento y visualización estratégica de Big Data (SQL/Python) para decisiones de negocio en tiempo real" |
| 4 | **Inteligencia Competitiva & Scraping** | "Extracción automatizada de datos de mercado y análisis de competencia para posicionamiento estratégico de marca" |
| 5 | **Auditoría de Conversión Digital** | "Optimización técnica de activos digitales (SEO, Ads, Social) basada en algoritmos de IA para maximizar el ROI" |

Todos marcados con: **"Powered by Kronos Neural Engine"**

### Metodología — "El Proceso Kronos"
1. **Diagnóstico:** Auditoría profunda de procesos actuales para detectar fugas de eficiencia y mapear oportunidades
2. **Arquitectura:** Diseño personalizado del ecosistema de IA y automatización
3. **Despliegue:** Implementación técnica, capacitación del equipo y monitoreo continuo de ROI en tiempo real

### Garantías y soporte
- **"Garantía de Optimización Operativa"** — ajustes técnicos sin costo si el sistema requiere calibración en el primer mes (30 días)
- Resultados visibles desde la primera semana
- Monitoreo post-implementación continuo
- Soporte técnico incluido
- No se requieren conocimientos de programación del cliente

### Tecnologías mencionadas (NO son nombres de productos)
n8n, Python, SQL, OpenAI, Google Cloud, AWS, Selenium

### CTAs
- Agendar auditoría gratuita (Calendly: alejandro-kronosdata)
- Formulario de contacto (respuesta 24h)
- WhatsApp: +51937613194

### Precios
La web **no publica precios**. Todos los precios en Kronos Lead son internos y preliminares.

---

## 2. ESTADO ACTUAL — KRONOS LEAD INTELLIGENCE

### Catálogo de servicios actual (`lib/constants.ts` — `KRONOS_SERVICES`)

| Slug | Nombre actual | Precio | Dificultad |
|------|--------------|--------|-----------|
| `whatsapp_automation` | Automatización de WhatsApp | $500–$1,200 | low |
| `appointment_booking` | Sistema de Reservas y Citas | $500–$1,500 | medium |
| `lead_capture_funnel` | Funnel de Captura de Leads | $500–$1,200 | medium |
| `crm_followup_automation` | CRM y Automatización de Seguimiento | $800–$2,000 | medium |
| `google_business_setup` | Configuración de Google Business | $150–$400 | low |
| `review_management` | Gestión de Reseñas | $200–$500 | low |
| `social_media_presence` | **Paquete de Presencia en Redes Sociales** ⚠️ | $400–$900 | medium |
| `website_development` | Desarrollo de Sitio Web | $800–$2,500 | high |
| `sales_process_automation` | Automatización del Proceso de Ventas | $1,200–$3,500 | high |
| `digital_presence_audit` | Auditoría de Presencia Digital | $150–$350 | low |

**No existen paquetes**. Solo servicios individuales.

---

## 3. INCONSISTENCIAS DETECTADAS

### 3.1 CRÍTICAS — Bloquean la alineación comercial

#### IC-01: Paquetes oficiales completamente ausentes
**Descripción:** Kronos Lead no conoce ninguno de los 4 paquetes oficiales de la web. Recomienda servicios individuales en lugar de paquetes, lo que crea una oferta paralela no alineada con la web.
**Impacto:** Cada evaluación genera una propuesta ad-hoc que no corresponde a ningún producto real de Kronos Data.
**Corrección:** Crear `lib/catalog/kronos-offers.ts` con los 5 paquetes (incluyendo Auditoría Gratuita) y motor de mapeo `lib/recommendations/package-mapper.ts`.

#### IC-02: URL oficial ausente en todas las plantillas de outreach
**Descripción:** Ninguna plantilla de WhatsApp, Email o LinkedIn incluye `https://www.kronosdata.tech/`. El prospecto no tiene forma de descubrir la oferta oficial.
**Impacto:** Los mensajes hablan de "Kronos" sin enlace verificable, lo cual reduce credibilidad y rompe el funnel.
**Corrección:** Añadir `https://www.kronosdata.tech/` exactamente una vez en cada plantilla, con integración natural.

#### IC-03: Sección única de servicios — sin separación paquete/individual
**Descripción:** La ficha de empresa muestra una sola sección "Propuesta de Servicios" que mezcla servicios sin contexto de paquete.
**Impacto:** El prospecto (si viera la ficha) o el vendedor no tiene claro qué paquete de la web encaja. Genera confusión interna.
**Corrección:** Crear dos secciones separadas: **A) Paquetes Kronos recomendados** + **B) Servicios individuales recomendados**.

#### IC-04: Schema sin campos de paquetes
**Descripción:** El modelo `Evaluation` no tiene `recommendedPackageSlug`, `packageReason`, `packageConfidence`, `catalogVersion`, etc.
**Impacto:** Imposible persistir ni rastrear recomendaciones de paquetes. Historial de evaluaciones incompleto.
**Corrección:** Añadir campos de paquete al schema de Prisma.

---

### 3.2 IMPORTANTES — Afectan la coherencia comercial

#### II-01: Nombre incorrecto — "Paquete de Presencia en Redes Sociales"
**Descripción:** `social_media_presence` lleva el prefijo "Paquete" en su nombre, siendo un servicio individual.
**En la web:** La oferta de redes sociales es parte del paquete "Auditoría de Conversión Digital".
**Corrección:** Renombrar a "Optimización de Presencia en Redes Sociales".

#### II-02: "Auditoría de Presencia Digital" vs. "Auditoría de Conversión Digital"
**Descripción:** `digital_presence_audit` se llama "Auditoría de Presencia Digital" en Lead, pero el paquete oficial de la web se llama "Auditoría de Conversión Digital". Son conceptos relacionados pero distintos.
**Corrección:** Distinguir claramente: el servicio individual se mantiene como "Diagnóstico de Presencia Digital" (paso de entrada), mientras el paquete oficial es "Auditoría de Conversión Digital".

#### II-03: Tecnologías citadas implícitamente como productos
**Descripción:** En `recommendedSolution` de `lib/diagnosis.ts`, frases como "funnel de captura de leads con CTA optimizado" o "configuración y optimización de Google Business Profile" son nombres correctos. Sin embargo, en ningún lugar se menciona que estas soluciones son "Powered by Kronos Neural Engine" (marca de la web).
**Corrección:** No es urgente, pero las plantillas de outreach deben hacer referencia a Kronos como solución, no a herramientas técnicas (n8n, Python, etc.).

#### II-04: Metodología "El Proceso Kronos" no reflejada
**Descripción:** La web comunica Diagnóstico → Arquitectura → Despliegue como metodología de entrega. Las fichas de empresa no muestran en qué fase del proceso encaja el paquete recomendado.
**Corrección:** En la sección de paquetes, indicar las etapas incluidas (diagnóstico/arquitectura/despliegue) según el paquete.

#### II-05: Garantía "Optimización Operativa 30 días" no reflejada
**Descripción:** La web ofrece esta garantía. El catálogo de servicios de Lead no la menciona en ningún campo.
**Corrección:** Incluir en el catálogo de paquetes el campo `guarantee` con "Garantía de Optimización Operativa 30 días".

#### II-06: OutreachHistory sin campos de trazabilidad de paquetes
**Descripción:** El modelo `OutreachHistory` no tiene `packageSlug`, `evidenceLevel`, `officialUrlIncluded`, `templateType`, `catalogVersion`.
**Impacto:** Imposible saber qué tipo de mensaje se envió (paquete vs. servicio individual vs. auditoría gratuita).
**Corrección:** Añadir estos campos al schema.

---

### 3.3 MENORES — Mejoras de coherencia

#### IM-01: Servicios individuales faltantes del catálogo extendido
**Descripción:** El spec de la Fase 3.7 define 26 servicios individuales organizados en 5 categorías. El catálogo actual tiene solo 10.
**Servicios faltantes (16):**
- Integraciones y Flujos Automatizados
- Arquitectura de Datos
- Dashboards e Indicadores de Gestión
- Consolidación y Limpieza de Datos
- Automatización de Reportes
- Scraping y Extracción de Datos
- Monitoreo de Competidores
- Monitoreo de Precios y Oferta
- Dataset Estructurado
- Dashboard Competitivo
- Arquitectura de Solución
- Implementación y Despliegue
- Capacitación
- Soporte Post-implementación
- Seguimiento de ROI
- Diagnóstico de Pago (vs. Diagnóstico Gratuito — deben separarse)

**Nota:** No todos estos generan señales de scoring en el sistema actual. Deben estar en el catálogo pero no todos disparan lógica de señales.

#### IM-02: Dashboard sin filtros por paquete, confianza ni cobertura
**Descripción:** `app/page.tsx` solo filtra por prioridad e industria. No hay filtro por paquete recomendado, confianza (`scoreConfidence`) ni cobertura (`researchCoverage`).
**Corrección:** Añadir filtros opcionales sin eliminar los existentes.

#### IM-03: SalesNote sin campos de paquete
**Descripción:** `SalesNote` no almacena el paquete recomendado, servicio prioritario, confianza, URL oficial ni next-action sugerida basada en paquete.
**Corrección:** Los campos de paquete en Evaluation son suficientes para auto-generar la `nextAction` correcta en SalesNote.

#### IM-04: Tagline institucional no usado
**Descripción:** "Ingeniería de Eficiencia y Consultoría Administrativa" no aparece en ningún mensaje de outreach.
**Corrección:** No es obligatorio en mensajes de prospección (pueden sonar robóticos), pero sí puede aparecer como descripción corporativa en la sección de paquetes.

---

## 4. NOMBRES DUPLICADOS O CONFUSOS

| Término en Lead | Nombre oficial en web | Acción requerida |
|----------------|----------------------|-----------------|
| "Paquete de Presencia en Redes Sociales" | (No es paquete — parte de Auditoría de Conversión Digital) | Renombrar a "Optimización de Presencia en Redes Sociales" |
| "Auditoría de Presencia Digital" | "Auditoría de Conversión Digital" (paquete) | Diferenciar: servicio de diagnóstico de entrada ≠ paquete completo |
| "Automatización del Proceso de Ventas" | Bajo "Sistemas de Operaciones Autónomas" | Mantener como servicio individual, mapear al paquete correcto |
| "Configuración de Google Business" | Bajo "Auditoría de Conversión Digital" | Mantener como servicio individual, mapear al paquete correcto |
| No existe "Sistemas de Operaciones Autónomas" | Paquete oficial | Crear en catálogo |
| No existe "Arquitectura de Datos y Dashboards" | Paquete oficial | Crear en catálogo |
| No existe "Inteligencia Competitiva & Scraping" | Paquete oficial | Crear en catálogo |

---

## 5. SERVICIOS FALTANTES (en Lead, presentes en spec 3.7)

### Categoría: Operaciones y Automatización (5 → solo 4 en Lead)
- ✅ Automatización de WhatsApp
- ✅ CRM y Automatización de Seguimiento
- ✅ Sistema de Reservas y Citas
- ✅ Automatización de Procesos Comerciales
- ❌ **Integraciones y Flujos Automatizados** — FALTANTE

### Categoría: Conversión Digital (6 → 5 en Lead + nombre incorrecto)
- ✅ Diagnóstico (= digital_presence_audit, renombrar a "Diagnóstico de Presencia Digital")
- ✅ Funnel de Captura de Leads
- ✅ Desarrollo u Optimización de Sitio Web
- ✅ Configuración y Optimización de Google Business
- ✅ Gestión de Reseñas
- ⚠️ **Optimización de Presencia en Redes Sociales** (nombre incorrecto en Lead)

### Categoría: Datos (5 → 0 en Lead)
- ❌ **Arquitectura de Datos** — FALTANTE
- ❌ **Dashboards e Indicadores de Gestión** — FALTANTE
- ❌ **Consolidación y Limpieza de Datos** — FALTANTE
- ❌ **Automatización de Reportes** — FALTANTE

### Categoría: Inteligencia Competitiva (5 → 0 en Lead)
- ❌ **Scraping y Extracción de Datos** — FALTANTE
- ❌ **Monitoreo de Competidores** — FALTANTE
- ❌ **Monitoreo de Precios y Oferta** — FALTANTE
- ❌ **Dataset Estructurado** — FALTANTE
- ❌ **Dashboard Competitivo** — FALTANTE

### Categoría: Transversales (6 → 0 en Lead como transversales)
- ❌ **Diagnóstico** (ya existe como digital_presence_audit, pero no separado entre gratuito/pago)
- ❌ **Arquitectura de Solución** — FALTANTE
- ❌ **Implementación y Despliegue** — FALTANTE
- ❌ **Capacitación** — FALTANTE
- ❌ **Soporte Post-implementación** — FALTANTE
- ❌ **Seguimiento de ROI** — FALTANTE

---

## 6. PAQUETES FALTANTES

Los 4 paquetes de la web + la auditoría gratuita son completamente inexistentes en Kronos Lead:

| Slug | Nombre | Estado |
|------|--------|--------|
| `auditoria_gratuita` | Auditoría Gratuita / Diagnóstico | ❌ FALTANTE |
| `sistemas_operaciones_autonomas` | Sistemas de Operaciones Autónomas | ❌ FALTANTE |
| `arquitectura_datos_dashboards` | Arquitectura de Datos y Dashboards | ❌ FALTANTE |
| `inteligencia_competitiva_scraping` | Inteligencia Competitiva & Scraping | ❌ FALTANTE |
| `auditoria_conversion_digital` | Auditoría de Conversión Digital | ❌ FALTANTE |

---

## 7. PROMESAS CONTRADICTORIAS

| Aspecto | En Lead actualmente | En web oficial | Veredicto |
|---------|-------------------|----------------|-----------|
| Plazos de implementación | `website_development`: "6–10 semanas" | Web no publica plazos | ⚠️ No contradice web, pero puede ser inconsistente entre ficha y outreach |
| Garantía | No mencionada | "Garantía de Optimización Operativa 30 días" | ❌ FALTANTE en Lead |
| Soporte | No mencionado | "Monitoreo post-implementación continuo" | ❌ FALTANTE en Lead |
| Diagnóstico | Presentado como servicio de pago ($150–$350) | Calendly = gratuito | ⚠️ Confusión — hay diagnóstico gratuito (Auditoría Gratuita) y posiblemente diagnóstico de pago |
| URL en mensajes | Ausente | `https://www.kronosdata.tech/` es la URL de contacto | ❌ CRÍTICO — Outreach sin enlace |
| Email | `alejandro@kronosdata.tech` ✓ | Form-based en web | ✅ Coherente |

---

## 8. TÉRMINOS A REEMPLAZAR

| Término antiguo | Término correcto |
|----------------|-----------------|
| "Paquete de Presencia en Redes Sociales" | "Optimización de Presencia en Redes Sociales" |
| "Auditoría de Presencia Digital" (cuando se refiere al paquete) | "Auditoría de Conversión Digital" |
| "Auditoría de Presencia Digital" (cuando se refiere al diagnóstico de entrada) | "Diagnóstico de Presencia Digital" |
| Cualquier mención de n8n/Python/SQL/etc. en propuestas comerciales | Nombre del servicio o paquete que lo utiliza |
| Referencias a "Kronos" sin URL | "Kronos Data — https://www.kronosdata.tech/" |
| Ausencia de URL en outreach | Añadir `https://www.kronosdata.tech/` |

---

## 9. PRECIOS Y PLAZOS INCOHERENTES

### Precios
- Diagnóstico de entrada: Lead cobra $150–$350. Web lo ofrece **gratuito** via Calendly.
  - **Resolución:** El "Diagnóstico Gratuito" es la puerta de entrada (URL de Calendly). El `digital_presence_audit` a precio pagado es una alternativa cuando el cliente ya quiere una auditoría formal. Deben diferenciarse claramente.

### Plazos
- En outreach, `implementationTimeEstimate` del servicio principal se usa directamente (fix ya implementado en Phase 3.6).
- En descripción de paquetes: los paquetes tendrán `timelineMin` y `timelineMax` para comunicar rangos realistas.
- Coherencia garantizada si todos los templates usan la misma fuente.

---

## 10. COINCIDENCIAS (lo que ya está bien)

| Aspecto | Estado |
|---------|--------|
| Email `alejandro@kronosdata.tech` | ✅ Correcto en toda la codebase |
| Nombre de empresa "Kronos Data" | ✅ Correcto |
| Precios LATAM SMB calibrados | ✅ Ajustados en Phase 3.6 |
| Señales de evidencia evidence-aware | ✅ Implementadas en Phase 3.6 |
| "Rango preliminar sujeto a validación" en precios | ✅ priceLabel ya implementado |
| Diagnóstico condicional por cobertura | ✅ Implementado en Phase 3.6 |
| SalesNote auto-inicializada | ✅ Implementado en Phase 3.6 |
| No recomendar listas de 8+ servicios | ✅ Max 3 (1+2) ya implementado |

---

## 11. ORDEN DE PRIORIDAD PARA IMPLEMENTACIÓN

1. **IC-01** — Catálogo de paquetes + motor de mapeo (arquitectura central)
2. **IC-02** — URL en todas las plantillas de outreach
3. **IC-03** — Dos secciones separadas en UI (paquetes + servicios individuales)
4. **IC-04** — Schema con campos de paquetes
5. **II-01** — Renombrar "Paquete de Presencia en Redes Sociales"
6. **II-02** — Distinguir "Diagnóstico de Presencia Digital" vs. "Auditoría de Conversión Digital"
7. **II-05** — Garantía 30 días en catálogo de paquetes
8. **II-06** — OutreachHistory con campos de trazabilidad
9. **IM-01** — Servicios individuales faltantes
10. **IM-02** — Filtros de dashboard
11. **IM-03** — SalesNote next-action basada en paquete

---

## 12. DECISIONES PENDIENTES DE APROBACIÓN (la web manda)

Estas inconsistencias requieren decisión antes de implementar:

1. **Diagnóstico gratuito vs. de pago:** ¿`digital_presence_audit` ($150–$350) convive con "Auditoría Gratuita" (gratis)? Propuesta: el gratuito es solo exploración/Calendly; el de pago es auditoría formal documentada.
2. **Nombre de servicio diagnóstico interno:** ¿"Diagnóstico de Presencia Digital" o mantener "Auditoría de Presencia Digital"?
3. **Soporte y garantía en propuestas:** ¿Incluir texto de garantía 30 días en los mensajes de outreach o solo en la ficha de paquetes?

*Nota: La implementación procederá con las decisiones más conservadoras que no contradigan la web hasta recibir feedback.*

---

*Auditoría generada el 2026-06-11 — Fase 3.7 · Pre-implementación*
*Fuente web: https://www.kronosdata.tech/ · Commit base: `7755548`*
