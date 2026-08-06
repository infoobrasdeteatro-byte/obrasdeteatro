# ACTA DE CIERRE DE INVESTIGACIÓN
## Encaje Arquitectónico y de Gobernanza de la Orquestación del Pipeline del Núcleo

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** D — Instrumentación (investigación transversal, no específica de componente)
**Fecha:** 2026-07-18
**Tipo:** Investigación documental de encaje arquitectónico — **sin propuesta de implementación**

---

### 1. Origen

El Corte de Control del 2026-07-18 (`docs/auditoria/corte-de-control-2026-07-18.md`) detectó, verificado por búsqueda directa en `app/`, que ningún componente del Núcleo está orquestado de extremo a extremo en ninguna ruta real de la aplicación: cero invocaciones a `executeAIRequest` (AI Gateway), cero invocaciones a `recordActivity` (Procesos Asíncronos) o `recordMetric` (Telemetría). Todo lo construido en Bloque III existe como librería probada por unidad, nunca conectada a una petición HTTP real. La Dirección autorizó esta investigación **exclusivamente** para responder dos preguntas: dónde pertenece arquitectónicamente esa orquestación, y si el Plan Maestro ya la contemplaba o existe un vacío de planificación. **No se propone aquí ningún mecanismo técnico ni se escribe código.**

### 2. Evidencia documental recopilada

1. **SC-003 ya nombra y define este rol como componente arquitectónico propio: el ScenaIA Process Orchestrator (SPO).** Su misión congelada: *"núcleo de coordinación de ScenaIA: no responde, decide el flujo completo de procesamiento antes de que exista cualquier respuesta."* Principios propios, también congelados: *"nunca genera contenido; nunca almacena conocimiento; nunca mantiene memoria; nunca contiene prompts; coordina el sistema."* No es una pieza de infraestructura genérica sin nombre — es un componente con misión y principios propios desde el primer documento de la transferencia arquitectónica (2026-07-12).

2. **El Acta de Cierre del Núcleo (Bloque I, `acta-cierre-nucleo-bloque-1.md`) declara 7 componentes pares** (Request Interpreter, PCE, SKM, Decision Engine, Credit Manager, AI Gateway, Response Composer) — el SPO **no** figura como un octavo. A diferencia de cada uno de los 7, que recibió su propio documento detallado (SC-004.1 a SC-004.7, con entradas/salidas/contratos/criterios de aceptación), **el SPO nunca recibió una especificación equivalente.** Queda nombrado y descrito en misión (SC-003), pero sin contrato implementable propio — mismo tipo de vacío documental ya identificado para Outbound/Inbound Provider Gateway (DT-002: frontera y nombre congelados, especificación detallada nunca escrita).

3. **Precedente ya escrito en una Acta cerrada, no una interpretación nueva de esta investigación:** la propia Acta de Cierre de Procesos Asíncronos v1 (`acta-cierre-procesos-asincronos-v1.md`, 2026-07-17) documenta explícitamente: *"Dentro del flujo estándar de ScenaIA, únicamente el SPO... está autorizado a invocar `recordActivity()`, coordinando la llamada sin persistir él mismo ningún estado."* Es decir: la arquitectura ya daba por sentado, desde hace un día de trabajo, que el SPO existiría y orquestaría — sin que nadie verificara entonces si tenía especificación propia o un lugar reservado en el Plan Maestro. Esta investigación es la primera vez que se verifica esa suposición.

4. **Verificado contra el Plan Maestro de Bloque III** (5 fases, auditado y aprobado 2026-07-13): el SPO no aparece en ninguna de las 5 fases (A–E), ni como componente de Fase B (que lista exactamente 7, no 8), ni en ninguna fase posterior. No hay ningún R-xxx (como R-01 para Response Dispatcher, o R-02 para Subsistemas de Aprendizaje) que lo mencione.

5. **Verificado contra el código real:** no existe ningún directorio `lib/spo/` ni equivalente. Ningún componente de los 7 ya cerrados asume responsabilidad de invocar al siguiente en la secuencia — cada uno depende únicamente de sus propios tipos de entrada, nunca de otro componente del Núcleo como dependencia funcional (invariante verificado por test en cada uno). Esto es coherente con que el SPO sea quien deba coordinarlos desde fuera — ninguno de los 7 lo hace por sí mismo, ni debería, según sus propios contratos ya congelados.

### 3. Conclusión — encaje arquitectónico

**La orquestación del pipeline pertenece al SPO (SC-003).** No es un componente nuevo por inventar: es un componente ya nombrado, clasificado y dotado de misión y principios propios desde el Bloque I — pero nunca dotado de una especificación implementable equivalente a la de sus 7 pares. El vacío no es "¿quién debería hacer esto?" (esa pregunta ya tiene respuesta documental) sino "¿qué contrato exacto tiene el SPO, y cuándo se especifica e implementa?".

### 4. Conclusión — vacío de planificación

**Sí existe un vacío de planificación real, no solo de implementación.** El Plan Maestro de Bloque III, tal como fue auditado y aprobado el 2026-07-13, nunca reservó una fase ni un componente para especificar y construir el SPO — a diferencia de Response Dispatcher (resuelto explícitamente vía R-01) y de Subsistemas de Aprendizaje (con su propio prerrequisito R-02 ya fijado), el SPO **nunca tuvo ni siquiera un placeholder** en el Plan Maestro. No es un olvido de esta investigación: es un vacío que ya existía desde la propia auditoría del Plan Maestro (2026-07-13) y que nadie había verificado hasta este Corte de Control.

### 5. Consecuencias directas de este vacío, sin resolverlas aquí

- Ningún componente del Núcleo, aunque cerrado y probado individualmente, ha sido verificado en secuencia real — la composición completa (`NormalizedRequest → ProfessionalContext → KnowledgeContext → DecisionContext → AuthorizationContext → AIExecutionResult → respuesta final`) nunca se ha ejecutado de principio a fin, ni en producción ni en una prueba de integración de extremo a extremo.
- La responsabilidad de invocar Procesos Asíncronos (`recordActivity`) y Telemetría (`recordMetric`) recae, según lo ya escrito en sus propias Actas, sobre este mismo componente sin especificación — ninguno de los dos puede recibir datos reales hasta que el SPO exista.
- IA-007 (responsable de iniciar la liquidación de Accounting Engine vía `ExecutionAudit`) y su generalización señalada en la Fase D (enrutamiento real de `ExecutionAudit` hacia Observabilidad/Analítica) dependen, en última instancia, de la misma pieza: alguien tiene que ejecutar el pipeline real para que `ExecutionAudit` llegue a producirse fuera de un test.

### 6. Opciones de encaje en el Plan Maestro, presentadas sin elegir ninguna

- **Opción A — Especificar el SPO como componente retroactivo del Bloque I/Fase B.** Descartable por desproporcionada: Bloque I y Fase B ya están cerrados y congelados; esto sería una reapertura de alcance mayor que cualquiera de las tres ya ejecutadas en todo el proyecto (SC-004.5, SC-004.7, SC-004.2), porque afectaría a la propia estructura declarada del Núcleo, no a un contrato puntual.
- **Opción B — Nueva fase o componente propio dentro del Plan Maestro de Bloque III** (p. ej., tras completar Fase D, o como fase independiente) — coherente con el precedente ya usado para insertar revisiones de gobernanza cuando hizo falta (R-01, R-02).
- **Opción C — Tratarlo como responsabilidad de la capa de aplicación (route handlers de Next.js), fuera del inventario de componentes de ScenaIA.** Contraindicada por la evidencia de la Sección 2.1: SC-003 lo trata explícitamente como componente arquitectónico con misión y principios propios, no como plomería genérica de framework.
- **Opción D — Vacío diferido explícito, sin fase asignada todavía** (mismo tratamiento que Outbound/Inbound Provider Gateway), hasta que un consumidor real lo exija con urgencia — mismo criterio ya usado para no abrir DT-004 sin necesidad demostrada.

### 7. Estado resultante

- **Ninguna decisión tomada.** Esta investigación cierra únicamente el encaje documental: confirma que el vacío es real, que pertenece arquitectónicamente al SPO, y que el Plan Maestro nunca lo contempló — no elige entre las opciones de la Sección 6.
- Ningún principio arquitectónico ya congelado se modifica. Ninguna reapertura de Actas ya cerradas.
- Fase D puede continuar (Plan Técnico de Observabilidad) sin depender de que este vacío se resuelva primero — mismo patrón ya aceptado repetidamente en Bloque III: contratos bien diseñados, probados contra datos de prueba, sin necesitar que su productor real ya exista.

### 8. Próximo paso

Queda a decisión de la Dirección del Proyecto cuál de las opciones de la Sección 6 adoptar — o mantener el vacío diferido (Opción D) mientras ningún consumidor real lo exija con urgencia. Ningún código se escribe hasta entonces.
