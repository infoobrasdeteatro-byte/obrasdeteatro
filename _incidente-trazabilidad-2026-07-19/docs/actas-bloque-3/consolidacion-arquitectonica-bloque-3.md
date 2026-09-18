# CONSOLIDACIÓN ARQUITECTÓNICA DEL BLOQUE III — ESTADO ACTUAL
## ScenaIA – ObrasDeTeatro®

**Fecha:** 2026-07-18
**Naturaleza de este documento:** fotografía fiel del estado arquitectónico alcanzado hasta esta fecha. **No es un Acta de Cierre.** El Bloque III permanece abierto — Fase D incompleta (Analítica sin Plan Técnico ni código), Fase E sin iniciar, y dos pendientes del Registro de Pendientes Arquitectónicos (P-006, P-011) marcados explícitamente "Bloquea cierre" conforme a la regla de gobernanza ya vigente. Este documento sirve de base documental para la futura Acta Global de Cierre, cuando esos pendientes queden resueltos.

---

## 1. Objetivo del Bloque III

El Bloque III no tenía como misión "escribir el código de ScenaIA". Tenía como misión **demostrar que la Arquitectura Oficial congelada durante la Fase 4 (Bloque I + Bloque II) podía materializarse en código real sin deformarse en el proceso.** Esa distinción condicionó cada decisión tomada dentro de él.

Los principios que el Bloque III debía consolidar, ya fijados en su Acta de Apertura, eran:

- El código implementa la arquitectura; nunca la redefine.
- Toda desviación descubierta durante el desarrollo se documenta como incidencia arquitectónica — su resolución corresponde a un proceso de gobernanza formal, nunca a una decisión de código.
- Ninguna decisión de rendimiento, infraestructura o tecnología es libre si altera un contrato, una responsabilidad, una dependencia o un principio ya congelado.
- Cada componente implementado debe poder relacionarse de forma inequívoca con el documento arquitectónico del que deriva.

El Bloque III existe, arquitectónicamente, para responder una sola pregunta a lo largo de cada componente: **¿esta implementación es una consecuencia fiel de lo ya congelado, o está inventando arquitectura por el camino?** Cada Plan Técnico, cada revisión, cada Decisión Transversal de este Bloque es, en el fondo, una instancia de esa misma pregunta.

---

## 2. Componentes consolidados (resultado final)

### Núcleo de Procesamiento (Fase B — completa)

Request Interpreter · Professional Context Engine · ScenaIA Knowledge Model · Decision Engine · Credit Manager · AI Gateway · Response Composer.

Los 7 componentes cerrados, congelados, probados, sin ninguna dependencia entre sí fuera de sus contratos oficiales. El flujo `NormalizedRequest → ProfessionalContext → KnowledgeContext → DecisionContext → AuthorizationContext → AIExecutionResult` queda completamente materializado en código, componente a componente, sin ninguna llamada cruzada no autorizada (verificado por invariantes de test en cada uno).

### Servicios de Plataforma (Fase A y parte de C/D — completos)

- **Repository Layer** — única frontera de persistencia de todo el ecosistema; expone `getIdentity`, `getProfessionalProfilePublic`, accesores de obras/organizaciones, operaciones económicas nombradas, registro de actividad, y registro de métricas — toda mutación mediante operación nombrada, nunca genérica.
- **Knowledge Assets** — recuperación de conocimiento estructurado sobre 2 de 8 dominios oficiales (Obras, Organizaciones), alcance parcial declarado explícitamente.
- **Accounting Engine** — ciclo económico Reserva → Ejecución → Liquidación, mediante funciones atómicas, sin mutación directa de tabla.
- **Procesos Asíncronos** — observación pasiva de la actividad del Núcleo, con dos capacidades públicas de lectura independientes (cola y historial), sin semántica cruzada entre ambas.
- **Telemetría** — mecanismo general de instrumentación, sin acoplarse a ningún productor concreto, vocabulario de métrica abierto.
- **Observabilidad** — estructuración técnica por perfil sobre Telemetría, sin agregación entre usuarios, sin invadir Analítica.

### Dominios Funcionales

- **Mi Trayectoria®** — primer Dominio Funcional completo del ecosistema; interpreta la actividad observada vía Procesos Asíncronos en una representación estructurada, con nota de alcance real explícita (interpretación basada en evidencia disponible, no la trayectoria profesional completa).

### Fuera de este inventario — no consolidados todavía

Analítica, Sistemas de Caché, Subsistemas de Aprendizaje, Outbound Provider Gateway, Inbound Provider Gateway, y la orquestación real del pipeline (SPO). Se detallan en la Sección 6, no aquí — este apartado recoge únicamente lo ya congelado.

---

## 3. Decisiones Transversales — significado arquitectónico consolidado

Las cuatro Decisiones Transversales del proyecto no resuelven cuatro problemas independientes — cada una cierra, de forma permanente, un eje distinto de la misma pregunta: **qué hacer cuando una necesidad cruza los límites de un solo componente.**

- **DT-001 (Correlación de Peticiones)** consolida que **la trazabilidad es una propiedad de todo el ecosistema, decidida una sola vez** — ningún componente futuro necesita inventar su propio identificador de correlación; todos heredan `RequestId`/`ExecutionId` del mismo contrato.
- **DT-002 (Frontera hacia Proveedores Externos no-IA)** consolida que **el aislamiento de dependencias externas detrás de un único punto de contacto no es una peculiaridad de AI Gateway, sino un patrón validado en dos dominios independientes** (IA y proveedores de pago) — elevado, por tanto, a principio reutilizable del ecosistema.
- **DT-003 (Relación Núcleo↔Dominios Funcionales)** consolida que **el Núcleo nunca depende de nada que esté fuera de él** — cualquier Dominio Funcional que necesite reaccionar a su actividad lo hace por observación pasiva a través de un Servicio de Plataforma, nunca por invocación directa. Protege la estabilidad del Núcleo de forma permanente frente a cualquier necesidad futura de los Dominios Funcionales.
- **DT-004 (Mecanismo de acceso transversal)** consolida que **ninguna necesidad de acceso agregado justifica, por sí sola, un mecanismo de autenticación nuevo o un privilegio permanente** — el modelo de sesión y RLS ya congelado se extiende a nuevas identidades explícitas, gobernadas caso por caso, nunca se sustituye ni se bordea.

Leídas juntas: DT-001 gobierna la trazabilidad interna del Núcleo; DT-002 gobierna la frontera externa de la plataforma; DT-003 gobierna la frontera interna entre capas; DT-004 gobierna el acceso a datos agregados. Cuatro fronteras distintas, un mismo criterio subyacente — nunca resolver una necesidad transversal de forma local.

---

## 4. Metodología utilizada durante el Bloque III

1. **Investigar antes de decidir.** Tres investigaciones formales y cerradas: ejecución en segundo plano (Fase C), orquestación del pipeline (SPO), y acceso multiusuario de Analítica. Dos de ellas concluyeron que no hacía falta abrir ninguna decisión nueva; la tercera concluyó que sí, con evidencia distinta y verificada de forma independiente en cada caso.
2. **Separar arquitectura de implementación.** Cada Decisión Transversal se congeló como principio antes de tocar código — DT-004 decidió el mecanismo sin diseñar Analítica ni modificar Repository Layer; cada Plan Técnico de componente se discutió y confirmó antes de escribir la primera línea.
3. **Verificar documentalmente, contra Nivel 1 y Nivel 2 por separado.** El Corte de Control verificó por `grep` sobre el código real, no solo contra memoria, que ningún route handler orquesta el Núcleo. La reclasificación del Hallazgo 2 de Analítica se verificó contra el esquema real de `tipo_perfil`, no se asumió.
4. **Comparar alternativas explícitamente antes de resolver.** DT-002 comparó dos Gateway pares frente a alternativas jerárquicas; DT-004 comparó tres mecanismos contra ocho criterios explícitos, con tabla de síntesis, antes de proponer una solución.
5. **Congelar principios, no solo decisiones puntuales.** Cada Decisión Transversal se redactó para consolidar un principio general reutilizable (p. ej., DT-004 crea un patrón, no un privilegio) — nunca solo una respuesta ad hoc al consumidor que la motivó.
6. **Implementar únicamente sobre arquitectura estable.** Ningún componente se inició sin que sus dependencias inmediatas estuvieran ya cerradas — Fase A antes que B, B antes que C, C antes que D; dentro de D, Telemetría antes que Observabilidad, Observabilidad antes que la propia decisión de acceso de Analítica.

Un hallazgo metodológico adicional, verificado por el propio trabajo, no una afirmación: **la autocorrección forma parte del método, no es una excepción a él.** El hallazgo inicial sobre Observabilidad (que exigiría lectura multiusuario) fue retirado tras una verificación más rigurosa que localizó su error en una interpretación ya descartada durante el cierre de Bloque II — el mismo rigor que se aplica a la documentación externa se aplicó también al propio razonamiento de esta sesión.

---

## 5. Principios consolidados

No componentes — principios, extraídos únicamente de lo realmente demostrado en este Bloque:

1. **Repository Layer es la única frontera de persistencia de todo el ecosistema** — sin excepción demostrada en ningún componente cerrado; incluso DT-004 refuerza este principio en vez de excepcionarlo.
2. **La dependencia entre capas es unidireccional y no se invierte** — Núcleo → Servicios de Plataforma → Dominios Funcionales, nunca al revés (DT-003).
3. **Toda mutación de persistencia ocurre mediante operaciones nombradas, con contrato propio** — nunca una escritura genérica, principio que evolucionó explícitamente desde el cierre de Accounting Engine.
4. **La degradación segura es la norma, no la excepción** — un dato sin fuente real se declara explícitamente "no disponible", nunca se inventa ni se aproxima.
5. **Toda reapertura de un contrato ya congelado exige un defecto demostrable, nunca una preferencia de diseño** — único criterio aplicado en las tres reaperturas reales de todo el proyecto (SC-004.5, SC-004.7, SC-004.2).
6. **No se introduce un mecanismo paralelo cuando puede extenderse un principio ya existente** — criterio explícito que decidió DT-004.
7. **Las Decisiones Transversales son el único mecanismo legítimo para alterar o extender un principio de Nivel 1** — ninguna necesidad transversal se resuelve dentro del Plan Técnico de un solo componente.
8. **Ninguna incidencia se convierte en arquitectura nueva sin evidencia de necesidad real** — las investigaciones existen para verificar, no para justificar construir por anticipación.
9. **Distinguir vacío de planificación de vacío de implementación determina si corresponde una investigación de encaje o simplemente construir** — criterio que evitó abrir una investigación innecesaria para la persistencia de `ExecutionAudit`.
10. **El Registro de Pendientes Arquitectónicos es un mecanismo permanente de gobernanza, no un documento puntual** — ningún cierre de componente, fase o bloque puede ignorar su revisión; ningún Bloque puede declararse cerrado con un pendiente marcado como bloqueante sin resolver — principio que es, precisamente, la razón de que este documento no sea un Acta de Cierre.

---

## 6. Estado actual del Bloque III

**Completamente congelado y consolidado:**
- Bloque I (Núcleo de Procesamiento) y Bloque II (Subsistemas de ScenaIA) — arquitectura, sin cambios desde la Fase 4.
- Fase A (Repository Layer, Knowledge Assets, Accounting Engine) — completa.
- Fase B (7 componentes del Núcleo) — completa, con Acta Global propia.
- Fase C (Procesos Asíncronos, Mi Trayectoria®) — completa, con Acta Global propia.
- Dentro de Fase D: Telemetría y Observabilidad — cerrados.
- DT-001, DT-002, DT-003, DT-004 — las cuatro congeladas como Arquitectura Oficial.

**Pendiente, verificado y registrado, no oculto:**
- **Analítica** — mecanismo de acceso ya decidido (DT-004); Plan Técnico e implementación todavía no iniciados.
- **Fase E completa** (Sistemas de Caché, Subsistemas de Aprendizaje) — sin iniciar; bloqueada por R-02/**P-011**.
- **Orquestación real del pipeline (SPO)** — investigada, encaje arquitectónico determinado, sin decisión de la Dirección sobre cuál de las cuatro opciones adoptar (**P-006**, bloquea el cierre del Bloque).
- **Especificación detallada de Outbound/Inbound Provider Gateway** (**P-008, P-009**) — frontera congelada, sin fase asignada en el Plan Maestro.
- **Hueco de `tipo_perfil` para el usuario de sistema de DT-004** (**P-015**) — detalle de implementación derivado de una decisión ya congelada.
- Siete incidencias arquitectónicas abiertas heredadas de Fase B (**P-001 a P-005, P-007**) — ninguna bloquea el cierre de ningún Bloque hasta ahora; todas bloquean, en distinto grado, que el proyecto pueda declararse funcionalmente completo.

**Qué pasaría al siguiente bloque, si se confirmara en su momento:** no hay todavía una decisión que lo determine. La resolución de P-006 podría asignarse a una fase nueva dentro de este mismo Bloque III, o a un futuro Bloque IV — la investigación ya realizada presentó ambas opciones sin elegir ninguna (Sección 6 de `investigacion-orquestacion-del-pipeline.md`).

---

## 7. Lecciones arquitectónicas

Solo lo demostrado por el propio trabajo, no opiniones:

1. **Varias investigaciones eliminaron complejidad en vez de añadirla.** La investigación de Fase C cerró sin abrir ninguna Decisión Transversal; el Hallazgo 2 de Analítica se reclasificó de "posible vacío de planificación" a "ampliación normal de Repository Layer", evitando una investigación que habría sido innecesaria.
2. **Diferenciar correctamente problema arquitectónico de problema de implementación evitó decisiones innecesarias** — el mismo criterio metodológico que cerró Fase C sin abrir una DT fue, aplicado con el mismo rigor, el que sí abrió DT-004 cuando la evidencia cambió.
3. **Las Decisiones Transversales se congelaron únicamente cuando existió evidencia demostrable, nunca por anticipación** — las cuatro tienen, cada una, un defecto o una necesidad real y verificada como origen documentado, no una hipótesis.
4. **La verificación documental se aplicó también contra el propio razonamiento, no solo contra fuentes externas** — la autocorrección del hallazgo de Observabilidad demostró que el método detecta errores propios, no únicamente ajenos.

---

## 8. Declaración

Este documento no cierra el Bloque III. Lo consolida hasta este punto exacto, con el mismo criterio que ha regido cada decisión tomada dentro de él: una arquitectura no se da por asentada cuando deja de haber trabajo pendiente por delante — se da por asentada cuando deja de haber decisiones arquitectónicas sin resolver por debajo.

A fecha de hoy, Analítica, la Fase E completa, y la orquestación real del pipeline siguen abiertas — no como pendientes escondidos, sino como pendientes nombrados, investigados hasta donde correspondía, y registrados en el Registro de Pendientes Arquitectónicos para que ninguno se pierda entre sesiones. Ninguno de ellos fue barrido debajo de la alfombra para poder escribir antes esta consolidación.

Cuando esos pendientes bloqueantes queden resueltos, la futura Acta Global de Cierre del Bloque III podrá apoyarse en este documento sin tener que reconstruirlo. Hasta entonces, lo que aquí queda consolidado lo está por convicción — no por haberse agotado el trabajo pendiente, ni por haberse postergado su revisión por comodidad.
