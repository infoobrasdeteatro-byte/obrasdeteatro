# ACTA DE VERIFICACIÓN DOCUMENTAL — APERTURA DE FASE D

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** D — Instrumentación
**Fecha:** 2026-07-18

---

### 1. Objeto del Acta

Certifica el resultado de la Verificación Documental previa a la Fase D (delimitación de alcance, componentes, responsabilidades, y qué parte de su arquitectura ya está congelada frente a qué requiere nuevas decisiones), sin Plan Técnico ni implementación — mismo procedimiento ya consolidado en la apertura de las Fases B y C.

### 2. Delimitación del alcance de la Fase D

Según el Plan Maestro (orden ya corregido tras la auditoría de 2026-07-13): **Telemetría → Observabilidad → Analítica**, en ese orden de dependencia real — no el orden documental original, que listaba Observabilidad antes que Telemetría invirtiendo la dependencia (Observabilidad se apoya en el mecanismo de Telemetría, no al revés).

Los tres son **Servicios de Plataforma** (SC-005) — nunca participan en el flujo síncrono del Núcleo, nunca son conocidos ni dependidos por él (mismo principio ya aplicado a Procesos Asíncronos, DT-003 por analogía de capa, aunque estos tres no están sujetos a DT-003 en sí, que es específica de la relación Núcleo↔Dominios Funcionales).

### 3. Componentes y responsabilidades

| Componente | Misión congelada | Consume | Autorizado a |
|---|---|---|---|
| **Telemetría** | Mecanismo técnico de recolección de métricas | — (no consume `ExecutionAudit` directamente) | Servir su mecanismo **exclusivamente** a Observabilidad |
| **Observabilidad** | Trazabilidad/monitorización/diagnóstico técnico de la actividad ya producida por el Núcleo | `ExecutionAudit`, bajo su categoría propia ("Observabilidad") | Apoyarse en el mecanismo de Telemetría |
| **Analítica** | Interpretación de negocio sobre la actividad técnica ya registrada | `ExecutionAudit`, bajo su categoría propia ("Analítica") | Nada adicional — **no** autorizada a usar el mecanismo de Telemetría |

`ExecutionAudit` (SC-004.7 revisado) tiene 5 categorías de consumidor autorizado en su documento de origen: Auditoría, Monitorización, Observabilidad, Analítica, Diagnóstico técnico — más Accounting Engine, añadido después para la liquidación económica (reapertura de SC-004.5/SC-004.7). Observabilidad y Analítica son, respectivamente, los Servicios de Plataforma oficiales que operacionalizan dos de esas cinco categorías.

### 4. Qué queda congelado (Nivel 1), verificado contra el registro documental de la transferencia

- Las tres misiones y sus fronteras mutuas (tabla anterior).
- La dirección real de la dependencia Observabilidad→Telemetría (corregida explícitamente en su momento; el diagrama original la dibujaba al revés).
- Analítica **no** está autorizada a apoyarse en el mecanismo de Telemetría — verificado explícitamente durante el cierre de Bloque II: una primera versión de Analítica lo afirmaba y fue corregida por no tener respaldo en el texto congelado de Telemetría, que solo nombra a Observabilidad.
- Ni Observabilidad ni Analítica están autorizadas a consultar `DecisionContext`/`DecisionRationale` — vacío diferido explícito, documentado en su momento, no ampliado desde entonces.
- Ninguno de los tres modifica ni depende directamente de ningún contrato del Núcleo — solo consumen `ExecutionAudit`, ya producido por AI Gateway como rama paralela al flujo funcional.

### 5. Qué requiere decisión nueva o verificación adicional — hallazgos de esta Verificación

**5.1 — Especificación de Telemetría más escueta que la del resto de componentes (no bloqueante, precedente ya existente).** A diferencia de los documentos del Núcleo (con Entradas/Salidas/Criterios de aceptación detallados), el registro congelado de Telemetría se limita a su misión y a la corrección de un diagrama — no especifica de qué fuente concreta recolecta métricas, ni la forma exacta de lo que entrega a Observabilidad. Mismo tratamiento ya aceptado para Subsistemas de Aprendizaje (declarado "deliberadamente mínimo" en su cierre) — no se trata como incidencia, pero implica que el Plan Técnico de Telemetría tendrá que fijar más detalle de implementación del que fijaron los componentes anteriores, dentro de los márgenes ya congelados (mecanismo genérico, uso exclusivo de Observabilidad).

**5.2 — `ExecutionAudit` no lleva ningún identificador de correlación, verificado contra el tipo real del código** (`lib/ai-gateway/types.ts`): sus 6 campos son exclusivamente técnicos (`providerIdentifier`, `providerModel`, `executionLatencyMs`, `tokensConsumed`, `realExecutionCost`, `technicalMetadata`) — ninguno es `requestId`. Coherente con el propio texto congelado de DT-001, que excluye expresamente a Observabilidad/Telemetría/Analítica de su alcance ("no define... ni herramientas de trazado"). **No es una contradicción** — es una limitación real y ya prevista: cualquier evento que Observabilidad o Analítica procesen hoy no podrá correlacionarse con la petición de usuario que lo originó, salvo que un futuro documento lo autorice explícitamente. Se señala para que el Plan Técnico de cada componente lo asuma desde el diseño, no lo descubra después.

**5.3 — Verificado contra el código real: ningún componente del Núcleo está orquestado de extremo a extremo en ninguna ruta de la aplicación.** Búsqueda explícita en `app/`: cero invocaciones a `executeAIRequest` (AI Gateway) y cero invocaciones a `recordActivity` (Procesos Asíncronos, ya cerrado en Fase C). Todo el pipeline —Núcleo completo más Procesos Asíncronos— existe únicamente como módulos de librería, verificados por sus propios tests, nunca conectados entre sí por una ruta real de Next.js. Esto **no es un hallazgo nuevo de la Fase D** — es una característica consistente de todo el Bloque III hasta la fecha, que nunca impidió cerrar ningún componente anterior (cada uno se validó contra el contrato de su dependencia inmediata, no contra un flujo en vivo). Consecuencia directa para Fase D: hoy no existe ningún productor real de `ExecutionAudit` en ejecución — situación ya aceptada y nombrada parcialmente por **IA-006** (sin integración real de proveedores de IA, campos técnicos de `ExecutionAudit` siempre `null`) e **IA-007** (nadie tiene asignada la responsabilidad de enrutar `ExecutionAudit`, hoy limitada en su redacción a la liquidación de Accounting Engine). Se deja constancia de que el vacío de IA-007 es, en realidad, más amplio de lo que su redacción original sugiere: afecta a **cualquier** consumidor de `ExecutionAudit`, no solo a Accounting Engine — Telemetría/Observabilidad/Analítica heredan exactamente el mismo vacío. No se propone ampliar el texto de IA-007 sin autorización expresa; se dejan constancia y referencia cruzada.

### 6. Por qué ninguno de estos hallazgos bloquea el inicio del Plan Técnico

Los tres son del mismo tipo ya aceptado repetidamente en Fase B (AI Gateway sin proveedor real, Decision Engine con `estimatedCost` siempre `null`, Response Composer con dos ramas nunca alcanzadas hoy): contratos correctamente diseñados y probados contra su propia especificación, sin necesitar que su productor/consumidor real esté ya en producción. Telemetría puede diseñarse y construirse contra el contrato de `ExecutionAudit` tal como existe hoy (con datos de prueba, igual que el resto del Núcleo), documentando honestamente, igual que en cada componente anterior, que no hay todavía flujo real que la alimente.

### 7. Veredicto

La Fase D queda **documentalmente verificada, sin contradicciones ni dependencias circulares, sin necesidad de reapertura de ningún documento ya congelado**. Ningún hallazgo de esta Verificación exige una nueva Decisión Transversal — todos son vacíos ya conocidos (IA-006, IA-007) o limitaciones de alcance ya explícitas en el propio texto congelado (DT-001, frontera Telemetría↔Analítica). **Autorizado avanzar al Plan Técnico de Telemetría**, primer componente por el orden de dependencia real.

### 8. Próximo paso

Elaboración del Plan Técnico de Telemetría — contratos públicos, qué fuente(s) de métricas consume realmente en esta primera versión, qué persiste (si algo) vía Repository Layer, y cómo entrega su resultado a Observabilidad — con la misma disciplina de las fases anteriores: sin código todavía, e incorporando desde el diseño las dos limitaciones señaladas en §5 (ausencia de correlación por `requestId`, ausencia de productor real de `ExecutionAudit` en producción).
