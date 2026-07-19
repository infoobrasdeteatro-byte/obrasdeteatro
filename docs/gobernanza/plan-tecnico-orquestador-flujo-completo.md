# PLAN TÉCNICO — Orquestador del Flujo Completo

**Fecha:** 2026-07-19
**Base:** exclusivamente PAO-01 a PAO-09, la Validación, la Evaluación de Apertura, el Mapa Maestro y los contratos públicos ya cerrados de los 7 componentes del Núcleo + Procesos Asíncronos + Telemetría + Observabilidad (verificados por lectura directa del código real durante esta misma actividad).
**Nota de ubicación, por el incidente de trazabilidad todavía abierto:** `lib/spo/` ya existe como parte del Conjunto B no verificado — cualquier implementación futura de este Plan Técnico deberá seguir el mismo criterio ya aplicado a Observabilidad: ubicarse en `lib/verified/orquestador/`, sin tocar `lib/spo/`. Se señala ahora para que no sea una sorpresa al autorizarse la implementación.

---

## 1. Resolución de los tres vacíos documentados

### Vacío 1 — Quién invoca al PCE

**Resolución: el propio Orquestador invoca al PCE directamente, como parte de la secuencia que coordina.**

**Justificación:** PAO-01 exige coordinar *"la secuencia completa"*, no una parte de ella — introducir una capa adicional exclusivamente para invocar el primer paso duplicaría una responsabilidad (invocar un paso del flujo) que el Orquestador ya ejerce para el resto de los seis pasos restantes, violando **ausencia de duplicidad funcional**. Es también la resolución más simple (**simplicidad arquitectónica**): no se introduce ningún elemento nuevo no evidenciado documentalmente.

**Precisión de frontera, necesaria para esta resolución:** "Autenticación" (el paso que precede a PCE en el diagrama de SC-003) ya está establecido, en el propio contrato de PCE, como una precondición externa — `buildProfessionalContext` recibe `userId` ya resuelto, nunca deriva identidad de un token crudo. El Orquestador hereda esa misma frontera: su punto de entrada recibe `userId` y `session` ya autenticados, no ejecuta autenticación él mismo. Esto no es una decisión nueva — es la extensión directa de un límite que PCE ya tenía fijado.

### Vacío 2 — ¿Incluye el patrón de coordinación a `recordMetric()` y `recordExecutionTrace()`?

**Resolución: incluye `recordExecutionTrace()`. No incluye `recordMetric()` como invocación separada — verificado que `recordExecutionTrace()` ya lo invoca internamente.**

**Justificación:** PAO-07 documenta el patrón para `recordActivity()`; extenderlo a `recordExecutionTrace()` es **coherencia con la arquitectura existente** — ambas son relaciones de la misma naturaleza (observación pasiva de un Servicio de Plataforma, DT-003), y el propio código de `recordExecutionTrace()` ya anticipa esto literalmente en su comentario: *"un futuro orquestador que conozca `profileId`... y también el `ExecutionAudit` que `executeAIRequest()` devuelve."* Verificado además, releyendo el código real de `lib/verified/observabilidad/record-execution-trace.ts`, que esta función ya invoca `recordMetric()` internamente para cada campo numérico de `ExecutionAudit` — invocarlo también por separado desde el Orquestador sería una **duplicidad funcional** real, no solo potencial.

### Vacío 3 — Forma de materialización

**Resolución: una única función de composición, sin estado propio, que invoca en secuencia los contratos públicos ya existentes de cada componente — sin clases, sin framework propio, sin lógica de negocio propia.**

**Justificación:** coherente con la forma que ya tienen los 10 componentes de este proyecto construidos hasta ahora (ninguno es una clase; todos son funciones o módulos de funciones). Cumple la **Restricción fundamental** del propio encargo (pieza de coordinación, nunca componente que absorba lógica ajena) por construcción: una función que solo invoca a otras, sin decidir nada por sí misma, no tiene dónde alojar lógica de negocio. Ver contrato exacto en §3.

---

### Nota de coherencia con DT-003 — ausencia deliberada de "Mi Trayectoria®" en la secuencia

El diagrama histórico de SC-003 incluye *"Mi Trayectoria® (cuando proceda)"* como paso final condicional. **No aparece en la secuencia de §4 — omisión deliberada, no descuido.** DT-003 (Decisión Transversal ya congelada) reinterpretó oficialmente ese paso: *"nunca representó una llamada directa del Núcleo a un Dominio Funcional... relación final confirmada: observación pasiva, no notificación activa."* Mi Trayectoria® consume su información vía `buildTrajectory(profileId)`, invocado de forma independiente por quien la consulte — nunca como parte del flujo que produce una respuesta. Incluirla en la secuencia del Orquestador contradiría directamente DT-003. Se documenta explícitamente para que la ausencia no se confunda con un olvido.

## 2. Responsabilidades técnicas definitivas

1. Recibir `userId`, `session` (ya autenticados) y `originalRequest`.
2. Invocar, en el orden congelado, los 7 contratos públicos del Núcleo — cada uno recibiendo exactamente las salidas ya construidas por los pasos anteriores, sin transformarlas.
3. Invocar `recordActivity()` y `recordExecutionTrace()` como pasos posteriores a la obtención de `ResponseContext`, nunca antes.
4. Devolver el `ResponseContext` producido por Response Composer, sin alterarlo.

## 3. Contratos de interacción con el resto del sistema — verificados contra el código real

| Paso | Contrato invocado | Firma real verificada |
|---|---|---|
| 1 | Request Interpreter | `normalizeRequest(originalRequest: string): NormalizedRequest` |
| 2 | PCE | `buildProfessionalContext(userId: string, session: SessionInput): Promise<ProfessionalContext>` |
| 3 | SKM | `buildKnowledgeContext(normalizedRequest: NormalizedRequest): Promise<KnowledgeContext>` |
| 4 | Decision Engine | `buildDecisionContext(normalizedRequest, professionalContext, knowledgeContext): DecisionContext` |
| 5 | Credit Manager | `buildAuthorizationContext(professionalContext, decisionContext): Promise<AuthorizationContext>` |
| 6 | AI Gateway | `executeAIRequest(decisionContext, authorizationContext): Promise<{ result: AIExecutionResult; audit: ExecutionAudit }>` |
| 7 | Response Composer | `composeResponse(decisionContext, authorizationContext, result): ResponseContext` |
| 8 (posterior a 7) | Procesos Asíncronos | `recordActivity({ profileId: professionalContext.identity.userId, responseType: responseContext.responseType }): Promise<boolean>` |
| 9 (posterior a 6) | Observabilidad (verificada) | `recordExecutionTrace(professionalContext.identity.userId, audit): Promise<boolean>` |

**Contrato público propio del Orquestador:**
```
coordinateFlow(userId: string, session: SessionInput, originalRequest: string): Promise<ResponseContext>
```

## 4. Recorrido completo del flujo de coordinación

**Decisión técnica central, con su justificación:** invocación **estrictamente lineal e incondicional** de los 7 pasos del Núcleo — sin ninguna rama de decisión propia del Orquestador (p. ej., "si no necesita IA, saltar Credit Manager/AI Gateway"). **Justificación:** verificado, leyendo el código real de `buildAuthorizationContext` y `executeAIRequest`, que ambos **ya se autoguardan internamente** ante los casos "no aplica"/"no autorizado"/"no requerido" (branches `NO_APLICA`, `NO_AUTORIZADO`, `NO_REQUERIDO`, `SIN_PROVEEDOR`, todos ya construidos y probados). Que el Orquestador decidiera él mismo si invocarlos o no duplicaría una decisión que Decision Engine ya tomó (`needsAI`) — violaría **ausencia de duplicidad funcional**. Invocarlos siempre, incondicionalmente, es además la lectura más simple del propio diagrama de flujo (**simplicidad**, **trazabilidad del flujo completo**): un único camino, sin ramas que mantener ni validar por separado.

**Secuencia:**

1. `normalizedRequest = normalizeRequest(originalRequest)`
2. `professionalContext = buildProfessionalContext(userId, session)`
3. `knowledgeContext = buildKnowledgeContext(normalizedRequest)` — **estrictamente después del paso 2, no en paralelo**, aunque no exista dependencia de datos entre ambos: preserva el orden literal del diagrama oficial de SC-003 (PCE antes que SKM) como **trazabilidad del flujo completo**, evitando introducir una optimización de paralelismo no solicitada ni justificable por ninguno de los criterios de calidad autorizados.
4. `decisionContext = buildDecisionContext(normalizedRequest, professionalContext, knowledgeContext)`
5. `authorizationContext = buildAuthorizationContext(professionalContext, decisionContext)`
6. `{ result, audit } = executeAIRequest(decisionContext, authorizationContext)`
7. `responseContext = composeResponse(decisionContext, authorizationContext, result)`
8. `await recordActivity({ profileId: professionalContext.identity.userId, responseType: responseContext.responseType })`
9. `await recordExecutionTrace(professionalContext.identity.userId, audit)`
10. `return responseContext`

**Pasos 8 y 9, decisión técnica y justificación:** se ejecutan **después** de tener ya el `responseContext` final, nunca antes — así ninguna de las dos llamadas de observación puede interferir con la producción de la respuesta (coherente con PAO-02/03/04/05, que impiden al Orquestador mezclar coordinación con generación/gestión de contenido). Se `await`-an de forma secuencial y simple, no en paralelo ni en segundo plano sin esperar: ambas funciones ya "nunca lanzan" por contrato propio, por lo que esperarlas no introduce riesgo — y esperar de forma simple es más fácil de validar (**facilidad de validación futura**) que introducir ejecución en segundo plano no solicitada.

## 5. Validación interna

- **¿Todas las decisiones derivan de las propiedades PAO?** Sí — cada resolución de vacío y cada decisión de secuencia cita la propiedad y/o el criterio de calidad que la justifica (§1, §4).
- **¿Algún diseño contradice la arquitectura validada?** No — verificado explícitamente: la invocación incondicional de Credit Manager/AI Gateway no contradice PAO-01 (sigue coordinando la secuencia completa); el orden lineal PCE→SKM no contradice ninguna propiedad (ninguna exige paralelismo).
- **¿Todos los vacíos han quedado resueltos?** Sí, los tres, cada uno con justificación trazable a PAO y/o a código real ya verificado — ninguna resolución se apoya en una hipótesis nueva no evidenciada.
- **¿Aparecen responsabilidades nuevas fuera del alcance del Orquestador?** No — las 4 responsabilidades de §2 son estrictamente de invocación y paso de datos; ninguna decide, genera o persiste conocimiento propio.
- **¿Se mantiene la separación entre coordinación y ejecución?** Sí — el Orquestador nunca decide el contenido de ninguna respuesta (esa decisión permanece en Decision Engine/Credit Manager/AI Gateway/Response Composer); solo decide **cuándo** invocar a cada uno, nunca **qué** deciden.

## 6. Estructura de módulo propuesta (forma, no tecnología)

```
lib/verified/orquestador/
  types.ts              -- SessionInput (re-exportado de PCE), sin tipos nuevos
  coordinate-flow.ts      -- coordinateFlow(), único punto de entrada
  index.ts
  __tests__/
```

Sin persistencia propia, sin Supabase directo, sin Repository Layer directo — toda persistencia ya ocurre dentro de los componentes que invoca.

---

## Resultado

Plan Técnico completo: tres vacíos resueltos con justificación trazable, contratos de interacción verificados contra código real (no supuestos), secuencia completa de 10 pasos, y validación interna sin hallazgos pendientes. No se ha escrito código. Queda a la espera de revisión arquitectónica antes de autorizar implementación.
