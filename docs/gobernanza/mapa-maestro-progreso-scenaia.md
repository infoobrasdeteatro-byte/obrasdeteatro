# MAPA MAESTRO DE PROGRESO — ScenaIA (ObrasDeTeatro®)

**Fecha:** 2026-07-19 (auditoría original), **actualizado 2026-07-19** tras concluir la clasificación del orquestador del flujo completo y el análisis del vacío de acceso a `ExecutionAudit`.
**Alcance:** auditoría de estado, no de código ni de arquitectura. No se abre ni se modifica ningún componente durante este documento.
**Fuente de evidencia, sin excepción:** el conjunto de información cuya trazabilidad ha quedado demostrada en el historial de esta conversación (arquitectura Nivel 1 congelada + Actas archivadas anteriores al 2026-07-18 + código verificado). **No se utiliza ningún artefacto del Conjunto B/C** del incidente de trazabilidad abierto el 2026-07-19 (`docs/auditoria/inventario-trazabilidad-claude-2026-07-19.md`), sigue sin resolver. Donde ese incidente afecta a la certeza de una respuesta, se declara expresamente, no se completa por inferencia.

**Actualización posterior a la auditoría original, registrada aquí:** dos actividades de gobernanza se abrieron y concluyeron después de la primera versión de este Mapa — (1) verificación documental limitada que clasifica el orquestador del flujo completo como *"patrón de coordinación congelado, sin agente de ejecución asignado"* (`docs/gobernanza/verificacion-orquestador-flujo-completo.md`); (2) investigación y validación del vacío arquitectónico de acceso a `ExecutionAudit`, con 12 propiedades obligatorias acreditadas para una futura decisión de diseño, todavía no abierta (`docs/gobernanza/propiedades-mecanismo-acceso-execution-audit.md`, `docs/gobernanza/acta-validacion-propiedades-execution-audit.md`). Ninguna de las dos modifica la arquitectura ni propone mecanismo — ambas quedan reflejadas en las secciones correspondientes de este Mapa.

---

## 1. Estructura del proyecto

### Bloques

| Bloque | Contenido | Estado |
|---|---|---|
| **I — Núcleo de Procesamiento** | 7 componentes (Request Interpreter, PCE, SKM, Decision Engine, Credit Manager, AI Gateway, Response Composer) | Arquitectura **CERRADA/CONGELADA** (2026-07-12) |
| **II — Subsistemas de ScenaIA** | Repository Layer, Knowledge Assets, Accounting Engine, Sistemas de Caché, Observabilidad, Telemetría, Analítica, Procesos Asíncronos, Subsistemas de Aprendizaje, Mi Trayectoria®, DT-001/002/003 | Arquitectura **CERRADA/CONGELADA** (2026-07-13) |
| **III — Implementación** | Ejecuta lo anterior sobre código real, en 5 fases (ver abajo) | **EN DESARROLLO** |

**Incertidumbre documental declarada:** no existe, en el repositorio, ningún archivo verificado que registre formalmente el cierre del Bloque I ni la apertura del Bloque III — ambos hechos constan únicamente en el historial conversacional de esta arquitectura, nunca se archivaron como documento independiente antes del incidente de trazabilidad. Se cita aquí como hecho conocido por esa vía, no como archivo verificable hoy.

### Fases del Bloque III (Plan Maestro aprobado 2026-07-13, orden ya auditado)

| Fase | Componentes previstos |
|---|---|
| **A — Infraestructura Fundamental** | Repository Layer → Knowledge Assets → Accounting Engine |
| **B — Núcleo** | Request Interpreter → PCE → SKM → Decision Engine → Credit Manager → AI Gateway → Response Composer *(7, no 8: Response Dispatcher absorbido por AI Gateway, R-01)* |
| **C — Asíncrono** | Procesos Asíncronos → Mi Trayectoria® |
| **D — Instrumentación** | Telemetría → Observabilidad → Analítica |
| **E — Optimización** | Sistemas de Caché → Subsistemas de Aprendizaje |

No existen fases posteriores a la E en el Plan Maestro verificado. Cualquier referencia a una "Fase F" pertenece al Conjunto B, no verificado, y no se usa aquí.

**Elemento sin fase asignada, verificado en el propio Plan Maestro:** el **orquestador del flujo completo** (rol conceptual del SPO, SC-003) nunca recibió un componente ni una fase propia en las 5 fases aprobadas — su único rastro es el papel conceptual de coordinación descrito en SC-003, con dos de sus cuatro piezas originales (Decision Engine, AI Gateway) ya implementadas dentro de Fase B y las otras dos (Credit Manager, Response Dispatcher) resueltas de otro modo (Credit Manager con Acta propia; Response Dispatcher absorbido). Ningún documento asigna la responsabilidad de invocar la secuencia completa a ningún componente ya construido. **Clasificación formal ya concluida (2026-07-19):** no es un componente arquitectónico pendiente ni una responsabilidad distribuida entre los 7 del Núcleo (verificado, ninguno invoca a otro) — es un **patrón de coordinación congelado, sin agente de ejecución asignado**. Tampoco tienen fase asignada **Outbound/Inbound Provider Gateway** (DT-002, frontera/nomenclatura congelada, especificación detallada nunca retomada desde el cierre de la Fase 4).

---

## 2. Estado de cada componente

Solo tres valores, sin matices porcentuales, conforme a la instrucción.

### Fase A — CERRADA

| Componente | Estado |
|---|---|
| Repository Layer | Cerrado |
| Knowledge Assets | Cerrado |
| Accounting Engine | Cerrado |

### Fase B — CERRADA

| Componente | Estado |
|---|---|
| Request Interpreter | Cerrado |
| Professional Context Engine | Cerrado |
| ScenaIA Knowledge Model | Cerrado |
| Decision Engine | Cerrado |
| Credit Manager | Cerrado |
| AI Gateway | Cerrado |
| Response Composer | Cerrado |

### Fase C — CERRADA

| Componente | Estado |
|---|---|
| Procesos Asíncronos | Cerrado (v3, alcance completo) |
| Mi Trayectoria® | Cerrado (v1, alcance completo de su especificación Fase 1) |

### Fase D — EN CURSO

| Componente | Estado |
|---|---|
| Telemetría | Cerrado (v1) |
| Observabilidad | Cerrado (v1, implementación verificada en `lib/verified/observabilidad/` — ver nota de ubicación más abajo) |
| Analítica | No iniciado — ciclo de gobernanza **interrumpido en Verificación Documental** (2026-07-19), no por esta auditoría sino por un vacío arquitectónico transversal acreditado (ver §3 y `docs/actas-bloque-3/acta-verificacion-analitica.md`) |

### Fase E — NO INICIADA

| Componente | Estado |
|---|---|
| Sistemas de Caché | No iniciado |
| Subsistemas de Aprendizaje | No iniciado (bloqueado además por R-02, ver §3) |

### Fuera de las 5 fases, sin componente propio asignado

| Elemento | Estado |
|---|---|
| Orquestador del flujo completo (rol SPO) | **Cerrado** — implementación verificada en `lib/verified/orquestador/` (`coordinateFlow`), 2026-07-19. Sigue sin fase propia asignada en el Plan Maestro de 5 fases; ningún route handler lo invoca todavía (paso de integración de aplicación pendiente, no de arquitectura) |
| Mecanismo de acceso autorizado a `ExecutionAudit` | Vacío arquitectónico acreditado (2026-07-19), sin fase ni componente — 12 propiedades obligatorias validadas, ningún mecanismo propuesto todavía |
| Outbound Provider Gateway | No iniciado — sin fase asignada, solo frontera/nomenclatura congelada (DT-002) |
| Inbound Provider Gateway | No iniciado — mismo estado |

**Nota de ubicación (Observabilidad):** por el incidente de trazabilidad del repositorio, la implementación verificada vive en `lib/verified/observabilidad/`, no en la ruta estándar `lib/observabilidad/` (ocupada por contenido del Conjunto B, preservado sin modificar). El estado "Cerrado" aquí se refiere exclusivamente a la implementación verificada.

---

## 3. Dependencias

### Arquitectónicas (fijadas por SC-005/DT-003, no dependen del orden de implementación)

- Núcleo → puede usar Servicios de Plataforma. Nunca al revés.
- Dominios Funcionales (Mi Trayectoria®) → pueden usar Servicios de Plataforma. Nunca acceden a componentes internos del Núcleo.
- Núcleo → nunca depende directamente de un Dominio Funcional (DT-003) — la relación es de observación pasiva vía un Servicio de Plataforma (Procesos Asíncronos), nunca invocación directa.
- Repository Layer es la única frontera autorizada hacia persistencia — todo Servicio de Plataforma que persista pasa por ella.
- Observabilidad depende de Telemetría (frontera congelada: Telemetría es mecanismo, Observabilidad su único usuario autorizado). Analítica **no** puede apoyarse en Telemetría (misma frontera, en sentido negativo).
- **Analítica depende de que exista un mecanismo de acceso autorizado a `ExecutionAudit`** — verificado que no existe ninguno hoy (§ tabla anterior). No es una dependencia de implementación resoluble por Plan Técnico; es la ausencia de una autorización previa que ningún Plan Técnico puede suplir por sí solo. Bloquea la Delimitación de Alcance de Analítica, no solo su implementación.

### De implementación (orden real seguido, no exigido por la arquitectura en todos los casos)

- Knowledge Assets exigió una ampliación aditiva previa de Repository Layer (`works.ts`/`organizations.ts`).
- Accounting Engine exigió Repository Layer ya cerrado.
- Fase B (Núcleo) exigió Fase A completa (los 3 Servicios de Plataforma de los que depende) y R-01 resuelto (disposición de Response Dispatcher).
- Procesos Asíncronos/Mi Trayectoria® exigieron cerrar la investigación de "ejecución en segundo plano" antes de completarse (concluida: modelo de sesión diferida, sin nueva Decisión Transversal).
- Mi Trayectoria® exigió la ampliación aditiva `listActivityHistory()` de Procesos Asíncronos (semántica de historial, no de cola).
- Observabilidad exigió Telemetría cerrada primero (dependencia real de mecanismo, no solo de orden documental).
- Subsistemas de Aprendizaje (Fase E) bloqueado por **R-02**, prerrequisito de gobernanza ya fijado en el Plan Maestro: autorizar su primer contrato implementable, todavía no resuelto.

### Componentes que bloquean al orquestador (SPO), no al revés

El orquestador necesita que existan `executeAIRequest()`, `recordActivity()`, `recordMetric()` y `recordExecutionTrace()` para poder invocarlos — los cuatro ya existen y están cerrados. **La dependencia va en el sentido "el orquestador depende de que estos componentes existan", no en el sentido "estos componentes dependen del orquestador para funcionar como código"** — cada uno ya está implementado, probado y cerrado de forma independiente. Lo que depende del orquestador es la **ejecución real** del sistema completo, no el cierre de ningún componente ya cerrado.

---

## 4. Camino crítico hacia la primera ejecución funcional completa

**Distinción exigida por esta auditoría, y verificada como real, no supuesta:** "primera ejecución funcional" (una petición HTTP real recorre el pipeline completo y produce una respuesta válida) es un objetivo distinto y anterior a "finalización completa del proyecto" (todas las incidencias resueltas, todos los proveedores de IA integrados, Fase E completa, etc.).

**Hallazgo central, ya verificado en la Acta de Verificación de Fase D y confirmado de nuevo durante el cierre de Observabilidad:** hoy, `grep` sobre `app/` no encuentra ninguna invocación real a `executeAIRequest`, `recordActivity`, `recordMetric` ni `recordExecutionTrace`. **Los 7 componentes del Núcleo, más Repository Layer, Knowledge Assets, Accounting Engine, Procesos Asíncronos, Mi Trayectoria®, Telemetría y Observabilidad (verificada) están cerrados y probados por unidad, pero ninguno ha sido invocado nunca en secuencia por una petición real.**

**Verificado además, contra el código real de Response Composer y AI Gateway, que la ausencia de datos reales no impide una respuesta válida:**
- Si la petición no necesita IA → `RESPONSE_DIRECT`, alcanzable hoy con plantilla fija.
- Si necesita IA pero no hay saldo verificable (IA-001 sin resolver) → Credit Manager deniega de forma fail-closed → `RESPONSE_DENIED`, alcanzable hoy.
- Si necesita IA, hay autorización, pero no hay proveedor integrado (IA-006 sin resolver) → AI Gateway devuelve `SIN_PROVEEDOR` → Response Composer produce `RESPONSE_ERROR`, alcanzable hoy.

**Criterio oficial adoptado (2026-07-19):** tras la Aclaración de Gobernanza (`aclaracion-interpretacion-camino-critico.md`) y la Decisión de Gobernanza correspondiente (`decision-criterio-primer-ensayo-funcional.md`), la Dirección adoptó formalmente la **Lectura A** como criterio de aceptación del "primer ensayo funcional": *"el pipeline completo se ejecuta y devuelve una respuesta válida de principio a fin"* (routing funcional), sin exigir generación real de contenido por un proveedor de IA. La Lectura B (routing + contenido real de IA) queda descartada como criterio de este hito — sin que ello reduzca la prioridad arquitectónica de IA-001/IA-006 para la finalización completa del proyecto (precisión de alcance expresamente confirmada al aprobar la decisión).

**Actualización final (2026-07-19): camino crítico completado.** El orquestador quedó implementado y cerrado (`lib/verified/orquestador/`), y la integración de aplicación (`app/api/scenaia-verified/route.ts`) conecta una petición HTTP real con `coordinateFlow()` — verificado por prueba, 290/290 pruebas del proyecto sin regresiones. **El criterio oficial del primer ensayo funcional (Lectura A) queda satisfecho a nivel de arquitectura e integración** (Acta en `docs/gobernanza/acta-integracion-primer-ensayo-funcional.md`). Único punto no verificado en esta actividad: ejecución manual contra un servidor real desplegado — validación pendiente del mismo tipo que VD-001/002/003. IA-001/IA-004/IA-006 siguen sin bloquear este hito — pendientes solo para la finalización completa.

---

## 5. Componentes que pueden implementarse después del primer ensayo funcional, sin impedirlo

Ninguno de los siguientes participa en la ruta síncrona petición→respuesta ni es consumido por el orquestador para producir una respuesta — todos son observadores pasivos o Servicios de Plataforma independientes:

- **Analítica** (Fase D) — consumidor asíncrono de `ExecutionAudit`, nunca en el flujo síncrono.
- **Sistemas de Caché** (Fase E) — acelera lecturas ya autorizadas, no es requisito de ninguna ruta funcional mínima.
- **Subsistemas de Aprendizaje** (Fase E) — funcionamiento exclusivamente asíncrono, por diseño congelado.
- **Outbound/Inbound Provider Gateway** (DT-002) — necesarios para Stripe/proveedores no-IA, no para el flujo de ScenaIA en sí.
- La resolución de **IA-002, IA-003, IA-004, IA-007, IA-008** — cada una ya tiene una degradación seguraya construida y probada; resolverlas mejora la respuesta, no la habilita.

---

## 6. Estado global

**Dónde se encuentra el proyecto:** Bloque III, Fase D, en curso. Telemetría y Observabilidad (implementación verificada) cerrados; Analítica con su ciclo de gobernanza interrumpido en Verificación Documental, por un vacío arquitectónico acreditado (acceso a `ExecutionAudit`), no por falta de disponibilidad para avanzar.

**Fases completamente cerradas:** A, B, C.

**Fase activa:** D (Instrumentación) — 2 de 3 componentes cerrados; el tercero (Analítica) con su análisis en pausa de gobernanza.

**Dos vacíos arquitectónicos transversales, ambos acreditados y sin resolver, ninguno con decisión de diseño abierta todavía:**
1. Orquestador del flujo completo — patrón de coordinación sin agente asignado.
2. Mecanismo de acceso autorizado a `ExecutionAudit` — 12 propiedades obligatorias validadas, sin mecanismo propuesto.

**Siguiente hito importante — candidatos igualmente válidos, sin que este Mapa elija entre ellos:**
1. Abrir una fase de diseño arquitectónico sobre cualquiera de los dos vacíos ya acreditados (condición previa: ninguno de los dos tiene fase asignada en el Plan Maestro de 5 fases — abrirla requeriría, como mínimo, la misma decisión de gobernanza ya aplicada a R-01/R-02).
2. Adelantar Fase E (Sistemas de Caché), que no depende de ninguno de los dos vacíos.
3. Retomar Analítica, condicionado a que se resuelva primero el vacío de acceso a `ExecutionAudit` (§3).

---

## Respuestas directas exigidas por esta auditoría

**¿Cuántos componentes quedan hasta el primer ensayo funcional de ScenaIA?**
Ninguno. El orquestador quedó implementado y cerrado, y la integración de aplicación (`app/api/scenaia-verified/route.ts`) quedó completada y probada el 2026-07-19 — el criterio oficial (Lectura A) queda satisfecho a nivel de arquitectura e integración. Solo permanece sin verificar la ejecución manual contra un servidor desplegado, fuera del alcance de esta gobernanza.

**¿Qué componentes quedan para completar ScenaIA?**
Analítica (Fase D), Sistemas de Caché y Subsistemas de Aprendizaje (Fase E, esta última bloqueada por R-02), Outbound/Inbound Provider Gateway (sin fase asignada, DT-002), y la resolución de las 7 incidencias arquitectónicas abiertas (IA-001, IA-002, IA-003, IA-004, IA-006, IA-007, IA-008) — ninguna bloqueante para una primera ejecución, todas pendientes para la finalización completa.

**¿Cuál es el camino crítico real del proyecto?**
Para la primera ejecución funcional (criterio oficial: Lectura A): el orquestador del flujo completo, un elemento sin fase asignada en el Plan Maestro, es el único bloqueante. Para la finalización completa: además de todo lo implementado hasta ahora, Analítica, Fase E completa (con R-02 resuelto), los dos Provider Gateway, y las 7 incidencias arquitectónicas abiertas (incluidas IA-001 e IA-006, sin prioridad reducida para este objetivo).
