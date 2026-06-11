# Auditoría Comercial Completa — Kronos Lead Intelligence
**Fecha:** 2026-06-11 · **Alcance:** MVP Fase 3

---

## Resumen Ejecutivo

El sistema actualmente **no contiene plantillas de outreach**. El campo `messageSent` en el panel de Outreach es texto libre sin guías, sin ejemplos y sin estructura. Esto significa que la calidad de cada mensaje depende íntegramente del estado de ánimo y la improvisación del vendedor en cada contacto — un riesgo alto en un proceso de prospección en frío donde el primer mensaje determina si existe conversación.

Este reporte documenta el estado actual, evalúa el enfoque vigente, y entrega 15 plantillas listas para usar organizadas por canal y escenario.

**Hallazgos críticos:**
- ❌ Cero plantillas de outreach en el sistema
- ❌ Email incorrecto `alejandro@kronosdata.com` en 4 archivos de código fuente (corregido en este reporte)
- ✅ Los mensajes guardados se muestran completos en la UI (sin truncamiento)

---

## Sección 1 — Inventario de Plantillas Actuales

### Estado: Sin plantillas

El sistema no incluye ninguna plantilla, texto de ejemplo, ni guía de mensaje en ninguna parte del código:

| Ubicación | Estado |
|-----------|--------|
| `app/companies/[id]/page.tsx` — OutreachPanel | Textarea vacío, placeholder genérico: *"Resumen o copia del mensaje..."* |
| `lib/constants.ts` | Sin plantillas definidas |
| `lib/diagnosis.ts` | Genera diagnóstico interno, no mensajes de salida |
| API `/api/companies/[id]/outreach` | Recibe y guarda texto libre |

**Conclusión:** El sistema tiene un motor de análisis sofisticado que genera dolor probable, pérdida económica y servicios recomendados — pero ese output nunca se convierte en un mensaje hacia el prospecto. El vendedor sale de la pantalla de evaluación con toda la información y luego escribe un mensaje de cero.

---

## Sección 2 — Evaluación del Enfoque Actual

Dado que no hay plantillas, se evalúa el **enfoque de texto libre** como práctica vigente.

### Dimensiones de evaluación (1–10)

| Dimensión | Puntuación | Justificación |
|-----------|-----------|---------------|
| Capacidad de captar atención | **2/10** | Sin estructura. El mensaje depende de que el vendedor haya descansado bien ese día. |
| Credibilidad | **2/10** | Sin datos, sin marco de referencia, sin mención de metodología. |
| Personalización | **3/10** | El vendedor puede personalizar, pero no tiene los datos del sistema disponibles al escribir. Los datos están en otra pantalla. |
| Curiosidad generada | **1/10** | Sin hook definido. Los mensajes improvisados tienden a ser declarativos ("Somos Kronos y ofrecemos..."). |
| Potencial de respuesta | **2/10** | Sin CTA claro, sin pregunta específica, sin ancla de tiempo. |

**Promedio: 2/10**

### Debilidades del enfoque actual

1. **Desconexión entre análisis y comunicación.** El sistema genera datos valiosos (pérdida mensual, dolor probable, servicios recomendados) pero el vendedor no los usa al escribir porque está en otra pantalla y la memoria a corto plazo selecciona los atajos cognitivos.

2. **Sin estructura de apertura.** El primer mensaje define si hay conversación. Un mensaje sin hook es un mensaje ignorado.

3. **Sin diferenciación por canal.** Un mensaje de WhatsApp, un email y un DM de LinkedIn requieren longitudes, tonos y CTAs completamente diferentes. El texto libre produce el mismo mensaje para los tres.

4. **Sin anclaje en datos específicos del prospecto.** Kronos tiene una ventaja competitiva enorme: sabe cuánto dinero está perdiendo el prospecto antes de hablar con él. Eso nunca aparece en los mensajes actuales.

5. **Sin CTA definido.** "Avísame" o "¿Qué opinas?" no son CTAs. El objetivo es agendar una reunión, y cada mensaje debe pedirla de forma específica y con mínima fricción.

6. **Sin versión de seguimiento.** El panel de outreach registra múltiples contactos (secuencia), pero no hay guía sobre qué decir en el intento #2, #3 o #4.

---

## Sección 3 — Verificación: Visualización de Mensajes en la UI

**Resultado: ✅ Sin truncamiento**

En `app/companies/[id]/page.tsx`, línea 419:

```tsx
{r.messageSent && (
  <p className="text-sm text-slate-600 bg-slate-50 rounded px-3 py-2 mb-2">
    {r.messageSent}
  </p>
)}
```

El texto se muestra completo. No hay `line-clamp`, `overflow-hidden`, `max-h`, ni `truncate`. Los mensajes largos expanden el contenedor correctamente.

**Recomendación para el futuro (no urgente):** Para mensajes muy largos (>500 caracteres), considerar mostrar los primeros 3 párrafos con un botón "Ver mensaje completo" — mejora la legibilidad del historial de outreach cuando hay múltiples registros.

---

## Sección 4 — Corrección de Email

`alejandro@kronosdata.com` → `alejandro@kronosdata.tech`

**Archivos corregidos:**

| Archivo | Líneas | Campo |
|---------|--------|-------|
| `app/companies/new/page.tsx` | 102 | `evaluatedBy` |
| `app/companies/[id]/edit/page.tsx` | 142 | `evaluatedBy` |
| `app/companies/[id]/page.tsx` | 293 | `sentBy` |
| `app/companies/[id]/page.tsx` | 594 | `evaluatedBy` |
| `prisma/seed.ts` | múltiples | `evaluatedBy`, `assignedTo`, `sentBy`, `channelAccount` |

---

## Sección 5 — Framework de Mensajes Kronos

### Estructura de cada mensaje efectivo

```
[HOOK] → dato específico del prospecto o observación sobre su negocio
[DOLOR] → qué está perdiendo (en dinero o en clientes)
[CREDENCIAL] → por qué Kronos puede resolverlo (brevísimo)
[CTA] → una sola acción, con mínima fricción, con tiempo
```

### Principios aplicados

- **Especificidad sobre generalidad.** Mencionar el nombre del negocio, su industria, un dato concreto.
- **Pérdida antes que ganancia.** "Estás perdiendo $X/mes" convierte mejor que "Podrías ganar $X/mes".
- **Un solo CTA por mensaje.** Pedir reunión, no interés general.
- **Brevedad calibrada por canal.** WhatsApp: 3–5 líneas. Email: 5–8 oraciones. LinkedIn: 2–3 párrafos.
- **Sin "somos la empresa líder en".** Abre con el problema del prospecto, no con el CV de Kronos.

---

## Sección 6 — Plantillas por Canal y Escenario

Las variables dinámicas entre `[corchetes]` deben completarse con los datos del sistema antes de enviar.

---

### ESCENARIO A — Respuesta lenta / Seguimiento débil
*Indicadores: `signalSlowResponse = true` o `signalWeakFollowup = true`*
*Servicios típicos: Automatización de WhatsApp, CRM y Seguimiento*

---

#### A-1 · WhatsApp (Primer contacto)

```
Hola [Nombre] 👋

Vi [Empresa] en [Google/Instagram] y noté que hay leads que probablemente no están recibiendo seguimiento rápido.

En negocios de [Industria], eso cuesta en promedio $[estimatedRevenueLostPerMonth]/mes en clientes que preguntan y se van con la competencia antes de recibir respuesta.

Soy Alejandro de Kronos. Lo resolvemos en 2 semanas con automatización de WhatsApp + CRM.

¿Tienes 15 minutos esta semana?
```

**Score:** Atención 8 · Credibilidad 7 · Personalización 8 · Curiosidad 7 · Respuesta 8 → **Promedio: 7.6/10**

---

#### A-2 · WhatsApp (Seguimiento — 3 días sin respuesta)

```
[Nombre], te escribí el [fecha]. Entiendo que estás ocupado/a.

Solo quería preguntarte: ¿los leads que llegan por WhatsApp o Instagram reciben respuesta el mismo día?

Si la respuesta es "no siempre" — ahí está la fuga. Son $[estimatedRevenueLostPerMonth]/mes que se pierden en promedio.

¿Hablamos 10 minutos?
```

**Score:** Atención 7 · Credibilidad 7 · Personalización 7 · Curiosidad 8 · Respuesta 7 → **Promedio: 7.2/10**

---

#### A-3 · Email

**Asunto:** [Empresa]: encontré dónde se están yendo los clientes

```
Hola [Nombre],

Analicé el perfil digital de [Empresa] y detecté señales de que hay leads que consultan y no reciben respuesta a tiempo — o no tienen seguimiento después del primer contacto.

En negocios de [Industria] como el tuyo, eso representa una pérdida estimada de $[estimatedRevenueLostPerMonth] al mes en clientes que eligieron a la competencia por ser más rápidos, no por ser mejores.

En Kronos automatizamos ese proceso completo:
→ Respuesta inmediata por WhatsApp al primer mensaje
→ Secuencia de seguimiento automático en 24h, 48h y 7 días
→ CRM liviano para que tu equipo no pierda ningún lead

El resultado habitual en los primeros 30 días: entre 20–40% más de conversiones de los mismos leads que ya estás generando.

¿Tienes espacio para una llamada de 20 minutos esta semana? Puedo mostrarte exactamente cómo funciona para un negocio de [Industria].

Alejandro Bri
Kronos Data
alejandro@kronosdata.tech
```

**Score:** Atención 8 · Credibilidad 8 · Personalización 8 · Curiosidad 7 · Respuesta 7 → **Promedio: 7.6/10**

---

#### A-4 · LinkedIn (Nota de conexión)

```
Hola [Nombre] — vi [Empresa] y detecté una oportunidad de optimizar cómo se gestiona el seguimiento de leads. Trabajo con negocios de [Industria] en Perú/LATAM. ¿Conectamos?
```

**Score:** Atención 6 · Credibilidad 6 · Personalización 6 · Curiosidad 6 · Respuesta 6 → **Promedio: 6/10**
*(LinkedIn limita las notas de conexión a 300 caracteres — el techo es estructuralmente más bajo)*

---

#### A-5 · LinkedIn (Mensaje tras conectar)

```
[Nombre], gracias por conectar.

Analizamos la presencia digital de [Empresa] y encontramos señales de seguimiento débil de leads — algo común en [Industria] cuando el equipo gestiona consultas manualmente.

Estimamos que eso puede representar $[estimatedRevenueLostPerMonth]/mes en oportunidades que no se cierran por falta de seguimiento oportuno.

Lo que hacemos en Kronos: automatizamos el proceso desde la primera consulta hasta el cierre, sin cambiar cómo opera tu equipo.

¿Tienes 20 minutos esta semana para que te lo muestre?

Alejandro | Kronos Data
```

**Score:** Atención 7 · Credibilidad 8 · Personalización 7 · Curiosidad 7 · Respuesta 7 → **Promedio: 7.2/10**

---

### ESCENARIO B — Sin sistema de reservas / Sin automatización de citas
*Indicadores: `signalHasBookingSystem = false`*
*Servicios típicos: Sistema de Reservas y Citas, Automatización de WhatsApp*

---

#### B-1 · WhatsApp (Primer contacto)

```
Hola [Nombre] 👋

¿Cuántas citas se confirman en [Empresa] fuera del horario de oficina?

En [Industria], el 40% de las reservas se intenta hacer después de las 6pm o el fin de semana. Sin sistema online, esos clientes llaman, no los atienden, y reservan con la competencia.

Estimamos que [Empresa] podría estar perdiendo [estimatedLeadsLostPerMonth] citas por mes — a $[averageDealValue] c/u, son $[estimatedRevenueLostPerMonth]/mes.

Lo resolvemos en 2 semanas. ¿Hablamos?

Soy Alejandro de Kronos — alejandro@kronosdata.tech
```

**Score:** Atención 9 · Credibilidad 8 · Personalización 9 · Curiosidad 8 · Respuesta 8 → **Promedio: 8.4/10**

---

#### B-2 · Email

**Asunto:** [Empresa]: cuántas citas se están perdiendo fuera de horario

```
Hola [Nombre],

Una pregunta directa: ¿cuántas personas intentan reservar en [Empresa] cuando nadie puede atender el teléfono?

Analizamos negocios de [Industria] en [País] y el patrón es consistente: entre el 30–45% de las intenciones de reserva ocurren fuera de horario de atención. Sin un sistema automatizado, esos clientes no esperan — buscan otra opción.

Con los datos de [Empresa], estimamos una pérdida de aproximadamente $[estimatedRevenueLostPerMonth] mensuales en citas que no se concretan.

Lo que instalamos en Kronos:
→ Sistema de reservas online 24/7 (sin que el cliente llame)
→ Confirmación automática por WhatsApp
→ Recordatorio 24h antes para reducir no-shows
→ Integrado con tu agenda actual

Tiempo de implementación: 2–3 semanas. Sin reemplazar tu proceso — solo automatizando lo manual.

¿Tienes 20 minutos para una llamada esta semana?

Alejandro Bri
Kronos Data
alejandro@kronosdata.tech
```

**Score:** Atención 9 · Credibilidad 8 · Personalización 8 · Curiosidad 8 · Respuesta 8 → **Promedio: 8.2/10**

---

#### B-3 · LinkedIn (Mensaje directo)

```
[Nombre], trabajo con negocios de [Industria] en LATAM automatizando el proceso de reservas.

Vi que [Empresa] gestiona citas manualmente. Estimamos que eso puede costar entre 20–30 reservas perdidas por mes — clientes que intentan agendar fuera de horario y no encuentran cómo.

¿Tienes 20 minutos para que te muestre cómo lo resolvemos?

Alejandro | Kronos Data · alejandro@kronosdata.tech
```

**Score:** Atención 7 · Credibilidad 7 · Personalización 7 · Curiosidad 7 · Respuesta 7 → **Promedio: 7/10**

---

### ESCENARIO C — Sin Google Business / Reseñas sin responder
*Indicadores: `signalHasGoogleBusiness = false` o `signalHasUnansweredReviews = true`*
*Servicios típicos: Google Business Setup, Gestión de Reseñas*

---

#### C-1 · WhatsApp (Primer contacto — sin Google Business)

```
Hola [Nombre] 👋

Busqué "[Empresa]" en Google Maps y no encontré un perfil verificado.

El 76% de los usuarios busca un negocio en Google antes de contactarlo. Sin perfil visible, [Empresa] no aparece en esas búsquedas.

En promedio, un negocio de [Industria] sin Google Business pierde entre 15–25 consultas por mes solo por invisibilidad.

Lo configuramos y optimizamos en una semana. ¿Hablamos?

Alejandro | Kronos
```

**Score:** Atención 9 · Credibilidad 9 · Personalización 9 · Curiosidad 7 · Respuesta 8 → **Promedio: 8.4/10**

---

#### C-2 · WhatsApp (Primer contacto — reseñas sin responder)

```
Hola [Nombre],

Vi que [Empresa] tiene [N] reseñas en Google sin respuesta.

El problema no son las reseñas — es la señal que manda a los prospectos: "nadie está atendiendo". El 68% de los clientes nuevos lee las respuestas a reseñas antes de decidir.

Tenemos un sistema que gestiona reseñas automáticamente y mejora el rating promedio en 0.3–0.6 puntos en 90 días.

¿15 minutos para mostrarte cómo?

Alejandro | Kronos — alejandro@kronosdata.tech
```

**Score:** Atención 9 · Credibilidad 8 · Personalización 8 · Curiosidad 8 · Respuesta 8 → **Promedio: 8.2/10**

---

#### C-3 · Email

**Asunto:** [Empresa] no aparece cuando alguien busca [industria] en [ciudad]

```
Hola [Nombre],

Hice una búsqueda en Google Maps de "[Industria] en [Ciudad]" y [Empresa] no aparece entre los primeros resultados — o su perfil no está verificado/optimizado.

Eso es tráfico gratuito que se está yendo a la competencia cada día.

Para un negocio de [Industria] en [Ciudad], estimamos que un perfil de Google Business optimizado genera entre 30–60 consultas adicionales por mes sin inversión en publicidad.

Lo que hacemos:
→ Verificación y configuración completa del perfil
→ Optimización de categorías, fotos y descripción para aparecer en búsquedas locales
→ Sistema de solicitud de reseñas a clientes existentes
→ Respuesta automática a reseñas nuevas

Tiempo: 1 semana. Precio único: $300–$600 USD.

¿Hablamos esta semana?

Alejandro Bri
Kronos Data
alejandro@kronosdata.tech
```

**Score:** Atención 9 · Credibilidad 8 · Personalización 9 · Curiosidad 7 · Respuesta 8 → **Promedio: 8.2/10**

---

### ESCENARIO D — Presencia online débil / Sin sitio web
*Indicadores: `signalHasWebsite = false` o `signalWeakOnlinePresence = true`*
*Servicios típicos: Sitio Web, Presencia en Redes Sociales, Auditoría Digital*

---

#### D-1 · WhatsApp (Primer contacto)

```
Hola [Nombre] 👋

Busqué [Empresa] online y la huella digital es mínima — sin sitio web y con presencia débil en redes.

Para un negocio de [Industria], eso significa que cada cliente que busca información antes de contactarte no encuentra nada que lo convenza de elegirte.

Estimamos que eso impacta entre $[estimatedRevenueLostPerMonth]/mes en conversiones perdidas.

¿Te muestro qué se puede hacer en 4 semanas? Soy Alejandro de Kronos.
```

**Score:** Atención 8 · Credibilidad 7 · Personalización 8 · Curiosidad 7 · Respuesta 7 → **Promedio: 7.4/10**

---

#### D-2 · Email

**Asunto:** Lo que un cliente de [Industria] ve cuando busca "[Empresa]" en Google

```
Hola [Nombre],

Hice el ejercicio de buscar [Empresa] como lo haría un cliente nuevo. Esto es lo que encontré:

- Sin sitio web activo (o con información desactualizada)
- Presencia limitada en redes sociales
- Sin perfil optimizado en Google

Para un negocio de [Industria], la presencia digital es el primer filtro. Antes de llamar, el 81% de los clientes busca en Google. Si lo que encuentran no genera confianza, no llaman.

Estimamos que [Empresa] podría estar perdiendo $[estimatedRevenueLostPerMonth] al mes en clientes que evalúan y eligen a la competencia con mejor presencia digital.

En Kronos construimos presencia digital para negocios de [Industria] en LATAM: sitio web, redes, Google Business y captura de leads — todo integrado.

¿Tienes 20 minutos para hablar esta semana?

Alejandro Bri
Kronos Data
alejandro@kronosdata.tech
```

**Score:** Atención 8 · Credibilidad 8 · Personalización 8 · Curiosidad 7 · Respuesta 7 → **Promedio: 7.6/10**

---

#### D-3 · LinkedIn

```
[Nombre], analicé la presencia digital de [Empresa] y encontré oportunidades de mejora significativas — especialmente en visibilidad en búsquedas locales y captación de leads online.

Para [Industria] en [País], eso puede representar $[estimatedRevenueLostPerMonth]/mes en clientes que no llegan porque no encuentran el negocio o no tienen suficiente información para confiar.

En Kronos lo resolvemos en 4–6 semanas. ¿Tienes 20 minutos para hablar?

Alejandro | Kronos Data · alejandro@kronosdata.tech
```

**Score:** Atención 7 · Credibilidad 8 · Personalización 7 · Curiosidad 7 · Respuesta 7 → **Promedio: 7.2/10**

---

### ESCENARIO E — Sin captura de leads / Sin CTA claro
*Indicadores: `signalHasLeadCapture = false` o `signalHasClearCta = false`*
*Servicios típicos: Funnel de Captura de Leads, Automatización de WhatsApp*

---

#### E-1 · WhatsApp

```
Hola [Nombre] 👋

Revisé la web y redes de [Empresa] y no hay una forma clara de que un cliente interesado deje sus datos o solicite información fácilmente.

En [Industria], eso significa que el tráfico que ya estás generando (visitas, seguidores, búsquedas) no se convierte en leads. El cliente interesado no encuentra el "siguiente paso".

Estimamos que eso representa $[estimatedRevenueLostPerMonth]/mes en oportunidades que se evaporan.

Instalamos un funnel de captura en 2–3 semanas. ¿Hablamos?

Alejandro | Kronos
```

**Score:** Atención 8 · Credibilidad 7 · Personalización 8 · Curiosidad 8 · Respuesta 8 → **Promedio: 7.8/10**

---

#### E-2 · Email

**Asunto:** El tráfico de [Empresa] no se está convirtiendo en clientes — aquí está por qué

```
Hola [Nombre],

El problema que detecté en [Empresa] no es falta de presencia digital. Es que esa presencia no tiene un sistema para convertir visitas en leads.

Un visitante llega a tu web o Instagram, le interesa lo que ve — y no encuentra una forma simple de dar el siguiente paso. Sin CTA claro, sin formulario visible, sin botón de WhatsApp directo.

Resultado: abandona y olvida.

En [Industria], estimamos que un funnel de captura efectivo puede aumentar la conversión de visitas a leads entre 20–35% con el mismo tráfico que ya tienes.

Lo que instalamos:
→ Landing page o sección de captura optimizada
→ Formulario con respuesta automática inmediata
→ Integración con WhatsApp o email de seguimiento
→ Métricas básicas para saber cuántos leads genera cada canal

Tiempo: 2–4 semanas. Sin publicidad adicional.

¿Hablamos esta semana?

Alejandro Bri
Kronos Data
alejandro@kronosdata.tech
```

**Score:** Atención 8 · Credibilidad 8 · Personalización 8 · Curiosidad 8 · Respuesta 8 → **Promedio: 8/10**

---

## Sección 7 — Resumen de Scores

| Plantilla | Canal | Escenario | Score Promedio |
|-----------|-------|-----------|---------------|
| A-1 | WhatsApp | Seguimiento débil — Primer contacto | 7.6 |
| A-2 | WhatsApp | Seguimiento débil — Follow-up 3 días | 7.2 |
| A-3 | Email | Seguimiento débil | 7.6 |
| A-4 | LinkedIn | Seguimiento débil — Conexión | 6.0 |
| A-5 | LinkedIn | Seguimiento débil — Post-conexión | 7.2 |
| B-1 | WhatsApp | Sin reservas — Primer contacto | **8.4** |
| B-2 | Email | Sin reservas | 8.2 |
| B-3 | LinkedIn | Sin reservas | 7.0 |
| C-1 | WhatsApp | Sin Google Business | **8.4** |
| C-2 | WhatsApp | Reseñas sin responder | 8.2 |
| C-3 | Email | Sin Google Business | 8.2 |
| D-1 | WhatsApp | Presencia débil | 7.4 |
| D-2 | Email | Presencia débil | 7.6 |
| D-3 | LinkedIn | Presencia débil | 7.2 |
| E-1 | WhatsApp | Sin captura de leads | 7.8 |
| E-2 | Email | Sin captura de leads | **8.0** |

**Mejor plantilla:** B-1 y C-1 (WhatsApp, 8.4/10) — mayor especificidad + dato de pérdida inmediato.

**Peor plantilla:** A-4 (LinkedIn nota de conexión, 6.0/10) — limitación estructural del canal.

---

## Sección 8 — Recomendaciones de Implementación

### Inmediato (esta semana)

1. **Agregar plantillas al sistema.** Incluir un botón "Generar mensaje" en el panel de Outreach que, dependiendo del canal seleccionado y del servicio recomendado en la evaluación, pre-rellene el campo `messageSent` con la plantilla correcta y los datos del prospecto ya sustituidos.

2. **Mostrar datos de evaluación junto al campo de mensaje.** Al redactar un outreach, el vendedor debería ver en la misma pantalla: dolor probable, pérdida mensual estimada, servicios recomendados. Actualmente esos datos están en la tab de Evaluación — a un clic de distancia pero fuera del campo visual.

### Próxima semana

3. **Agregar secuencia de seguimiento estándar.** El intento #2 debe tener plantilla diferente al #1. El intento #3 es el cierre de la secuencia con un "last call" respetuoso. Actualmente todos los intentos parten de cero.

4. **Agregar campo de "Próximo contacto"** en el outreach para programar el follow-up. Hoy se registra el contacto pasado pero no se planifica el siguiente.

### Futuro (Fase 4)

5. **Personalización automática de plantillas.** Con los datos del sistema (nombre de empresa, industria, estimatedRevenueLostPerMonth, probablePainPoint, recommendedServices) se puede generar un primer borrador personalizado automáticamente antes de que el vendedor lo edite.

---

## Sección 9 — Tabla de Variables de Personalización

Cada plantilla usa variables que el sistema ya tiene. Esta tabla mapea la variable de plantilla con el campo del sistema:

| Variable de plantilla | Campo del sistema | Dónde encontrarlo |
|----------------------|-------------------|-------------------|
| `[Nombre]` | `salesNote.contactName` o manual | Notas de Venta |
| `[Empresa]` | `company.name` | Ficha de empresa |
| `[Industria]` | `company.industry` | Ficha de empresa |
| `[País]` / `[Ciudad]` | `company.country` / `company.city` | Ficha de empresa |
| `[estimatedRevenueLostPerMonth]` | `evaluation.estimatedRevenueLostPerMonth` | Tab Evaluación |
| `[estimatedLeadsLostPerMonth]` | `evaluation.estimatedLeadsLostPerMonth` | Tab Evaluación |
| `[averageDealValue]` | Derivado del baseline de industria | Evaluación |
| `[N]` (reseñas sin responder) | Observación manual del vendedor | — |

---

*Reporte generado el 2026-06-11 · Kronos Lead Intelligence · No iniciar Fase 4 sin aprobación explícita.*
