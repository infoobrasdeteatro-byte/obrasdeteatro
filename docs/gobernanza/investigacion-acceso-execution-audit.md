# INVESTIGACIÓN ARQUITECTÓNICA — Mecanismo autorizado de acceso a `ExecutionAudit`

**Fecha:** 2026-07-19
**Nota de numeración:** el nombre "DA-001" propuesto para esta decisión colisiona con una Decisión Arquitectónica ya congelada (propiedad de los límites del plan, 2026-07-13, previa a Accounting Engine). Si esta investigación deriva en una Decisión Arquitectónica formal, corresponde numerarla **DA-002** — no reutilizar DA-001.
**Pregunta única:** ¿cuál es el mecanismo arquitectónicamente autorizado para que un Servicio de Plataforma consuma `ExecutionAudit`?
**Restricciones aplicadas:** sin modificar componentes, sin proponer implementación/API/persistencia, sin reutilizar Telemetría por analogía, sin reconstruir documentación perdida por inferencia. Toda conclusión, evidencia verificable o vacío declarado explícitamente.

---

## 1. Ciclo de vida previsto de `ExecutionAudit`, según la arquitectura congelada

Verificado, textual (aclaración oficial SC-004.2/SC-004.7, 2026-07-12): `AIExecutionResult` se redefinió para separar la información técnica en un objeto propio, `ExecutionAudit`, *"explícitamente fuera del flujo funcional: no lo consume el Response Composer, no se muestra nunca al usuario, uso restringido a auditoría/monitorización/observabilidad/analítica/diagnóstico técnico, entregado en paralelo a un 'sistema interno de auditoría'."*

Flujo oficial declarado: *"AI Gateway → ExecutionAudit → Sistema interno de auditoría"*, en rama paralela al flujo funcional principal.

**Verificado, y no menor:** el propio término *"sistema interno de auditoría"* aparece exactamente una vez, como referencia narrativa dentro del flujo — **ningún documento lo define como componente con nombre, contrato, entradas/salidas o ubicación en ningún Plan Maestro.** No es una pieza arquitectónica identificada, es una expresión descriptiva de destino, sin especificación operativa asociada.

## 2. Responsabilidades del productor (AI Gateway)

Verificado en dos fuentes independientes — el documento congelado (SC-004.7) y el código real ya cerrado (`lib/ai-gateway/execute-ai-request.ts`, comentario explícito del propio archivo): AI Gateway **produce** `ExecutionAudit` y lo **devuelve** como parte de su resultado (`{ result, audit }`). Su responsabilidad termina ahí — el propio código lo declara: *"Termina su responsabilidad al producir `AIExecutionResult` + `ExecutionAudit` — nunca invoca a Accounting Engine (IA-007, sin asignación documental)."*

**No hay ninguna responsabilidad de enrutamiento, entrega ni persistencia asignada al productor**, ni en el documento ni en el código.

## 3. Responsabilidades de los consumidores

Cada consumidor autorizado (Auditoría, Monitorización, Observabilidad, Analítica, Diagnóstico técnico — 5 categorías de SC-004.7 revisado — más Accounting Engine, añadido en la reapertura de SC-004.5/SC-004.7 para liquidación) tiene **autorización de consumo bajo su categoría**. Ningún documento define cómo obtiene el objeto — no hay verbo de "consulta", "suscripción" ni "recepción" especificado para ninguno de los seis.

## 4. ¿Existe ya un mecanismo que ejerza este papel, no identificado hasta ahora?

Se revisaron, con evidencia documental directa, los candidatos más plausibles:

- **Procesos Asíncronos.** Descartado con evidencia directa, no por analogía: verificado en el propio historial de corrección de Bloque II — *"la primera versión incluía `ExecutionAudit` como fuente observada en Responsabilidades, Dependencias y Criterios de aceptación, sin verificar que Procesos Asíncronos no está en la lista de consumidores autorizados de `ExecutionAudit`"* — **corregido y retirado explícitamente** antes de congelar. Es la prueba más fuerte posible: este mecanismo fue propuesto en su momento y expresamente rechazado por la propia arquitectura.
- **Telemetría.** Descartado por el propio texto congelado, sin necesidad de analogía: *"No consume `ExecutionAudit` directamente"* — verificado independientemente, ya usado en la Acta de Verificación de Analítica.
- **Repository Layer.** Ningún documento lo autoriza a persistir `ExecutionAudit`; no existe accesor en el código real (verificado, Conjunto A).
- **Accounting Engine.** Autorizado como *consumidor* (categoría de liquidación), pero no como *mecanismo de entrega* — IA-007 ya registra, explícitamente, que nadie tiene asignada la responsabilidad de iniciarle esa liquidación.
- **El orquestador del flujo completo** (clasificado el 2026-07-19 como patrón de coordinación sin agente asignado). Resolvería la secuenciación del Núcleo, pero ningún documento le asigna, además, la responsabilidad de repartir `ExecutionAudit` entre sus seis consumidores autorizados fuera del Núcleo — es un vacío relacionado, no necesariamente el mismo, y no se asume que resolver uno resuelva el otro.

**No se identifica ningún mecanismo ya existente, congelado o implementado, que ejerza este papel.**

## 5. Vacío arquitectónico demostrado

Sí, queda demostrado, con evidencia directa, no inferida:

1. El productor (AI Gateway) termina su responsabilidad al devolver `ExecutionAudit` — verificado en código y documento.
2. Ningún consumidor autorizado tiene definido cómo accede a él.
3. El único mecanismo alguna vez propuesto para este papel (Procesos Asíncronos) fue expresamente evaluado y rechazado por la propia arquitectura.
4. El "sistema interno de auditoría" que debería recibirlo en paralelo nunca fue especificado como componente.
5. IA-007 ya registra, de forma parcial (solo para liquidación), exactamente este mismo vacío — esta investigación lo confirma en su forma completa, para los seis consumidores, no solo para Accounting Engine.

---

## Conclusión

**No existe un mecanismo arquitectónicamente autorizado para que un Servicio de Plataforma consuma `ExecutionAudit`. Queda demostrado un vacío arquitectónico real, que requerirá una decisión de diseño posterior — no resuelta ni propuesta en esta investigación.**

El vacío es transversal a los seis consumidores autorizados de `ExecutionAudit` (no exclusivo de Analítica, ni de Observabilidad, que lo resolvió por una vía distinta y ya autorizada — Telemetría). Generaliza formalmente IA-007, hasta ahora registrada solo para el caso de Accounting Engine/liquidación.
