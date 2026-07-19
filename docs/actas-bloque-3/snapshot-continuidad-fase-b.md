# SNAPSHOT DE CONTINUIDAD ARQUITECTÓNICA
## ScenaIA — ObrasDeTeatro® — Fin de Fase B, Bloque III

**Propósito de este documento:** permitir retomar el proyecto exactamente desde este estado, sin pérdida de contexto técnico ni arquitectónico. No es un resumen — es un documento de trabajo autosuficiente.

**Fecha del snapshot:** 2026-07-16
**Punto de referencia arquitectónico vigente:** commit `5976d1f`, rama `main`, repositorio `Desktop/obrasdeteatro`.

---

## 1. Estado global del proyecto

ScenaIA es el sistema de inteligencia de ObrasDeTeatro® — arquitectura de inteligencia especializada construida sobre el ecosistema profesional existente, no en sustitución de él. Principio rector: Contexto propio → Conocimiento del ecosistema → (solo entonces) modelo de IA externo.

El proyecto se encuentra en **Bloque III — Implementación**, dentro del Plan Maestro de 5 fases aprobado el 2026-07-13. **Fase A y Fase B están completas.** El proyecto está en **pausa operativa autorizada**, con la Fase C pendiente de apertura formal.

## 2. Fases completadas

- **Fase 4 (transferencia de conocimiento arquitectónico)** — CERRADA 2026-07-13. Congela Bloque I (Núcleo de Procesamiento, documentado) + Bloque II (Servicios de Plataforma, documentado) + Informe de Evaluación Técnica, veredicto A.
- **Bloque III, Fase A (Infraestructura Fundamental)** — COMPLETA: Repository Layer → Knowledge Assets → Accounting Engine.
- **Bloque III, Fase B (Núcleo Cognitivo, implementación real)** — COMPLETA: 7 componentes, orden corregido tras R-01.

## 3. Componentes implementados (código real, no solo documentado)

| Componente | Documento | Módulo real |
|---|---|---|
| Repository Layer | SC-005.1 | `lib/repository-layer/` |
| Knowledge Assets | SC-005.2 | `lib/knowledge-assets/` |
| Accounting Engine | SC-005.3 | `lib/accounting-engine/` + `lib/repository-layer/accounting.ts` + migración SQL |
| Request Interpreter | SC-004.4 | `lib/request-interpreter/` |
| Professional Context Engine | SC-004.1 | `lib/professional-context-engine/` |
| ScenaIA Knowledge Model | SC-002 / SC-004.3 | `lib/scenaia-knowledge-model/` |
| Decision Engine | SC-004.2 (ampliado) | `lib/decision-engine/` |
| Credit Manager | SC-004.5 | `lib/credit-manager/` |
| AI Gateway | SC-004.7 (absorbe Response Dispatcher) | `lib/ai-gateway/` |
| Response Composer | SC-004.6 | `lib/response-composer/` |

**10 módulos reales, 43 archivos de test, 161 pruebas, todas pasando.**

## 4. Componentes pendientes (por orden del Plan Maestro)

- **Fase C (Asíncrono):** Procesos Asíncronos → Mi Trayectoria®. **No iniciada.**
- **Fase D (Instrumentación):** Telemetría → Observabilidad → Analítica (orden corregido tras auditoría). **No iniciada.**
- **Fase E (Optimización):** Sistemas de Caché → Subsistemas de Aprendizaje. **No iniciada.**
- **R-02** (prerrequisito de gobernanza, antes del segundo componente de Fase E): autorizar el primer contrato implementable de Subsistemas de Aprendizaje. **No resuelto todavía.**

## 5. Estado exacto de la arquitectura

- **Bloque I y Bloque II:** Arquitectura Oficial, congelada, sin cambios desde el cierre de Fase 4, salvo las dos reaperturas documentadas en la sección 6.
- **Bloque III, Fase A:** cerrada, sin componentes en estado intermedio.
- **Bloque III, Fase B:** cerrada, sin componentes en estado intermedio.
- **Ningún componente de Fase C/D/E tiene código real** — solo existen como documentos ya congelados desde Fase 4.

## 6. Reaperturas realizadas (únicamente dos en todo el Bloque III)

1. **SC-004.5 (Credit Manager), 2026-07-13, previa a Fase B.** Motivo: TOCTOU demostrable en la relación con el saldo de créditos. Resultado: Accounting Engine pasa a ser propietario exclusivo del saldo; Credit Manager gana dependencia acotada hacia Accounting Engine para "verificar y reservar". Requirió también una reapertura mínima asociada de **SC-004.7** (usos autorizados de `ExecutionAudit`, ampliados para incluir a Accounting Engine).
2. **SC-004.2 (Decision Engine), 2026-07-16, durante Fase B.** Motivo: tres factores de decisión ya congelados (intención, tipo de petición, complejidad) carecían de canal de entrada bajo el contrato original de "exactamente dos entradas". Causa raíz: SC-004.2 se redactó antes que SC-004.4 (Request Interpreter) formalizara esos conceptos. Resultado: contrato de entrada ampliado a tres — `NormalizedRequest`, `ProfessionalContext`, `KnowledgeContext`. No se modificó `DecisionContext`, ADR-001, SC-004.3 ni SC-004.4.

**Ninguna otra reapertura fue necesaria.**

## 7. Reaperturas propuestas y descartadas (por qué importa distinguirlas)

- **IA-005** (propuesta): posible contradicción entre el modelo de reservas instantáneas de Accounting Engine y el modelo de cuotas por periodo de §9.2. **Retirada** tras análisis específico: no había contradicción documental, solo una responsabilidad (cuotas por periodo) nunca asignada a nadie — el responsable natural sería el propio Credit Manager, si algún día se resuelve.
- **Hallazgo inicial sobre `RESPONSE_DIRECT`** (Response Composer): propuesto como comparable a SC-004.2. **Retirado** tras una pregunta específica de la Dirección: el propio texto de SC-004.6 ("no interpreta conocimiento") descarta que Response Composer deba sintetizar contenido desde `KnowledgeContext` — el vacío real era de responsabilidad no asignada (mismo patrón que IA-007), registrado como **IA-008**, sin tocar el contrato.

**Lección operativa a preservar:** el criterio para reabrir un documento es exclusivamente "defecto demostrable", nunca "alternativa más elegante" ni "parece que falta algo". Cuando ese criterio no se cumplía, no se reabrió — ni siquiera tras haberlo propuesto yo mismo.

## 8. Decisiones arquitectónicas importantes tomadas durante el Bloque III

- **R-01 (2026-07-16):** Response Dispatcher queda formalmente absorbido por AI Gateway — su única responsabilidad documentada ("entrega el resultado al Response Composer") ya coincidía con el contrato congelado de AI Gateway. Deja de existir como componente independiente. Orden de Fase B corregido de 8 a 7 componentes.
- **Evolución del invariante general de Repository Layer (durante Accounting Engine):** de "exclusivamente de lectura" (garantía de implementación, nunca parte del contrato de SC-005.1) a "única frontera autorizada hacia persistencia; toda mutación exclusivamente mediante operaciones nombradas, con contrato propio, invariantes demostrados y aprobación arquitectónica previa". No reabre los 4 archivos ya cerrados de Repository Layer.
- **Rechazo de la heurística de coste en Decision Engine:** `estimatedCost` permanece `null` (IA-004) en vez de aceptar una heurística explícitamente etiquetada como "provisional" (`baja→1/media→2/alta→3`). Precedente: ni siquiera una heurística declarada como temporal sustituye a "no disponible" cuando no hay fuente documental.
- **`Number(usageLimits)` en Credit Manager no presupone el formato futuro de IA-001** — acepta únicamente cadenas numéricas planas, cualquier otra representación (p. ej. nombre de plan) también deniega de forma segura.
- **`AUTHORIZED` con `needsAI=false` es "constatación de ausencia de operación económica", no autorización económica** — distinción reforzada con el prefijo textual `NO_APLICA`.
- **AI Gateway v1 no ejecuta ninguna llamada real a proveedor de IA** — decisión deliberada de alcance, no limitación accidental: no existe SDK, credenciales ni catálogo de proveedores en el repositorio, y fabricar una respuesta simulada en producción se consideró una invención inaceptable.

## 9. Principios consolidados durante el Bloque III (aplicables a toda fase futura)

1. **Degradación segura como norma:** todo dato sin fuente real se marca `null`/estado explícito — nunca se inventa.
2. **Fail-closed en puntos de autorización:** ante imposibilidad de verificar, la respuesta correcta es denegar, nunca autorizar por defecto.
3. **Canal de entrada ausente (exige reapertura) ≠ responsabilidad no asignada (no bloquea al componente que la señala).** Distinción que evitó una reapertura innecesaria de SC-004.6.
4. **Valores de contrato "reservados pero no alcanzables hoy" se declaran explícitamente en el tipo**, nunca se omiten (`ProfessionalContextLevel.FULL`, `ExecutionStatus.EJECUTADO`/`ERROR_COMUNICACION`, `ResponseType.RESPONSE_SUCCESS`/`RESPONSE_PARTIAL`).
5. **Ninguna heurística sustituye a "no disponible"**, ni siquiera etiquetada como provisional.
6. **Toda reapertura exige demostrar un defecto, no una preferencia** — aplicado en ambas direcciones.
7. **No duplicar fuentes de verdad** — tipos reutilizados entre módulos (`PriorityLevel = EstimatedComplexity`, `ProfessionalProfilePublic` reutilizado en PCE, `StructuredKnowledgeItem` reutilizado en SKM) en vez de redeclarar.
8. **Ampliaciones aditivas de un componente cerrado no lo reabren**, si no tocan lo ya cerrado (Repository Layer se amplió tres veces: Knowledge Assets, Accounting Engine, y su propio invariante general).

## 10. Estado de implementación detallado

### Repository Layer (SC-005.1) — cerrado en Fase A, ampliado 2 veces después
`getIdentity`, `getProfessionalProfilePublic`, `getPublishedWorkById`/`listPublishedWorks`, `getPublicOrganizationById`/`listPublicOrganizations`, `verifyAndReserve`/`settleReservation`/`releaseReservation`/`expireStaleReservations` (accounting.ts, escritura vía RPC exclusivamente). Invariante general ya evolucionado (sección 8). `getSpecializedProfile` retirado (RA-001, IA-002 abierta). Sin accessor de Subscription (IA-001, exclusión intencional).

### Knowledge Assets (SC-005.2) — cerrado en Fase A
`getWorkKnowledge`/`listWorkKnowledge`, `getOrganizationKnowledge`/`listOrganizationKnowledge`, `listStructuredKnowledge`. Cobertura real: **2 de 8 dominios CAT-001** (Obras, Organizaciones). Los 6 restantes, IA-003.

### Accounting Engine (SC-005.3) — cerrado en Fase A
Tabla `credit_reservations` + 4 funciones atómicas `SECURITY DEFINER` (`accounting_verify_and_reserve`, `accounting_settle_reservation`, `accounting_release_reservation`, `accounting_expire_stale_reservations`). **Migración nunca aplicada a ningún proyecto Supabase real** (VD-003). Ciclo de vida: reserva `active` cuenta como consumo instantáneo (no acumula por periodo de facturación — ver riesgo en sección 13).

### Los siete componentes del Núcleo (Fase B)
Ver sección 3 para el mapeo documento↔módulo. Cadena de dependencias real: `Request Interpreter → Professional Context Engine → ScenaIA Knowledge Model → Decision Engine → Credit Manager → AI Gateway → Response Composer`. Ningún componente del Núcleo importa Supabase directamente ni accede a Repository Layer salvo PCE (autorizado). SKM y el resto del Núcleo pasan exclusivamente por Knowledge Assets/Accounting Engine.

**Dato crítico para la continuidad:** en el estado actual del repositorio, **ninguna ejecución real del pipeline completo puede producir una respuesta con contenido de IA** — Credit Manager deniega sistemáticamente (IA-001/IA-004 abiertas) y AI Gateway nunca ejecuta (IA-006). Todo el pipeline está implementado, probado y listo, pero inerte en producción hasta que esas incidencias de datos/negocio se resuelvan. Esto es un estado deliberado y aceptado, no un defecto.

## 11. Commit de preservación y estado del árbol

- **Commit vigente:** `5976d1f` — *"feat(scenaia): Bloque III -- Accounting Engine + Fase B completa (Nucleo) -- commit de preservacion"*.
- **Rama:** `main`. **Local, no subido a `origin/main`** (ahead 2 respecto al remoto — ni este commit ni `f45c856` se han empujado).
- **Árbol de trabajo:** limpio, verificado en el momento de este snapshot (`git status --short` sin salida).
- **Commit anterior de referencia:** `f45c856` (Repository Layer + Knowledge Assets, Fase A parcial).

## 12. Registro consolidado de incidencias

### IA-xxx — Incidencias arquitectónicas, todas abiertas y no bloqueantes

| ID | Descripción | Afecta a |
|---|---|---|
| IA-001 | Fuente autoritativa de Subscription/plan (`profiles.plan` vs `subscriptions.plan`) | PCE, Credit Manager |
| IA-002 | Contrato de perfiles profesionales especializados | PCE, Repository Layer |
| IA-003 | Tecnología de recuperación semántica/vectorial/de grafos | Knowledge Assets, SKM |
| IA-004 | Política oficial de estimación de coste | Decision Engine, Credit Manager |
| ~~IA-005~~ | Retirada — sin fundamento documental | — |
| IA-006 | Catálogo e integración técnica real de proveedores de IA | AI Gateway, Response Composer |
| IA-007 | Responsable de iniciar la liquidación de Accounting Engine vía `ExecutionAudit` | AI Gateway (fuera de su alcance) |
| IA-008 | Responsable de producir contenido interpretado para `RESPONSE_DIRECT` | Response Composer |

### RA-xxx — Hallazgos de revisión arquitectónica, todos cerrados

| ID | Componente | Estado |
|---|---|---|
| RA-001, RA-002 | Repository Layer | Corregidos (Fase A) |
| RA-003 | Request Interpreter | Corregido |
| RA-004 | ScenaIA Knowledge Model | Corregido |
| RA-005 | Credit Manager | Corregido |

PCE, Decision Engine, AI Gateway, Response Composer cerraron sin hallazgos.

### VD-xxx — Validaciones diferidas, todas pendientes, ninguna bloqueante

| ID | Descripción |
|---|---|
| VD-001 | Propagación real de sesión de usuario (`next/headers`) — requiere contexto real de petición Next.js |
| VD-002 | Verificación dinámica de políticas RLS contra el proyecto Supabase real |
| VD-003 | Forma exacta de la respuesta PostgREST para las funciones RPC de Accounting Engine — migración nunca aplicada a un entorno vivo |

## 13. Riesgos conocidos para la Fase C

- **Procesos Asíncronos** tiene, por su propia misión ("observación pasiva de la actividad ya producida por el Núcleo"), una relación directa con `ResponseContext` (Response Composer) y potencialmente con `ExecutionAudit` — pero **IA-007 sigue sin resolver quién dispara la liquidación**, y Procesos Asíncronos ya fue confirmado explícitamente como **no autorizado** a consumir `ExecutionAudit`. Verificar con cuidado, al abrir Fase C, que no se repita el error ya corregido dos veces durante su cierre original (afirmar una autorización que el documento vecino no concede).
- **Mi Trayectoria®** depende de DT-003 (observación pasiva, nunca invocación directa desde el Núcleo) — ya congelado y sin incidencias, pero nunca implementado en código; verificar que Response Composer efectivamente produce lo que Mi Trayectoria® necesitaría observar.
- **El vacío de tracking de consumo por periodo** (identificado durante el análisis de IA-005, aunque la incidencia en sí se retiró) sigue latente: si en el futuro se implementan cupos mensuales reales, Accounting Engine tal como está construido hoy solo garantiza corrección instantánea/concurrente, no acumulación histórica. No es una incidencia registrada, pero conviene no olvidarlo si Fase C o posteriores tocan consumo/cuotas.
- Ninguna incidencia de Fase B bloquea Fase C, pero **IA-001, IA-004 e IA-006 siguen manteniendo todo el camino de IA inerte** — si Fase C incluye algo que dependa de una ejecución real de IA, se heredará la misma limitación.

## 14. Aspectos que NO deben replantearse al reanudar (ya cerrados definitivamente)

- La disposición de Response Dispatcher (R-01) — absorbido por AI Gateway, no reabrir esta pregunta.
- El contrato de entrada de Decision Engine (reapertura de SC-004.2) — ya ampliado a tres entradas, no es necesario volver a justificarlo.
- La dependencia de Credit Manager hacia Accounting Engine (reapertura de SC-004.5) — ya congelada.
- Que Response Composer **no** necesita `KnowledgeContext` como entrada — verificado documentalmente dos veces (una vez por error, una vez corregido).
- Que IA-005 no es una incidencia real — análisis ya cerrado, no reabrir salvo evidencia documental nueva y explícita.
- El invariante general evolucionado de Repository Layer — no volver a plantear si "debe" ser de solo lectura.
- Ningún componente de Fase A o Fase B requiere una nueva ronda de revisión salvo que cambie algo en sus propias dependencias.

## 15. Orden recomendado para continuar el desarrollo

1. **Retomar exactamente con Fase C**, en el orden ya fijado por el Plan Maestro: Procesos Asíncronos → Mi Trayectoria®. No hay ningún prerrequisito de gobernanza pendiente para abrir Fase C (a diferencia de R-01/R-02, que aplican a Fase B/E respectivamente).
2. Aplicar el mismo ciclo de siete pasos ya consolidado (verificación de espec. → contraste con estado real → identificación de incidencias → plan técnico → implementación → revisión → pruebas → Acta de Cierre).
3. Verificar con especial cuidado la frontera de Procesos Asíncronos con `ExecutionAudit`/IA-007 antes de escribir código (riesgo señalado en sección 13).
4. Al llegar al segundo componente de Fase E (Subsistemas de Aprendizaje), resolver primero **R-02** (prerrequisito de gobernanza ya identificado, no resuelto).
5. Las incidencias IA-001/IA-004/IA-006 no necesitan resolverse antes de continuar con Fase C — solo son relevantes si un componente futuro depende explícitamente de ejecución real de IA.

## 16. Observaciones finales para preservar la continuidad

- Todas las Actas individuales de Fase A y Fase B permanecen como registro detallado en `docs/actas-bloque-3/` — este snapshot no las sustituye, las consolida.
- La numeración de incidencias (IA-xxx, RA-xxx, VD-xxx) es correlativa a todo el Bloque III, nunca se reinicia por componente ni por fase — el próximo número disponible de cada serie, al reanudar, es **IA-009**, **RA-006**, **VD-004**.
- El repositorio real (`Desktop/obrasdeteatro`) es la fuente de verdad de Nivel 2 — este snapshot es fiel a su estado verificado en el momento de su redacción, pero debe recontrastarse contra el repositorio real al reanudar, no asumirse indefinidamente vigente.
- El criterio de gobernanza más importante a preservar, por encima de cualquier detalle técnico: **ninguna incidencia se resuelve con una decisión de código; toda reapertura exige un defecto demostrado, nunca una preferencia.**
