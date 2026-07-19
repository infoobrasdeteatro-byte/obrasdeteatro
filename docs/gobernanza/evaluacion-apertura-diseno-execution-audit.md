# EVALUACIÓN DE APERTURA — ¿Debe evolucionarse ahora la arquitectura para resolver el acceso a `ExecutionAudit`?

**Fecha:** 2026-07-19
**Pregunta única:** ¿debe evolucionarse ahora la arquitectura para resolver este vacío, o puede mantenerse como vacío arquitectónico documentado sin comprometer el desarrollo del proyecto?
**No reabre** la fase de análisis ya validada (`acta-validacion-propiedades-execution-audit.md`), no diseña, no propone mecanismo.

---

## 1. Estado actual de la arquitectura congelada, relevante para esta pregunta

El vacío está **completamente acotado y trazable**: misión de Analítica congelada, fuente autorizada identificada (`ExecutionAudit`), ausencia de mecanismo demostrada con evidencia directa (Procesos Asíncronos, considerado y rechazado en su momento; Telemetría, descartada por su propio texto), 12 propiedades obligatorias validadas sin contradicción ni redundancia. No es un vacío silencioso ni mal caracterizado — es, ya hoy, gobernanza completa sobre un problema todavía sin resolver.

## 2. Impacto del vacío sobre el avance del proyecto — verificado contra el Mapa Maestro, no supuesto

El propio Mapa Maestro (§5, sin cambios desde su aprobación) ya clasifica a Analítica entre los **"componentes que pueden implementarse después del primer ensayo funcional, sin impedirlo"** — *"consumidor asíncrono de `ExecutionAudit`, nunca en el flujo síncrono."* Esta clasificación no se hizo pensando en este vacío concreto, pero lo confirma independientemente: nada en la ruta hacia la primera ejecución funcional (Lectura A, §4 del Mapa) depende de Analítica ni de `ExecutionAudit`.

**Verificado también:** ningún otro componente ya cerrado o pendiente consume o depende de la resolución de este vacío. Observabilidad, el otro consumidor de información técnica de AI Gateway, ya resolvió su propia necesidad por una vía distinta y ya autorizada (Telemetría) — no comparte ni hereda este bloqueo. Fase E (Sistemas de Caché, Subsistemas de Aprendizaje) tampoco depende de él. El orquestador del flujo completo, el otro vacío transversal ya acreditado, es independiente de este.

**El vacío es, arquitectónicamente, un nodo hoja: bloquea únicamente a Analítica, y Analítica no bloquea a nada más.**

## 3. Dependencias documentadas en el Mapa Maestro

Solo una dependencia real registrada: *"Analítica depende de que exista un mecanismo de acceso autorizado a `ExecutionAudit`... bloquea la Delimitación de Alcance de Analítica, no solo su implementación"* (§3 del Mapa). Ninguna dependencia inversa — nada depende de que Analítica avance.

## 4. Gobernanza vigente — precedente directamente aplicable

**IA-007**, el antecedente parcial de este mismo vacío (responsable de iniciar la liquidación de Accounting Engine vía `ExecutionAudit`), lleva abierto desde el cierre de AI Gateway (2026-07-16) — atravesó, sin ser escalado ni forzado a resolución, el cierre de Fase B completa (Acta Global: *"ninguna incidencia abierta bloquea el cierre"*), el cierre de Fase C, y el cierre de Fase D hasta este mismo punto. **El proyecto ya tiene un precedente consistente y sostenido de convivir con esta categoría exacta de vacío sin que comprometa ningún cierre.**

Principio ya consolidado en el propio proyecto (Acta Global de Cierre de Fase B, §8): *"toda reapertura exige demostrar un defecto, no una preferencia."* Aplicado aquí, por extensión directa: abrir ahora una fase de diseño exige demostrar una necesidad real de resolverlo ya — no la conveniencia de hacerlo mientras el tema está fresco en esta sesión de gobernanza.

## 5. Evaluación de la alternativa contraria, por rigor

Único argumento real a favor de evolucionar ahora: mantener el impulso de la sesión de gobernanza recién completada. **No es una razón arquitectónica** — es una conveniencia de proceso, exactamente el tipo de motivo que el precedente citado en §4 ya excluye como justificación válida para abrir trabajo nuevo.

---

## Conclusión

**Opción B — la evolución arquitectónica puede posponerse.**

El vacío permanece correctamente gobernado (Acta de Validación aprobada), documentado (tres documentos trazables en `docs/gobernanza/`) y localizado (bloquea exclusivamente la Delimitación de Alcance de Analítica, ya en pausa por esta misma razón). No impide el avance del proyecto por ningún otro frente — ni la vía hacia la primera ejecución funcional, ni Fase E, ni la resolución del otro vacío transversal (orquestador). El propio proyecto ya sostiene, sin coste demostrado, la misma categoría de vacío (IA-007) desde hace tres cierres de fase consecutivos.

No se justifica documentalmente ninguna necesidad de abrir ahora una fase de diseño independiente. Analítica permanece en pausa de gobernanza; el vacío queda registrado como arquitectura pendiente, no como bloqueante activo.
