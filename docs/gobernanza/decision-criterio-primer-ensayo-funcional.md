# DECISIÓN DE GOBERNANZA — Criterio oficial del primer ensayo funcional de ScenaIA

**Fecha:** 2026-07-19
**Objeto:** recomendar cuál interpretación (A o B) debe adoptarse como criterio oficial de aceptación del hito "primer ensayo funcional" — o concluir que ninguna basta.
**Criterios permitidos, exclusivamente:** finalidad del hito, coherencia con la gobernanza existente, trazabilidad futura del Mapa Maestro, capacidad de evaluación objetiva. Sin argumentos de conveniencia, facilidad técnica o estado actual del desarrollo.

---

## 1. Finalidad del hito dentro del proyecto

La propia instrucción que originó el concepto lo definió por contraste: distinto de "finalización completa del proyecto", un hito **intermedio**. Un hito intermedio cumple su función cuando valida, de forma aislada, una capacidad concreta y verificable — no cuando exige, de entrada, todas las condiciones de la finalización completa. Exigir generación real de IA en el primer hito difuminaría la distinción que la propia instrucción original quiso trazar: si el primer ensayo ya exige integración externa real, dejaría de ser conceptualmente distinto de la finalización completa en el aspecto que más la caracteriza (SC-001: la propia razón de ser de ScenaIA es la capa de IA sobre el contexto del ecosistema) — la distancia entre "primer ensayo" y "finalización" se reduciría a lo secundario (Fase E, incidencias menores), no a lo esencial.

## 2. Coherencia con la gobernanza existente

Verificado, sin excepción, en el historial completo de cierres de componente de este proyecto: **ningún componente ha sido declarado "cerrado" exigiendo integración real con un proveedor de IA o fuente real de datos de suscripción.** AI Gateway, Credit Manager, Decision Engine, Response Composer — los cuatro directamente afectados por IA-001/IA-006 — se cerraron formalmente aceptando degradación segura (`SIN_PROVEEDOR`, `DENIED` por falta de datos verificables) como resultado válido, no como impedimento. Esa aceptación se sostuvo, sin reabrirse, a través de los cierres de Fase B, Fase C y Fase D. Adoptar la Lectura B para este hito exigiría, por primera vez en todo el proyecto, tratar como bloqueante algo que la propia gobernanza ya aceptó reiteradamente como no bloqueante en cada nivel de cierre anterior — una ruptura de coherencia con el criterio ya aplicado de forma consistente, no una continuación de él.

## 3. Trazabilidad futura del Mapa Maestro

El Mapa Maestro ya agrupa IA-002, IA-003, IA-004, IA-007 e IA-008 bajo una única categoría trazable: *"degradación segura ya construida y probada; resolverlas mejora la respuesta, no la habilita."* La Lectura A permite que IA-001 e IA-006 se incorporen a esa misma categoría, manteniendo una única clasificación coherente para las siete incidencias abiertas. La Lectura B exigiría una segunda categoría distinta, mezclando dentro del mismo hito una pieza de integración interna (el orquestador, arquitectura propia del proyecto) con una dependencia de integración externa (proveedor de IA, fuente de datos de suscripción) — dos naturalezas de vacío distintas, cuya combinación en un único criterio de aceptación complica, no facilita, el seguimiento futuro de qué tipo de trabajo falta.

## 4. Capacidad de evaluación objetiva

Bajo la Lectura A, el hito se verifica con un criterio binario, interno y determinista: el pipeline se ejecuta de principio a fin y produce un `ResponseContext` válido — verificable con datos de prueba controlados, sin depender de ningún sistema externo. Bajo la Lectura B, el hito dependería adicionalmente de que un proveedor externo de IA responda, y de que su contenido generado se considere "correcto" — un juicio que ya no es puramente arquitectónico (¿qué hace que una generación de IA sea "correcta"?, ¿bajo qué condiciones de red, disponibilidad o coste del proveedor se considera cumplido el hito?). La Lectura B introduce una dependencia de evaluación externa al propio proyecto, menos objetivamente verificable que la Lectura A.

---

## Recomendación

**Opción A — adoptar oficialmente la Lectura A como definición del primer ensayo funcional.**

Los cuatro criterios permitidos apuntan en la misma dirección: preserva la distinción original entre hito intermedio y finalización completa (§1); continúa, sin ruptura, el criterio de degradación segura ya aplicado sin excepción en cada cierre anterior del proyecto (§2); mantiene una única categoría trazable para las incidencias abiertas en el Mapa Maestro (§3); y ofrece un criterio de cumplimiento binario y verificable internamente, sin depender de la disponibilidad o corrección de un sistema externo (§4).

IA-001 e IA-006 quedan, en consecuencia, en la misma categoría que IA-002/003/004/007/008: pendientes para la finalización completa, no bloqueantes del primer ensayo funcional. Esta recomendación no analiza ni adelanta ninguna consecuencia de diseño, arquitectura o prioridad de implementación derivada de ella — corresponde, como se ha indicado, a una decisión posterior.

---

## Precisión de alcance, confirmada por la Dirección al aprobar

**La adopción de la Lectura A no modifica la prioridad arquitectónica de IA-001 e IA-006 respecto a la finalización completa del proyecto.** Únicamente establece que dichas incidencias no forman parte del criterio de aceptación del hito "primer ensayo funcional". Su clasificación como "pendientes para la finalización completa" (párrafo anterior) describe su relación con **este hito concreto**, no una reducción de su importancia general — siguen siendo, exactamente igual que antes de esta decisión, dos incidencias arquitectónicas abiertas cuya resolución sigue siendo necesaria para la finalización completa de ScenaIA.

## Estado

**Recomendación aprobada por la Dirección (2026-07-19), con la precisión de alcance anterior incorporada.** Lectura A queda adoptada como criterio oficial del primer ensayo funcional.
