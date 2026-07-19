# VERIFICACIÓN DOCUMENTAL COMPLETA — Orquestador del Flujo Completo

**Fecha:** 2026-07-19
**Objeto:** localizar y consolidar toda la evidencia documental existente sobre el Orquestador del Flujo Completo (SPO). Sin interpretar arquitectura, sin proponer diseño, sin completar vacíos, sin inferir responsabilidades no documentadas, sin priorizar implementaciones.
**Fuente:** exclusivamente Conjunto A (arquitectura Nivel 1 congelada, verificada, y documentación de gobernanza producida en esta conversación). **Excluye expresamente** el bloque de contenido marcado como no verificado en memoria (`## ⛔ A PARTIR DE AQUÍ: CONTENIDO NO VERIFICADO`, incidente de trazabilidad 2026-07-19) — ese bloque contiene referencias a una "Especificación Arquitectónica del SPO", una "Fase F" y un "SPO v1 implementado" que **no forman parte de esta verificación** por no tener trazabilidad demostrada.

---

## Tabla consolidada de referencias documentales

| # | Documento | Sección | Contexto | Responsabilidad atribuida | Restricciones explícitas | Dependencias mencionadas |
|---|---|---|---|---|---|---|
| 1 | SC-003 | Cuerpo principal | *"El SPO es el núcleo de coordinación de ScenaIA: no responde, decide el flujo completo de procesamiento antes de que exista cualquier respuesta."* | Coordinar el sistema; decidir el flujo completo de procesamiento | — | — |
| 2 | SC-003 | "Principios del SPO" | Cuatro principios declarados | Coordina el sistema (única responsabilidad positiva) | *"Nunca genera contenido; nunca almacena conocimiento; nunca mantiene memoria; nunca contiene prompts."* | — |
| 3 | SC-003 | "4 componentes internos" | Decision Engine, AI Gateway, Credit Manager, Response Dispatcher, descritos como internos al SPO | Ninguna nueva — describe su composición original | — | Los 4 componentes nombrados |
| 4 | SC-003 | "Flujo arquitectónico oficial declarado" | Usuario → Autenticación → PCE → SKM → Decision Engine → ¿IA? → [...] → Mi Trayectoria® → Usuario. *"Congelado, ningún asistente futuro podrá alterarlo."* | Preservar esta secuencia (implícito en su rol de coordinación) | — | Los 7 pasos del flujo |
| 5 | SC-002 (SKM) | "Dependencias oficiales declaradas del SKM" | El SPO se nombra como una de las dependencias del SKM, junto a PCE, Response Composer, Agentes especializados | Ninguna nueva — solo lo nombra como relacionado | — | SKM → SPO (sin detallar) |
| 6 | SC-004.1 (PCE) | "Interfaz pública (inferida...)" | *"Queda sin especificar explícitamente quién invoca al PCE (¿el SPO? ¿una capa de entrada anterior al SPO?) — inferencia razonable pero no confirmada por el documento."* | **No confirmada** — candidato, sin confirmación documental | — | PCE ← SPO (relación no confirmada) |
| 7 | Registro de cierre del Núcleo (Bloque I) | "Componentes de SC-003 todavía sin especificación propia" | De los 4 "componentes internos" originales, 3 recibieron documento propio (Decision Engine, AI Gateway, Credit Manager) y se integraron como componentes de pleno derecho del Núcleo | Ninguna nueva sobre el SPO en sí | — | Decision Engine, AI Gateway, Credit Manager (ya independizados) |
| 8 | R-01 (revisión de gobernanza, Bloque III) | Resolución sobre Response Dispatcher | El cuarto "componente interno" (Response Dispatcher) se resuelve como absorbido por AI Gateway, nunca implementado por separado | Ninguna nueva sobre el SPO | — | Response Dispatcher → AI Gateway |
| 9 | `project_scenaia_bloque3_implementacion.md`, Fase C | "El SPO como orquestador implícito" | Verificado que SC-003 ya definía al SPO como coordinador del pipeline completo desde el inicio; nunca implementado como código; nunca en la lista de 7 componentes de Fase B | Coordinar el pipeline completo (reafirma SC-003) | *"El SPO no puede persistir nada"* (cita literal de SC-003, "nunca mantiene memoria") | — |
| 10 | `lib/procesos-asincronos/record-activity.ts` (código real) | Comentario de `recordActivity()` | *"Solo el SPO — coordinando esta llamada como un paso más de la secuencia, sin mantener el mismo ningún estado — debe invocarla. Ningún componente del Núcleo... debe conocerla ni invocarla directamente."* | Invocar `recordActivity()` de Procesos Asíncronos, dentro de la secuencia, sin mantener estado propio | Ningún componente del Núcleo debe conocer o invocar Procesos Asíncronos directamente | `recordActivity()` |
| 11 | `lib/verified/observabilidad/record-execution-trace.ts` (código real) | Comentario de `recordExecutionTrace()` | *"Depende del mismo actor todavía inexistente que `recordActivity()`/`recordMetric()`: un futuro orquestador que conozca `profileId`... y también el `ExecutionAudit` que `executeAIRequest()` devuelve — ningún componente del flujo verificado los tiene ambos hoy."* | Conocer simultáneamente `profileId` y el resultado de `executeAIRequest()` para poder invocar `recordExecutionTrace()` | — | `recordActivity`, `recordMetric`, `recordExecutionTrace`, `executeAIRequest` |
| 12 | `docs/gobernanza/verificacion-orquestador-flujo-completo.md` (propio, 2026-07-19) | Clasificación | Los 4 "componentes internos" ya no existen como agrupación (3 independizados, 1 absorbido); el flujo/secuencia sigue congelado; ningún componente del Núcleo invoca a otro (verificado por invariante) | Ninguna nueva — clasifica al SPO como *"patrón de coordinación congelado, sin agente de ejecución asignado"* | — | Los 7 componentes del Núcleo (verificado que no se invocan entre sí) |
| 13 | `docs/gobernanza/verificacion-prioridad-orquestador.md` (propio, 2026-07-19) | Verificación de prerrequisitos | Confirma que las 4 dependencias reales del orquestador (`executeAIRequest`, `recordActivity`, `recordMetric`, `recordExecutionTrace`) ya existen y están cerradas | Ninguna nueva | — | Las 4 funciones nombradas |

---

## Propósito actualmente definido

Coordinar el flujo completo de procesamiento de ScenaIA — decidir la secuencia antes de que exista cualquier respuesta — sin generar contenido, sin decidir el resultado por sí mismo, sin persistir nada.

## Responsabilidades explícitamente documentadas

1. Coordinar el sistema / decidir el flujo completo (SC-003, literal).
2. Preservar el orden congelado del flujo oficial (SC-003, diagrama).
3. Invocar `recordActivity()` como parte de la secuencia, sin mantener estado propio (código real, verificado).

## Responsabilidades explícitamente NO documentadas

1. **Quién invoca al PCE en concreto** — el propio documento de PCE lo deja sin confirmar ("¿el SPO? ¿una capa de entrada anterior?").
2. Si el orquestador también debe invocar `recordMetric()`/`recordExecutionTrace()` (Telemetría/Observabilidad) — solo hay una referencia de código (#11) que asume esa necesidad, sin que ningún documento arquitectónico lo confirme.
3. Su forma concreta de materialización (función, servicio, middleware, ruta HTTP) — ningún documento la especifica.
4. Su ubicación en el Plan Maestro de 5 fases — nunca tuvo fase ni componente asignado (ya verificado en #12/#13).

## Aspectos que permanecen abiertos

- Toda su materialización como código — nunca implementado.
- Su encaje en el Plan Maestro de Bloque III.
- El alcance exacto de "coordinar" más allá de los tres puntos documentados (#1–#3 de responsabilidades documentadas) — SC-003 lo declara conceptualmente, sin contrato de entradas/salidas propio (ya verificado en la clasificación previa, #12).

---

## Conclusión

**Opción A — la documentación define suficientemente el Orquestador como para iniciar una caracterización arquitectónica.**

Existe propósito documentado (SC-003), restricciones explícitas y literales (los 4 "nunca"), y al menos una responsabilidad concreta ya verificada contra código real (`recordActivity()`, sin mantener estado). Es material suficiente para iniciar una caracterización de propiedades obligatorias, del mismo tipo ya completado para `ExecutionAudit` — con la advertencia expresa de que esa caracterización debe tratar como vacíos declarados, no como premisas asumidas, los tres puntos identificados en "responsabilidades NO documentadas" — en particular, la pregunta sin confirmar de quién invoca al PCE, que el propio documento fundacional de PCE ya dejó abierta.
