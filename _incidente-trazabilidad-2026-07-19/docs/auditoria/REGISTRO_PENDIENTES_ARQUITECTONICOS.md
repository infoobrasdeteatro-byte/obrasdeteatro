# REGISTRO OFICIAL DE PENDIENTES ARQUITECTÓNICOS — ScenaIA / ObrasDeTeatro®

**Versión:** 2.1 — P-018 actualizado con la condición de RA-006 (revisión de la tecnología de almacenamiento de Sistemas de Caché, hallazgo de la revisión arquitectónica posterior al cierre inicial), como precondición explícita antes de cualquier integración real.
**Fecha de creación:** 2026-07-18
**Origen:** Corte de Control del 2026-07-18 (`docs/auditoria/corte-de-control-2026-07-18.md`) y su Etapa 1 de gobernanza.

---

## 0. Propósito y regla de gobernanza

Este documento es el **registro único y oficial de todos los pendientes arquitectónicos reales** del proyecto ScenaIA — no una lista de ideas, mejoras futuras o hipótesis. Cada entrada nace de una Acta, una investigación, una auditoría o una Decisión Transversal ya existente; nada se incorpora aquí por primera vez sin esa procedencia documental.

**Regla de gobernanza vigente a partir de este documento:**

> No podrá declararse cerrado un Bloque, ni el proyecto completo, mientras exista algún pendiente marcado como **"Bloquea cierre"** (de Bloque o de proyecto, según corresponda) sin resolver.

**Regla de revisión obligatoria en cada cierre (incorporada 2026-07-18):**

> Toda Acta de Cierre — de componente, de fase o de bloque — deberá revisar explícitamente este Registro como parte de su propio cierre, respondiendo siempre a dos preguntas:
> 1. ¿Se ha cerrado, con este cierre, algún pendiente ya existente en el Registro?
> 2. ¿Ha aparecido, durante este cierre, algún pendiente nuevo?
>
> Si cualquiera de las dos respuestas es afirmativa, **el Registro debe actualizarse como parte del propio cierre** — nunca en un paso posterior separado. La Acta de Cierre correspondiente debe dejar constancia explícita de esta revisión (aunque ambas respuestas sean negativas), no solo actualizar el Registro en silencio.

**Disciplina de mantenimiento:**

- Al cerrar cada componente, cada Fase y cada Bloque, este registro debe revisarse y actualizarse — conforme a la regla anterior — antes o como parte de la propia Acta de cierre correspondiente.
- La numeración `P-xxx` es correlativa y permanente — nunca se reutiliza, ni siquiera si un pendiente se resuelve o se retira.
- Un pendiente resuelto no se elimina: su `Estado` pasa a **RESUELTO**, con fecha y referencia a la Acta que lo cerró, permaneciendo como registro histórico.
- Un pendiente retirado (por no ser real, tras verificación) pasa a **RETIRADO**, con la misma justificación exigida ya en el resto del proyecto para incidencias retiradas (p. ej. IA-005, IA-009).
- Cualquier pendiente nuevo detectado en el futuro se incorpora con el siguiente número disponible, con los mismos 8 campos exigidos aquí.

---

## 1. Vista resumen (para verificación rápida de cierre)

| ID | Pendiente | Estado | ¿Bloquea Bloque? | ¿Bloquea proyecto? |
|---|---|---|---|---|
| P-001 | Fuente autoritativa de Subscription/plan | Abierto | No | Sí |
| P-002 | Contrato de perfiles profesionales especializados | Abierto | No | Sí |
| P-003 | Tecnología de recuperación semántica/vectorial/de grafos | Abierto | No | Sí |
| P-004 | Política oficial de estimación de coste | Abierto | No | Sí |
| P-005 | Catálogo e integración técnica real de proveedores de IA | Abierto | No | Sí |
| P-006 | Orquestación real del pipeline del Núcleo (SPO, SC-003) | RESUELTO — mecanismo implementado; síntoma de conexión trasladado a P-017 | No | No |
| P-007 | Responsable de contenido interpretado para RESPONSE_DIRECT | Abierto | No | Sí |
| P-008 | Especificación detallada de Outbound Provider Gateway | Abierto | No | Condicional (ver entrada) |
| P-009 | Especificación detallada de Inbound Provider Gateway | Abierto | No | Condicional (ver entrada) |
| P-010 | Relación DT-001↔DT-002 para eventos entrantes sin `RequestId` | Abierto | No | Condicional (depende de P-009) |
| P-011 | R-02 — primer contrato implementable de Subsistemas de Aprendizaje | Abierto | **Sí** (Fase E) | **Sí** |
| P-012 | Acceso agregado multi-usuario para Observabilidad/Analítica | RESUELTO — mecanismo decidido e implementado (DT-004); datos reales pendientes de P-015 | No | No |
| P-013 | Migraciones/RLS nunca verificadas contra un proyecto Supabase real | Abierto | No | Sí (antes de producción real) |
| P-014 | Webhook de Stripe con clave privilegiada, sin incidencia formal | Identificado, sin registrar formalmente | No | Ambiguo — ver entrada |
| P-015 | Hueco de `tipo_perfil` para el usuario de sistema de DT-004 | Abierto — bloquea la política de `SELECT` de `execution_audit_log` | No | No |
| P-016 | Algoritmo de interpretación agregada de Analítica, no diseñado | Abierto por diseño (v1 mínimo) | No | Sí |
| P-017 | Conexión real del SPO a un mecanismo de entrada (route handler) | RESUELTO — `app/api/scenaia/route.ts` implementado | No | No |
| P-018 | Integración real de Sistemas de Caché en Repository Layer | Abierto por diseño (mecanismo construido, sin integrar) | No | No |

**Lectura de esta vista, a fecha 2026-07-18 (actualizada tras el cierre de P-017):** Fase D y Fase F completas; P-006 y P-017 resueltos — ScenaIA responde, por primera vez, a una petición real de usuario. **El único pendiente que sigue bloqueando el cierre del Bloque III es P-011** (Fase E, Subsistemas de Aprendizaje).

---

## 2. Entradas detalladas

### P-001 — Fuente autoritativa de Subscription/plan

- **Pendiente:** definir si `profiles.plan` (enum) o `subscriptions.plan` (string/Stripe) es la fuente autoritativa del plan del usuario — doble fuente de verdad confirmada contra el esquema real.
- **Origen:** implementación de Repository Layer.
- **Estado:** Abierto, no bloqueante (registrado originalmente como "Incidencia A").
- **Responsable arquitectónico / componente afectado:** Professional Context Engine, Credit Manager.
- **Momento previsto de resolución:** Sin fecha — pendiente de decisión de la Dirección.
- **¿Bloquea cierre del Bloque?** No — PCE y Credit Manager ya cerraron con degradación segura (`null`/fail-closed) aceptada explícitamente.
- **¿Bloquea cierre del proyecto?** Sí — sin esto, ningún enforcement real de límites por plan es posible; el modelo de cuotas de `ARQUITECTURA_FUNCIONAL_OBRASDETEATRO_v2.0.md` §9.2 no puede aplicarse en producción.
- **Referencia documental:** `docs/actas-bloque-3/acta-cierre-repository-layer.md` §6 (IA-001).

### P-002 — Contrato de perfiles profesionales especializados

- **Pendiente:** definir campo a campo el contrato público de acceso a perfiles especializados (actor, director, dramaturgo, compañía, etc.) — retirado del alcance original por exponer estructura física de tabla.
- **Origen:** revisión arquitectónica de Repository Layer (RA-001).
- **Estado:** Abierto, no bloqueante.
- **Responsable arquitectónico / componente afectado:** Repository Layer, Professional Context Engine.
- **Momento previsto de resolución:** Sin fecha.
- **¿Bloquea cierre del Bloque?** No — PCE cerró con esta sección siempre `null`, degradación aceptada.
- **¿Bloquea cierre del proyecto?** Sí — sin él, el contexto profesional que ScenaIA construye está estructuralmente incompleto.
- **Referencia documental:** `docs/actas-bloque-3/acta-cierre-repository-layer.md` §5 (RA-001), §6 (IA-002).

### P-003 — Tecnología de recuperación semántica/vectorial/de grafos

- **Pendiente:** definir la tecnología de recuperación semántica, motores vectoriales, grafos de conocimiento y embeddings para Knowledge Assets — inexistente hoy en el repositorio (sin `pgvector`, sin librería de embeddings).
- **Origen:** implementación de Knowledge Assets.
- **Estado:** Abierto, no bloqueante.
- **Responsable arquitectónico / componente afectado:** Knowledge Assets, ScenaIA Knowledge Model.
- **Momento previsto de resolución:** Sin fecha.
- **¿Bloquea cierre del Bloque?** No — Knowledge Assets y SKM cerraron con alcance parcial explícito (solo 2 de 8 dominios CAT-001).
- **¿Bloquea cierre del proyecto?** Sí — el SKM, declarado "fuente oficial de conocimiento" de todo ScenaIA (SC-002), no puede cumplir esa misión con solo 2 de 8 dominios.
- **Referencia documental:** `docs/actas-bloque-3/acta-cierre-knowledge-assets.md` §8 (IA-003).

### P-004 — Política oficial de estimación de coste

- **Pendiente:** definir la política/fórmula oficial de estimación de coste de una operación de IA — `estimatedCost` de Decision Engine siempre `null` hoy, tras rechazo explícito de una heurística provisional sin respaldo documental.
- **Origen:** implementación de Decision Engine.
- **Estado:** Abierto, no bloqueante.
- **Responsable arquitectónico / componente afectado:** Decision Engine, Credit Manager.
- **Momento previsto de resolución:** Sin fecha.
- **¿Bloquea cierre del Bloque?** No — Credit Manager cerró diseñado explícitamente para operar en fail-closed sin este dato.
- **¿Bloquea cierre del proyecto?** Sí — sin política de coste, ninguna autorización económica real basada en coste estimado es posible.
- **Referencia documental:** `docs/actas-bloque-3/acta-cierre-decision-engine.md` (IA-004).

### P-005 — Catálogo e integración técnica real de proveedores de IA

- **Pendiente:** integrar técnicamente al menos un proveedor de IA real (SDK/API) — AI Gateway v1 no ejecuta ninguna llamada real a IA; todos los campos técnicos de `ExecutionAudit` son siempre `null`.
- **Origen:** implementación de AI Gateway.
- **Estado:** Abierto, no bloqueante.
- **Responsable arquitectónico / componente afectado:** AI Gateway, Response Composer (indirectamente, `RESPONSE_SUCCESS`/`RESPONSE_PARTIAL` nunca alcanzables sin esto).
- **Momento previsto de resolución:** Sin fecha.
- **¿Bloquea cierre del Bloque?** No — AI Gateway y Response Composer cerraron con este vacío explícitamente aceptado (mismo tratamiento que valores de contrato "reservados pero no alcanzables hoy").
- **¿Bloquea cierre del proyecto?** Sí, de forma central — sin esto, ScenaIA no puede razonar con IA en ningún caso real. Es, de los catorce pendientes de este registro, el que más directamente contradice la misión fundacional de ScenaIA.
- **Referencia documental:** `docs/actas-bloque-3/acta-cierre-ai-gateway.md` §2 (IA-006).

### P-006 — Orquestación real del pipeline del Núcleo (SPO, SC-003)

- **Pendiente:** especificar e implementar la orquestación real del pipeline completo del Núcleo — hoy ningún route handler de la aplicación invoca la secuencia `Request Interpreter → ... → AI Gateway → Response Composer`, ni existe ningún punto real que invoque `recordActivity()` (Procesos Asíncronos) o `recordMetric()` (Telemetría).
- **Origen:** Corte de Control 2026-07-18; investigación documental de encaje arquitectónico cerrada el mismo día.
- **Estado:** **RESUELTO en su alcance de planificación, especificación e implementación del mecanismo (2026-07-18).** El SPO (`lib/spo/`, `processRequest()`) está implementado, probado y compone correctamente los 9 contratos obligatorios del recorrido oficial (`acta-cierre-spo.md`). **No queda resuelto el síntoma original** ("ningún route handler invoca la secuencia") — esa conexión fue excluida explícitamente del alcance de la especificación congelada desde su origen, nunca formó parte de la Fase F. Se separa en **P-017**, nuevo, para no mantener P-006 abierto por algo ajeno a su alcance ya cerrado.
- **Responsable arquitectónico / componente afectado:** SPO (mecanismo de coordinación del Núcleo) — implementado. Ver P-017 para la conexión real a una ruta de entrada.
- **Momento previsto de resolución:** Resuelto.
- **¿Bloquea cierre del Bloque?** No — el mecanismo en sí ya está implementado y cerrado. La condición original que motivó "Sí" se traslada íntegramente a P-017.
- **¿Bloquea cierre del proyecto?** No — trasladado a P-017.
- **Referencia documental:** `docs/actas-bloque-3/investigacion-orquestacion-del-pipeline.md`; `docs/actas-bloque-3/especificacion-arquitectonica-spo.md`; `docs/actas-bloque-3/acta-apertura-fase-f.md`; `docs/actas-bloque-3/acta-cierre-spo.md`; `docs/auditoria/corte-de-control-2026-07-18.md` §6, §8.1.

### P-007 — Responsable de producir contenido interpretado para RESPONSE_DIRECT

- **Pendiente:** asignar qué componente produce el contenido real cuando Decision Engine determina que no hace falta IA (`RESPONSE_DIRECT`) — Response Composer usa plantillas fijas hoy, nunca contenido interpretado desde `KnowledgeContext`.
- **Origen:** implementación de Response Composer.
- **Estado:** Abierto, no bloqueante, registrado de forma neutral (sin prejuzgar componente responsable futuro).
- **Responsable arquitectónico / componente afectado:** Response Composer (implementado, no afectado en su cierre) — responsable futuro todavía sin asignar.
- **Momento previsto de resolución:** Sin fecha.
- **¿Bloquea cierre del Bloque?** No — Response Composer cerró con plantillas fijas como solución completa para su alcance actual.
- **¿Bloquea cierre del proyecto?** Sí — sin esto, las respuestas directas de ScenaIA quedan limitadas a plantillas genéricas, sin aprovechar el conocimiento ya recuperado.
- **Referencia documental:** `docs/actas-bloque-3/acta-cierre-response-composer.md` (IA-008).

### P-008 — Especificación detallada de Outbound Provider Gateway

- **Pendiente:** redactar la especificación detallada (entradas, salidas, contrato) de Outbound Provider Gateway — hoy solo tiene congelada su frontera y nomenclatura (DT-002).
- **Origen:** addendum del Acta de Cierre de la Fase 4 (Bloque II); confirmado sin fase asignada en el Corte de Control 2026-07-18.
- **Estado:** Abierto — frontera congelada, especificación nunca escrita, **sin fase asignada en el Plan Maestro de Bloque III**.
- **Responsable arquitectónico / componente afectado:** Outbound Provider Gateway (Servicio de Plataforma, DT-002).
- **Momento previsto de resolución:** Sin fecha — requiere primero una decisión de gobernanza sobre en qué fase o ampliación del Plan Maestro encaja (mismo tipo de vacío de planificación que P-006, de menor alcance).
- **¿Bloquea cierre del Bloque?** No bloquea el cierre de ninguna de las 5 fases actualmente definidas (A–E) — ningún componente ya implementado depende de él.
- **¿Bloquea cierre del proyecto?** Condicional: sí, si "concluir el proyecto" implica implementar íntegramente la Arquitectura Oficial congelada (DT-002 congeló su existencia, no solo su posibilidad) — pendiente de que la Dirección precise ese criterio.
- **Referencia documental:** `docs/actas-bloque-3/acta-cierre-accounting-engine.md` §2 (mención explícita del vacío); `docs/auditoria/corte-de-control-2026-07-18.md` §3, §5.2, §6.5.

### P-009 — Especificación detallada de Inbound Provider Gateway

- **Pendiente:** mismo estado que P-008, componente hermano.
- **Origen:** addendum del Acta de Cierre de la Fase 4 (Bloque II).
- **Estado:** Abierto — frontera congelada, especificación nunca escrita, sin fase asignada.
- **Responsable arquitectónico / componente afectado:** Inbound Provider Gateway (Servicio de Plataforma, DT-002).
- **Momento previsto de resolución:** Sin fecha — mismo condicionante que P-008.
- **¿Bloquea cierre del Bloque?** No.
- **¿Bloquea cierre del proyecto?** Condicional — mismo razonamiento que P-008.
- **Referencia documental:** `docs/auditoria/corte-de-control-2026-07-18.md` §3, §5.2, §6.6.

### P-010 — Relación DT-001↔DT-002 para eventos entrantes sin `RequestId` de origen

- **Pendiente:** definir cómo se correlaciona (DT-001) un evento entrante de un proveedor externo (p. ej. un webhook de Stripe) que no se origina en una petición de ScenaIA con `RequestId` propio.
- **Origen:** cierre de DT-002.
- **Estado:** Abierto, señalado desde el cierre de DT-002, nunca resuelto.
- **Responsable arquitectónico / componente afectado:** DT-001 (Correlación de Peticiones), Inbound Provider Gateway.
- **Momento previsto de resolución:** Cuando se aborde P-009 (especificación de Inbound Provider Gateway).
- **¿Bloquea cierre del Bloque?** No.
- **¿Bloquea cierre del proyecto?** Condicional — depende directamente de si P-009 se resuelve como parte del alcance final del proyecto.
- **Referencia documental:** registro de gobernanza del cierre de DT-002 (memoria del proyecto — DT-002 nunca se archivó como documento propio en el repositorio, mismo vacío ya señalado para otros documentos SC-00x/DT-00x).

### P-011 — R-02: primer contrato implementable de Subsistemas de Aprendizaje

- **Pendiente:** autorizar el primer contrato implementable de Subsistemas de Aprendizaje — su documento de cierre (Bloque II) se declaró deliberadamente mínimo, sin Entradas/Dependencias/Salida concretas.
- **Origen:** auditoría del Plan Maestro de Bloque III (2026-07-13).
- **Estado:** Abierto — prerrequisito ya fijado en el propio Plan Maestro, antes del segundo componente de Fase E. **Dependencia real añadida (2026-07-18):** la Fase F (materialización del SPO, ver P-006) es prerrequisito arquitectónico para que Subsistemas de Aprendizaje disponga de actividad real del sistema — relación de dependencia lógica, no de numeración (la Fase E conserva su posición en el Plan Maestro).
- **Responsable arquitectónico / componente afectado:** Subsistemas de Aprendizaje (Servicio de Plataforma), Fase E — depende de que la Fase F esté completa.
- **Momento previsto de resolución:** Antes de iniciar el segundo componente de Fase E (tras Sistemas de Caché), y no antes de que la Fase F provea actividad real.
- **¿Bloquea cierre del Bloque?** **Sí** — bloquea el cierre de Fase E y, por tanto, el cierre completo de Bloque III mientras Fase E no se resuelva.
- **¿Bloquea cierre del proyecto?** **Sí**, consecuencia directa del punto anterior.
- **Referencia documental:** registro de gobernanza del Plan Maestro (memoria del proyecto, auditoría 2026-07-13 — no archivado como documento propio); `docs/auditoria/corte-de-control-2026-07-18.md` §2 (Fase E), §5.4; `docs/actas-bloque-3/acta-apertura-fase-f.md` §4 (relación de prerrequisito).

### P-012 — Acceso agregado multi-usuario para Observabilidad/Analítica

- **Pendiente (original):** determinar si Observabilidad y/o Analítica necesitan leer datos entre usuarios (monitorización de plataforma) — el modelo de sesión `auth.uid() = profile_id`, aplicado sin excepción en todo el proyecto, solo permite leer los propios datos.
- **Origen:** investigación "ejecución en segundo plano" (Fase C, 2026-07-17); reconfirmado explícitamente al cerrar Telemetría (2026-07-18).
- **Estado:** **RESUELTO para Observabilidad (2026-07-18).** Verificación durante su Plan Técnico: el argumento inicial (que "Observabilidad" exigía agregación por equivaler a "Monitorización") se apoyaba en una interpretación ya descartada durante el propio cierre de Bloque II — Observabilidad nunca absorbió esa categoría. Corregida la premisa, no queda fundamento para exigir lectura multiusuario: Observabilidad se diseñó e implementó sobre el modelo de sesión ya congelado, sin reabrir la investigación de ejecución en segundo plano ni abrir DT-004.
  **Para Analítica: verificado documentalmente, con evidencia distinta e independiente (no por analogía con Observabilidad), que SÍ requiere lectura agregada entre usuarios** — verificación en `docs/actas-bloque-3/investigacion-acceso-multiusuario-analitica.md`, que re-contrastó las alternativas A/B/C/D de la investigación de Fase C contra el estado actual de la arquitectura. Conclusión: A, B y C válidas, D excluida estructuralmente.
  **RESUELTO — mecanismo decidido (2026-07-18).** DT-004 congelada (`docs/actas-bloque-3/acta-cierre-dt-004.md`): Alternativa B (usuario de sistema con políticas RLS específicas), con principio general consolidado ("los Servicios de Plataforma con misión transversal acceden vía identidad explícita gobernada por el mismo modelo de autenticación y RLS") y restricción de reutilización explícita (cada futuro consumidor debe justificar su propia necesidad, no hereda autorización automática).
  **Implementación construida (2026-07-18):** `execution_audit_log` (Repository Layer) y `lib/analitica/` implementados sobre este mecanismo — `listExecutionAudit()` sin `profileId`, coherente con DT-004. **La lectura agregada real queda bloqueada por P-015** (política de `SELECT` diferida hasta que exista la identidad de sistema) — contrato completo y probado, sin datos reales todavía, mismo tratamiento ya aceptado en AI Gateway/Telemetría/Observabilidad.
- **Responsable arquitectónico / componente afectado:** Observabilidad (resuelto) · Analítica (implementado sobre el mecanismo decidido; datos reales pendientes de P-015).
- **Momento previsto de resolución (implementación):** Resuelto — ver P-015 para la materialización final (política de `SELECT`).
- **¿Bloquea cierre del Bloque?** No.
- **¿Bloquea cierre del proyecto?** No.
- **Referencia documental:** `docs/actas-bloque-3/acta-cierre-telemetria.md` §9; `docs/actas-bloque-3/investigacion-ejecucion-en-segundo-plano.md` §4; `docs/actas-bloque-3/acta-cierre-observabilidad.md` §3; `docs/actas-bloque-3/investigacion-acceso-multiusuario-analitica.md`; `docs/actas-bloque-3/analisis-comparativo-dt-004.md`; `docs/actas-bloque-3/acta-cierre-dt-004.md`.

### P-013 — Migraciones y políticas RLS nunca verificadas contra un proyecto Supabase real

- **Pendiente:** verificar dinámicamente, contra un proyecto Supabase real desplegado, que las 7 migraciones y sus políticas RLS se comportan como está documentado (VD-001, VD-002, VD-003).
- **Origen:** Repository Layer (VD-001, VD-002, 2026-07-13); Accounting Engine (VD-003, 2026-07-16) — heredadas transitivamente por todo componente posterior con persistencia.
- **Estado:** Abierto desde el primer componente con persistencia, sin resolver.
- **Responsable arquitectónico / componente afectado:** Repository Layer y toda su cadena de ampliaciones aditivas (Accounting Engine, Procesos Asíncronos, Telemetría).
- **Momento previsto de resolución:** Sin fecha — depende de que se autorice desplegar contra un proyecto Supabase real.
- **¿Bloquea cierre del Bloque?** No — aceptado como limitación de entorno de prueba en cada componente cerrado hasta ahora, precedente consistente.
- **¿Bloquea cierre del proyecto?** Sí, antes de cualquier despliegue real a producción — aunque no bloquea el cierre arquitectónico/de código de ningún Bloque.
- **Referencia documental:** `docs/actas-bloque-3/acta-cierre-repository-layer.md` §7 (VD-001, VD-002); `docs/actas-bloque-3/acta-cierre-accounting-engine.md` (VD-003).

### P-014 — Webhook de Stripe con clave privilegiada, sin incidencia formal registrada

- **Pendiente:** `app/api/webhooks/stripe/route.ts` usa `SUPABASE_SERVICE_ROLE_KEY` directamente, sin pasar por Repository Layer (SC-005.1, única frontera de persistencia) ni por el futuro Outbound/Inbound Provider Gateway (DT-002, P-008/P-009). Es código preexistente al inicio de la transferencia arquitectónica de ScenaIA, nunca registrado formalmente como incidencia (sin número IA-xxx).
- **Origen:** investigación "ejecución en segundo plano" (Fase C, 2026-07-17), donde se descartó explícitamente como precedente válido; reconfirmado en el Corte de Control 2026-07-18.
- **Estado:** Identificado, no registrado formalmente como incidencia arquitectónica.
- **Responsable arquitectónico / componente afectado:** Repository Layer / Outbound Provider Gateway (P-008) — código real afectado: `app/api/webhooks/stripe/route.ts`, fuera de la construcción propia de ScenaIA.
- **Momento previsto de resolución:** Sin fecha — depende de si se decide traer este webhook bajo la gobernanza de ScenaIA (vía P-008/P-009) o se mantiene explícitamente fuera de su alcance.
- **¿Bloquea cierre del Bloque?** No — es código preexistente, fuera de lo que Bloque III construye.
- **¿Bloquea cierre del proyecto?** Ambiguo — depende de si "concluir el proyecto" exige declarar cumplida íntegramente la arquitectura de persistencia (SC-005.1/DT-002) incluso sobre integraciones preexistentes a ScenaIA. Se registra sin forzar una respuesta — requiere que la Dirección precise el criterio de alcance.
- **Referencia documental:** `docs/actas-bloque-3/investigacion-ejecucion-en-segundo-plano.md` §2.1; `docs/auditoria/corte-de-control-2026-07-18.md` §8.2.

---

### P-015 — Hueco de `tipo_perfil` para el usuario de sistema de DT-004

- **Pendiente:** el enum `tipo_perfil` (`supabase/migrations/20260708000000_baseline_schema.sql`) tiene 11 valores, todos roles humanos del ecosistema — ninguno representa una cuenta de sistema/servicio. DT-004 exige un usuario de sistema real (fila en `profiles`); su `tipo_perfil` queda sin resolver. **Concretado durante la implementación de Analítica (2026-07-18):** la migración `20260718000001_execution_audit_log.sql` solo incluye la política de `INSERT` — la política de `SELECT`, exclusiva de la identidad de sistema de DT-004, queda explícitamente diferida a la resolución de este pendiente.
- **Origen:** análisis comparativo de DT-004 (`docs/actas-bloque-3/analisis-comparativo-dt-004.md`), verificado contra el esquema real; formalizado como pendiente en el cierre de DT-004.
- **Estado:** Abierto — detalle de implementación, explícitamente fuera del alcance de la propia DT-004 (que solo congela el principio, no sus detalles). Bloquea, en la práctica, que `listExecutionAudit()` devuelva algo distinto de una lista vacía.
- **Responsable arquitectónico / componente afectado:** Repository Layer (esquema de `profiles`; política de `SELECT` de `execution_audit_log`), Analítica (lectura agregada real).
- **Momento previsto de resolución:** Cuando se decida aprovisionar el usuario de sistema de DT-004.
- **¿Bloquea cierre del Bloque?** No.
- **¿Bloquea cierre del proyecto?** No — bloquea únicamente que Analítica sea funcionalmente útil con datos reales, no su cierre arquitectónico (mismo tratamiento que IA-006 para AI Gateway).
- **Referencia documental:** `docs/actas-bloque-3/analisis-comparativo-dt-004.md` §5 (Alternativa B); `docs/actas-bloque-3/acta-cierre-dt-004.md` §5; `supabase/migrations/20260718000001_execution_audit_log.sql`.

---

### P-016 — Algoritmo de interpretación agregada de Analítica, deliberadamente no diseñado

- **Pendiente:** `buildBusinessAnalytics()` v1 solo cuenta el total de ejecuciones registradas (`totalExecutions`) — la Dirección pidió expresamente no congelar en el Plan Técnico ningún algoritmo concreto (totales por proveedor, promedios, distribución temporal, etc.), dejándolo para un diseño posterior.
- **Origen:** Plan Técnico de Analítica (2026-07-18), decisión explícita de alcance, no un olvido.
- **Estado:** Abierto por diseño — v1 mínimo, deliberadamente incompleto frente a la misión congelada ("interpretación de negocio agregada"), que un solo conteo no agota.
- **Responsable arquitectónico / componente afectado:** Analítica (`lib/analitica/build-business-analytics.ts`, `lib/analitica/types.ts`).
- **Momento previsto de resolución:** Diseño posterior, sin fecha fijada — también depende de que P-015 aporte datos reales con los que iterar el algoritmo.
- **¿Bloquea cierre del Bloque?** No.
- **¿Bloquea cierre del proyecto?** Sí — mientras Analítica solo cuente ejecuciones, no cumple plenamente su misión de "interpretación de negocio".
- **Referencia documental:** `lib/analitica/types.ts` (comentario explícito); `docs/actas-bloque-3/acta-cierre-analitica.md`.

---

### P-017 — Conexión real del SPO a un mecanismo de entrada (route handler)

- **Pendiente:** `processRequest()` (SPO) existe, está probado y compone correctamente los 9 contratos del recorrido oficial — pero ningún route handler ni mecanismo real de entrada lo invoca todavía. Incluye la obtención real de `userId`/`SessionInput` a partir de una petición HTTP autenticada.
- **Origen:** Acta de Cierre del SPO (2026-07-18) — separado de P-006 al cerrarlo, por ser una responsabilidad explícitamente fuera del alcance de la especificación arquitectónica del SPO desde su origen.
- **Estado:** **RESUELTO (2026-07-18).** `app/api/scenaia/route.ts` implementado y probado — Adaptador de Entrada que verifica sesión real, traduce HTTP a los tres parámetros de `processRequest()` sin transformarlos, y devuelve el `ResponseContext` sin reinterpretarlo. ScenaIA responde, por primera vez, a una petición real de un usuario autenticado (`acta-cierre-p017.md`).
- **Responsable arquitectónico / componente afectado:** Adaptador de Entrada (`app/api/scenaia/route.ts`) — no forma parte del inventario de Servicios/Dominios/Núcleo de ScenaIA, es infraestructura de aplicación con límite documentado explícitamente.
- **Momento previsto de resolución:** Resuelto.
- **¿Bloquea cierre del Bloque?** No.
- **¿Bloquea cierre del proyecto?** No.
- **Referencia documental:** `docs/actas-bloque-3/especificacion-arquitectonica-spo.md` §6, §9; `docs/actas-bloque-3/acta-cierre-spo.md` §6; `docs/actas-bloque-3/acta-cierre-p017.md`.

---

### P-018 — Integración real de Sistemas de Caché en Repository Layer

- **Pendiente:** `getOrSet()` (Sistemas de Caché) existe, está probado y disponible — pero ninguna de las diez funciones de lectura de Repository Layer lo usa todavía. El mecanismo queda construido sin integrar.
- **Origen:** Acta de Cierre de Sistemas de Caché (2026-07-18) — la Definición Técnica aprobada limitó explícitamente su alcance a construir el mecanismo, dejando la integración real como decisión de implementación posterior.
- **Estado:** Abierto por diseño — no es un defecto, es el alcance ya aprobado. Requiere, cuando se aborde: (1) verificar función por función que ningún test de invariantes ya cerrado de Repository Layer deja de cumplirse; (2) **revisar explícitamente la tecnología de almacenamiento de Sistemas de Caché (RA-006, `acta-cierre-sistemas-cache.md` §4)** — hoy un `Map` en memoria del proceso, con consecuencias latentes (alcance por proceso, sin límite de crecimiento, sin coalescencia de peticiones concurrentes) que deben evaluarse antes de conectar el mecanismo a cualquier lectura real, no heredarse en silencio.
- **Responsable arquitectónico / componente afectado:** Repository Layer (las diez funciones de lectura ya inventariadas en la VIA).
- **Momento previsto de resolución:** Sin fecha — cuando exista un motivo real de rendimiento que lo justifique, mismo criterio evolutivo ya aplicado en todo el proyecto (no se integra por anticipación).
- **¿Bloquea cierre del Bloque?** No — confirmado en la revisión arquitectónica de la Definición Técnica: Sistemas de Caché es infraestructura auxiliar, no una dependencia funcional: su falta de integración no compromete la corrección de ningún componente ya cerrado.
- **¿Bloquea cierre del proyecto?** No, por el mismo motivo.
- **Referencia documental:** `docs/actas-bloque-3/acta-cierre-sistemas-cache.md` §3, §6.

---

## 3. Pendientes explícitamente excluidos de este registro (y por qué)

- **Desactualización de `ESTADO_MAESTRO_DOCUMENTAL.md` (Secciones 1–9: Biblioteca, Git, riesgos editoriales, etc.)** — real, mencionada en el Corte de Control, pero **no es un pendiente arquitectónico de ScenaIA**: pertenece a la gobernanza documental general de ObrasDeTeatro®, fuera del alcance de este registro.
- **IA-005 e IA-009** — propuestas y retiradas tras verificación (no eran incidencias reales); no se registran aquí, mismo criterio ya aplicado en su momento.
- **Hipótesis o mejoras futuras no derivadas de ningún documento ya cerrado** — explícitamente excluidas por instrucción de la Dirección al crear este registro.
