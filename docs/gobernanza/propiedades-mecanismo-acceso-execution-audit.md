# RESOLUCIÓN ARQUITECTÓNICA TRANSVERSAL — Propiedades obligatorias de cualquier mecanismo de acceso a `ExecutionAudit`

**Fecha:** 2026-07-19
**Nota de numeración:** el rótulo "RA-001" propuesto colisiona con la serie RA-xxx ya existente (hallazgos de revisión de código, RA-001 a RA-005, la primera ya asignada a Repository Layer desde 2026-07-13). Pendiente de que la Dirección fije el nombre definitivo de esta nueva serie transversal.
**Objeto:** responder únicamente qué propiedades arquitectónicas debe cumplir cualquier mecanismo de acceso autorizado a `ExecutionAudit` — no cuál debe ser ese mecanismo. Ninguna propiedad se admite sin justificación citada contra arquitectura ya verificada.

---

## Propiedades obligatorias, cada una con su evidencia

### 1. Debe desacoplar al productor de sus consumidores

**Evidencia:** el contrato ya cerrado de AI Gateway declara explícitamente, en su propio código: *"Termina su responsabilidad al producir `AIExecutionResult` + `ExecutionAudit` — nunca invoca a Accounting Engine (IA-007, sin asignación documental)."* Es la aplicación, a este caso, del mismo invariante ya construido y probado en los 7 componentes del Núcleo: ninguno invoca funcionalmente a otro. Cualquier mecanismo que exigiera que AI Gateway conociera o invocara a un consumidor concreto reabriría un contrato ya cerrado sin defecto demostrado — precedente ya fijado ("toda reapertura exige demostrar un defecto, no una preferencia").

### 2. No debe requerir que el productor conozca la identidad de sus consumidores

**Evidencia:** tanto Observabilidad como Analítica declaran textualmente, cada una por separado, *"nunca es conocida ni dependida por el Núcleo."* AI Gateway es un componente del Núcleo. Cualquier mecanismo que exigiera una referencia directa desde AI Gateway hacia Observabilidad, Analítica, o cualquier otro consumidor, violaría esta cláusula en ambos documentos simultáneamente.

### 3. Debe preservar la inmutabilidad de `ExecutionAudit`

**Evidencia:** el propio tipo `ExecutionAudit`, ya verificado contra el código real (`lib/ai-gateway/types.ts`), declara sus 6 campos como `readonly`. Coherente con la garantía ya exigida y documentada para el resto de objetos del flujo (`decisionContext`, `authorizationContext`, `aiExecutionResult`): *"se leen exclusivamente por sus campos... nunca se les asigna nada."* Cualquier mecanismo que permitiera a un consumidor modificar el objeto antes de que otro lo consuma rompería una garantía ya exigida en todo el resto del pipeline.

### 4. Debe admitir múltiples consumidores sobre el mismo objeto producido

**Evidencia:** SC-004.7 revisado nombra explícitamente 5 categorías de consumo (Auditoría, Monitorización, Observabilidad, Analítica, Diagnóstico técnico) más Accounting Engine (liquidación, reapertura de SC-004.5/SC-004.7) — las 6 sobre la misma instancia de `ExecutionAudit` que un único `executeAIRequest()` produce.

### 5. Debe mantener las categorías de consumo como una lista plana, no jerárquica

**Evidencia:** verificado en el propio historial de corrección de Bloque II — una primera versión de Observabilidad afirmaba "absorber" Auditoría/Monitorización/Diagnóstico técnico como servicio unificado; **corregida en 3 rondas** precisamente porque ningún documento autoriza esa jerarquía. Cualquier mecanismo que agrupara categorías bajo un único consumidor "principal" repetiría un error ya identificado y corregido explícitamente.

### 6. Debe respetar la autorización por categoría explícita, nunca ambiente ni heredada por defecto

**Evidencia:** el propio texto de Telemetría restringe su uso *"exclusivamente a Observabilidad"*, y la corrección de Analítica retiró expresamente la frase que le habría dado acceso "del mismo modo en que ya lo hace Observabilidad" — la arquitectura ya ha corregido, dos veces, el error de asumir que una autorización se extiende por analogía. Cualquier mecanismo de acceso a `ExecutionAudit` debe exigir autorización explícita por consumidor/categoría, no concederla implícitamente a quien ya tenga acceso a otro recurso relacionado.

### 7. No debe requerir la participación del flujo síncrono del Núcleo

**Evidencia:** Observabilidad y Analítica declaran, cada una, *"nunca participa en el flujo síncrono."* Mismo principio ya demostrado en la práctica: `recordActivity`/`recordMetric`/`recordExecutionTrace` están diseñadas para no interrumpir el flujo que las invoca. Cualquier mecanismo que obligara al flujo funcional a esperar a que un consumidor procese `ExecutionAudit` violaría esta declaración en ambos documentos.

### 8. Si el mecanismo implica persistencia en cualquier punto, debe pasar exclusivamente por Repository Layer

**Evidencia:** *"única capa autorizada para acceder a la persistencia en toda la arquitectura de ObrasDeTeatro®"* (SC-005.1) — ya verificado como principio Nivel 1 independiente del mecanismo de autenticación (investigación de Fase C, 2026-07-17). Propiedad condicional: solo aplica si el mecanismo elegido persiste el dato en algún momento — no se asume que deba hacerlo.

### 9. No debe darse por supuesto un modelo de acceso privilegiado o fuera de sesión sin justificación propia

**Evidencia:** la investigación ya cerrada sobre "ejecución en segundo plano" (Fase C, 2026-07-17) concluyó que ningún consumidor congelado hasta entonces exigía, por contrato, romper el modelo de sesión — y dejó registrada una condición de reapertura explícita en vez de asumir la necesidad. Cualquier mecanismo de acceso a `ExecutionAudit` que requiriera cliente privilegiado o ejecución fuera de sesión debe justificarlo con el mismo rigor, no heredarlo por conveniencia.

### 10. No debe asumir ningún identificador de correlación (`RequestId`) disponible para `ExecutionAudit`

**Evidencia:** DT-001 (Correlación de Peticiones), ya congelada, declara su propio alcance de forma explícita y restrictiva: *"no define Observabilidad, Telemetría, Analítica ni herramientas de trazado"* — verificado también contra el tipo real de `ExecutionAudit` (`lib/ai-gateway/types.ts`), que no incluye ningún campo de correlación. Cualquier mecanismo que presupusiera poder relacionar un `ExecutionAudit` con la petición de usuario que lo originó, vía `RequestId` o equivalente, excedería una frontera que DT-001 fijó expresamente.

### 11. No debe exponer `DecisionContext`/`DecisionRationale` a ningún consumidor de `ExecutionAudit`

**Evidencia:** vacío diferido, ya congelado, común a Observabilidad y a Analítica: *"ni Observabilidad ni Analítica tienen autorización para consultar `DecisionContext`/`DecisionRationale` — ningún documento amplía esos consumidores más allá de Credit Manager y AI Gateway."* Cualquier mecanismo que transportara `ExecutionAudit` junto con contexto adicional del `DecisionContext` (por comodidad de diseño, no por autorización) filtraría información que ningún documento permite entregar a estos consumidores.

### 12. Debe degradar de forma segura ante cualquier fallo de entrega, sin comprometer la respuesta ya construida

**Evidencia:** principio consolidado explícitamente en el cierre de Fase B como precedente de toda la arquitectura: *"degradación segura como norma, no como excepción — todo dato sin fuente real se marca `null`/estado explícito de 'no disponible', nunca se inventa"* (Acta Global de Cierre de Fase B, §8). Reforzado por el propio comportamiento ya exigido y probado en Response Composer (*"nunca excepción"*) y en las tres funciones de registro de lado ya construidas (`recordActivity`/`recordMetric`/`recordExecutionTrace`, ninguna lanza). Distinta de la propiedad 7 (que exige no participar del flujo síncrono en absoluto): esta exige que, si el mecanismo participa en cualquier punto de la producción o entrega, un fallo suyo no debe romper ni degradar la respuesta ya construida por el Núcleo.

---

## Propiedad citada por el ejemplo de la Dirección, evaluada y no incluida

**"Debe evitar dependencias circulares"** — evaluada contra la arquitectura verificada: no se encontró ningún documento que describa el riesgo de un ciclo real entre AI Gateway y sus consumidores (todos ellos, por las propiedades 1 y 2, ya quedan estructuralmente imposibilitados de depender de AI Gateway hacia atrás). Se considera cubierta por las propiedades 1 y 2, no una propiedad adicional independiente — no se añade por separado para no duplicar justificación sobre la misma evidencia.

---

## Resultado

Doce propiedades obligatorias (§1–§12), cada una justificada contra un documento o código ya verificado, ninguna inferida. No se propone mecanismo, patrón ni tecnología. Lista revisada y completada el 2026-07-19 tras revisión final de coherencia — ver `acta-validacion-propiedades-execution-audit.md`.
