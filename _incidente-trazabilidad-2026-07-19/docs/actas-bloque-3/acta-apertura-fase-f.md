# ACTA DE APERTURA — FASE F (MATERIALIZACIÓN DEL SPO)
## Bloque III — Implementación

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** F — Materialización del Mecanismo de Coordinación del Núcleo
**Estado:** ABIERTA
**Fecha:** 2026-07-18

---

### 1. Objeto de la Acta

Declara formalmente abierta la Fase F del Plan Maestro de Bloque III, dedicada exclusivamente a implementar el SPO (mecanismo de coordinación del Núcleo) conforme a `docs/actas-bloque-3/especificacion-arquitectonica-spo.md`, ya congelada. Resuelve el encaje de implementación de **P-006**, dejado pendiente en esa especificación.

### 2. Por qué Fase F y no una renumeración

La Fase E (Optimización: Sistemas de Caché → Subsistemas de Aprendizaje) fue aprobada el 2026-07-13 y está referenciada, con ese número, en múltiples Actas y en el Registro de Pendientes (P-011). La Dirección determinó explícitamente que la numeración de fases es un identificador de gobernanza que no se reutiliza ni se modifica sin necesidad arquitectónica de primer nivel — no existe esa necesidad aquí. **La Fase F se añade al final de la secuencia numerada del Plan Maestro, sin alterar la Fase E ni ningún documento que ya la referencie.**

### 3. Alcance

**Exclusivamente la implementación del SPO tal como quedó especificado — ninguna arquitectura nueva.** La Fase F materializa una definición ya aprobada, no la redefine: misión, principios, responsabilidades, no-responsabilidades, entradas, salidas e invariantes de `especificacion-arquitectonica-spo.md` permanecen tal cual, sin reapertura.

Componente único previsto: el mecanismo de coordinación del Núcleo (SPO) — invocación secuencial de los 7 componentes del Núcleo, generación/propagación de `RequestId` (DT-001), activación de las observaciones laterales ya diseñadas para depender de él (Procesos Asíncronos, Telemetría/Analítica), preservando la observación pasiva de DT-003.

### 4. Relación con la Fase E — prerrequisito, no reordenación

**La Fase F queda declarada explícitamente como prerrequisito arquitectónico para completar determinados objetivos de la Fase E** — en particular, Subsistemas de Aprendizaje (R-02/**P-011**) presupone actividad real del sistema, que hoy no existe porque nada orquesta el Núcleo. Esta relación de prerrequisito es **lógica y de dependencia real, no numérica**: la Fase E conserva su número y su posición en el Plan Maestro; la Fase F, pese a numerarse después, debe completarse antes de que ciertos objetivos de la Fase E puedan avanzar con datos reales.

### 5. Estado del Registro de Pendientes Arquitectónicos

- **P-006** — pasa de "especificación congelada, encaje sin decidir" a **"Fase F abierta, implementación en curso de autorización"**. Sigue bloqueando el cierre del Bloque III hasta que la Fase F se complete.
- **P-011** — sin cambio en su propio contenido; se añade la referencia cruzada a la Fase F como prerrequisito real de su resolución.

### 6. Próximo paso

Verificación documental y Plan Técnico de la implementación del SPO, con la misma disciplina ya aplicada a cada componente del Bloque III — todavía no autorizados por esta Acta, que se limita a abrir la Fase.
