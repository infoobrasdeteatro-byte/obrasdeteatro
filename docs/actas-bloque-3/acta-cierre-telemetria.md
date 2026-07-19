# ACTA DE CIERRE OFICIAL DE COMPONENTE
## Telemetría (Servicio de Plataforma)

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** D — Instrumentación, primer componente
**Componente:** Telemetría — **v1, mecanismo general de instrumentación**
**Estado anterior:** Plan Técnico diseñado y confirmado, con una comprobación adicional resuelta antes de implementar (`profileId` explícito en ambas firmas, verificado contra el patrón ya consolidado de identidad-en-el-borde)
**Estado resultante:** IMPLEMENTADO · VALIDADO · CERRADO

---

### 1. Objeto del Acta

Certifica la finalización de la implementación de Telemetría, primer componente de la Fase D, materializando el Plan Técnico confirmado: mecanismo general de recolección de métricas, deliberadamente no diseñado alrededor de ningún productor concreto, con vocabulario de métrica abierto y tabla propia.

### 2. Alcance implementado

- **Migración** (`supabase/migrations/20260718000000_telemetry_metrics.sql`): tabla `telemetry_metrics` (`id`, `profile_id` con `ON DELETE SET NULL`, `metric_name` con `CHECK (length > 0)` — sin catálogo cerrado —, `metric_value`, `metric_unit`, `tags jsonb`, `recorded_at`), RLS con políticas `INSERT`/`SELECT`, ambas `auth.uid() = profile_id` — mismo modelo de sesión ya congelado, sin política de `UPDATE` (las métricas son hechos inmutables, sin semántica de cola).
- **Ampliación aditiva de Repository Layer** (`lib/repository-layer/telemetry.ts`): `recordMetric(profileId, metric)`, `listMetrics(profileId, filter?)` — sin reutilizar `nucleo_activity_log` (tabla propia, considerado y descartado explícitamente en el Plan Técnico por acoplamiento conceptual).
- **Módulo `lib/telemetria/`**: `recordMetric()` — nunca lanza, degrada a `false` (mismo principio de `recordActivity()`, aplicado por primera vez fuera de Procesos Asíncronos); `listMetrics()` — delegación directa, sin transformación adicional (no hace falta narrowing de tipos, a diferencia de Procesos Asíncronos, porque `MetricEntry` no tiene ningún campo de vocabulario cerrado que estrechar).
- **Actualización de `types/supabase.ts`**: entrada `telemetry_metrics` añadida al tipo `Database` generado, mismo patrón ya usado para `nucleo_activity_log`/`credit_reservations`.

### 3. Refinamiento sobre el Plan Técnico, con justificación explícita

El Plan Técnico original sugería `recordMetric(profileId, metric): Promise<void>`. Durante la implementación se adoptó `Promise<boolean>`, nunca-lanza (mismo patrón exacto de `recordActivity()` de Procesos Asíncronos): Telemetría ocupa la misma posición en el pipeline que Procesos Asíncronos (registro de lado, tras un resultado ya construido) — un fallo al registrar una métrica no debe interrumpir el flujo que la invoca. No se trata como reapertura del Plan Técnico (no cambia contrato público de datos, ni persistencia, ni responsabilidades) — es la aplicación directa de un precedente ya aprobado a un componente en la misma posición arquitectónica.

### 4. Hallazgo detectado y corregido durante la implementación (antes de ejecutar pruebas)

Un hallazgo real de diseño de consulta, autodetectado antes de escribir el primer test: la primera versión de `listMetrics` omitía `.limit()` cuando no se solicitaba límite explícito — divergía del patrón ya establecido en `listActivityHistory`/`listPendingActivity`, que siempre terminan en `.limit()` con un valor por defecto. Corregido a `filter.limit ?? 50`, siempre invocado. No se asigna numeración RA-xxx (detectado y corregido antes de ejecutar ninguna prueba, sin llegar a manifestarse como fallo).

### 5. Verificación contra la tabla de materialización del Plan Técnico

| Frontera ya congelada | Verificación |
|---|---|
| Mecanismo general, uso exclusivo de Observabilidad | `listMetrics` sin ninguna restricción de forma; `contract-invariants.test.ts` verifica que el módulo no importa `@/lib/observabilidad` ni `@/lib/analitica` |
| No consume `ExecutionAudit` | Cero dependencia de `lib/ai-gateway`; `MetricInput` no tiene ningún campo de ese tipo; test explícito que rechaza cualquier mención a `ExecutionAudit` en el código del módulo |
| Colección, no consolidación | `listMetrics` devuelve entradas crudas (`MetricEntry[]`), sin ninguna operación de agregación |
| Reutilizable por toda ObrasDeTeatro®, vocabulario abierto | `metric_name` sin `CHECK` contra catálogo cerrado — solo validación estructural (no vacío) |

### 6. Pruebas realizadas

- 211/211 pruebas superadas (56 archivos, 8 nuevos/ampliados: `telemetry.test.ts` en Repository Layer — incluyendo el caso que verifica que el límite por defecto se aplica siempre —, `record-metric.test.ts`, `list-metrics.test.ts` y `contract-invariants.test.ts` en `lib/telemetria/`, y el `contract-invariants.test.ts` de Repository Layer ampliado con el bloque de `telemetry.ts`).
- `tsc --noEmit` limpio (tras corregir un desajuste de tipos entre `Json` generado por Supabase y `Record<string, string>`, resuelto con el mismo patrón de estrechamiento explícito ya usado para `response_type`).
- `eslint` sin errores nuevos (solo warnings preexistentes en `test-utils.ts`).

### 7. Incidencias y validaciones abiertas asociadas

Ninguna nueva. Hereda VD-001/VD-002 (propagación de sesión y verificación dinámica de RLS, no probadas contra un proyecto Supabase real) por el mismo motivo que el resto del proyecto.

### 8. Veredicto

Telemetría queda oficialmente declarada **IMPLEMENTADA · VALIDADA · CERRADA** — mecanismo general de instrumentación, sin acoplamiento a ningún productor actual, tan desacoplado en su diseño como Repository Layer o Procesos Asíncronos: ambas operaciones (`recordMetric`/`listMetrics`) son agnósticas a quién las invoque, y el propio módulo no conoce ni depende de Observabilidad ni de Analítica.

### 9. Autorización para continuar

Observabilidad puede abrir su propio Plan Técnico apoyándose en un mecanismo de recolección ya completo y cerrado. Queda explícitamente señalada, sin resolverla aquí, la pregunta que el propio Plan Técnico de Telemetría dejó abierta: si Observabilidad necesita agregar métricas entre usuarios (monitorización de plataforma, no de una sola persona), el modelo de sesión `auth.uid() = profile_id` no lo permite tal como está — misma naturaleza de pregunta que ya identificó a Analítica como candidata de reapertura en la investigación de ejecución en segundo plano de la Fase C.
