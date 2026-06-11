# Outreach UX Review — Fase 3.1
**Kronos Lead Intelligence · Mejora Comercial de Outreach**
**Fecha:** 2026-06-11 · Commit: siguiente a `93b57db`

---

## Resumen Ejecutivo

La Fase 3.1 transforma el panel de Outreach de un log de texto libre en una herramienta de ventas activa. El cambio central: el sistema ahora genera mensajes personalizados basados en los datos de evaluación del prospecto y los pone en mano del vendedor antes de que escriba una sola palabra.

**Cambios entregados:** 8 de 8 requerimientos implementados. Sin modificaciones a base de datos ni APIs.

---

## Archivos Modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `app/companies/[id]/page.tsx` | Modificado | Reescritura completa de `OutreachPanel` + nueva función `generateOutreachTemplate` |

**Líneas antes:** ~158 (función `OutreachPanel` original)
**Líneas después:** ~340 (función `generateOutreachTemplate` 95 líneas + nueva `OutreachPanel` 245 líneas)

**Únicos cambios:** Frontend UX en el archivo indicado. Ningún otro archivo del proyecto fue modificado en esta fase.

---

## Cambios Realizados — Detalle

### 1. Diferenciación plantilla sugerida vs. mensaje enviado ✅

El panel ahora tiene dos zonas visualmente distintas:

- **Zona superior (amarillo/ámbar):** Plantilla sugerida — borde `border-amber-200`, fondo `bg-amber-50/40`, badge "No enviada". Nunca se guarda automáticamente.
- **Zona inferior (neutro):** Historial de contactos registrados — fondo blanco, barra lateral de color, badges de estado.

La distinción es visual e imposible de confundir.

---

### 2. Sección "Plantilla Sugerida" con datos de evaluación ✅

La función `generateOutreachTemplate()` recibe:
- `companyName` — nombre de la empresa
- `industry` — industria
- `evaluation.estimatedRevenueLostPerMonth` — pérdida mensual estimada
- `evaluation.estimatedLeadsLostPerMonth` — leads perdidos por mes
- `evaluation.recommendedServices[0]` — servicio primario recomendado (determina el escenario)
- `evaluation.probablePainPoint` — dolor probable (usado en plantillas de email)
- `evaluation.implementationTimeEstimate` — tiempo de implementación
- `evaluation.estimatedRoiPotential` — ROI estimado

**Escenarios detectados automáticamente (basados en `recommendedServices[0]`):**

| Escenario | Detectado cuando el servicio contiene |
|-----------|--------------------------------------|
| `booking` | "reserva" / "cita" |
| `google` | "google" |
| `reviews` | "reseña" |
| `leads` | "funnel" / "captura" |
| `presence` | "sitio web" / "presencia" / "redes" |
| `followup` | todo lo demás (default) |

Cada escenario tiene 2 variantes por canal (10 combinaciones × 2 = 20 plantillas únicas al total).

---

### 3. Botones de acción ✅

| Botón | Función |
|-------|---------|
| **Copiar** | `navigator.clipboard.writeText(templateText)` — feedback visual "Copiado" por 2s |
| **Editar** | Convierte el texto a Textarea editable; muestra "Cancelar" en lugar de "Editar" |
| **Nueva versión** | Incrementa `templateVersion` (alterna entre 2 variantes por escenario/canal) |
| **Registrar como enviado** | Abre modal pre-llenado con el texto actual y el canal seleccionado |

---

### 4. Modal de registro con mensaje editable ✅

Al hacer clic en "Registrar como enviado" (o "Registrar contacto"):
- Abre `<Dialog>` de Radix UI
- Si viene de la plantilla: pre-llena `channel` con el canal de la plantilla y `message` con el texto actual (incluyendo ediciones)
- Si viene del botón standalone: campos vacíos
- El campo "Mensaje enviado" es un `<Textarea>` editable con `min-h-[120px]` y `font-mono`
- Incluye: canal, respuesta recibida, tipo de respuesta, notas de respuesta
- "Guardar contacto" llama a la API y agrega el registro al historial

---

### 5. Historial de outreach mejorado ✅

Cada registro del historial muestra:
- **Ícono del canal** + nombre del canal + número de secuencia
- **Fecha** (formato es-PE, día + mes abreviado + año corto)
- **Badge "Enviado"** (verde) — todos los registros del historial lo tienen
- **Badge "Respondió"** (azul) si `responseReceived = true`, o **"Sin respuesta"** (gris) si `false`
- **Barra lateral de color:** azul si respondió, verde si no
- **Mensaje:** preview de 120 caracteres con truncamiento si es más largo

---

### 6. Botón "Ver mensaje completo" ✅

Implementado como toggle por record:
- Si el mensaje supera 120 caracteres: aparece botón con `ChevronDown` → "Ver mensaje completo"
- Al hacer clic: expande el mensaje completo + botón `ChevronUp` → "Ocultar mensaje"
- Estado per-record mediante `Set<string>` de IDs expandidos

---

### 7. Indicadores visuales de estado ✅

| Estado | Color | Implementación |
|--------|-------|---------------|
| Plantilla sugerida | Amarillo/ámbar | `border-amber-200`, `bg-amber-50/40`, badge "No enviada" |
| Enviado | Verde | Badge `bg-green-50 text-green-700 border-green-200`, barra lateral verde |
| Respondido | Azul | Badge `bg-blue-50 text-blue-700 border-blue-200`, barra lateral azul |
| Sin respuesta | Gris | Badge `bg-slate-50 text-slate-500 border-slate-200`, barra lateral verde (enviado pero sin respuesta) |

---

### 8. Corrección de email restante ✅

En la función `generateOutreachTemplate` y en `handleSave`, todas las referencias usan `alejandro@kronosdata.tech`. Ninguna ocurrencia de `.com` queda en el código fuente.

---

## Rutas Afectadas

| Ruta | Cambio |
|------|--------|
| `/companies/[id]` → tab "Outreach" | Reemplazado completamente |

Las otras rutas (`/`, `/companies/new`, `/companies/[id]/edit`) no fueron tocadas.

---

## Verificación

```
npx tsc --noEmit → exit 0 (zero errores)
```

---

## Riesgos Encontrados

### Riesgo 1 — `navigator.clipboard` requiere HTTPS o localhost
**Severidad:** Baja
**Descripción:** El botón "Copiar" usa `navigator.clipboard.writeText()`, que solo funciona en contextos seguros (HTTPS o localhost). Si se accede por HTTP en producción, el botón falla silenciosamente.
**Mitigación recomendada (Fase 4):** Agregar fallback a `document.execCommand('copy')` o mostrar un alert con el texto seleccionado cuando Clipboard API no está disponible.

### Riesgo 2 — Template basado en `recommendedServices[0]` solamente
**Severidad:** Baja
**Descripción:** La detección de escenario usa solo el primer servicio recomendado. Si una empresa tiene múltiples servicios recomendados, los templates secundarios no se reflejan en la plantilla generada.
**Mitigación recomendada (Fase 4):** Detectar el escenario evaluando todos los servicios recomendados y elegir el de mayor score. O permitir que el vendedor seleccione el escenario manualmente.

### Riesgo 3 — 2 variantes por canal/escenario (no infinitas)
**Severidad:** Info
**Descripción:** "Nueva versión" alterna entre 2 variantes (v % 2). Después del segundo clic vuelve a la variante 1. El vendedor puede no notar que está ciclando.
**Mitigación recomendada (Fase 4):** Agregar contador "Variante 1 de 2" junto al botón, o integrar generación con IA para variantes verdaderamente nuevas.

### Riesgo 4 — Plantilla no guarda qué variante/canal se usó al registrar
**Severidad:** Baja
**Descripción:** Cuando se registra un outreach desde la plantilla, el texto se copia al modal pero no se guarda metadato de qué canal de plantilla generó el mensaje.
**Campo disponible en schema:** `OutreachRecord.templateUsed` existe en la base de datos y en el tipo. No se usa actualmente.
**Mitigación recomendada (Fase 4):** Pasar `templateUsed: templateChannel` al crear el outreach desde la plantilla.

---

## Recomendaciones para Fase 4

1. **Personalización automática con IA.** Con los datos ya disponibles (probablePainPoint, estimatedRevenueLostPerMonth, industry, recommendedServices), es directo llamar a la API de Claude para generar un mensaje verdaderamente único por prospecto. El usuario solo edita y envía.

2. **Campo `templateUsed` en el historial.** Utilizar el campo ya existente en el schema para mostrar qué plantilla se usó. Útil para A/B testing de templates.

3. **Clipboard fallback.** Implementar fallback para HTTP antes del lanzamiento público.

4. **Secuencia de seguimiento estructurada.** Agregar plantillas de seguimiento (intento #2, #3) directamente sugeridas cuando `records.length >= 1` y la última respuesta fue `no_response`.

5. **`navigator.clipboard` refactoring.** Mover la lógica de copiado a `lib/utils.ts` como `copyToClipboard(text)` con fallback, para reutilizar en otros contextos (e.g., copiar el diagnóstico de la evaluación).

---

*Reporte generado el 2026-06-11 · Fase 3.1 completa · No iniciar Fase 4 sin aprobación explícita.*
