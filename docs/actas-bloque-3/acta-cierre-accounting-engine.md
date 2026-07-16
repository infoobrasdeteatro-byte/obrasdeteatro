# ACTA DE CIERRE OFICIAL DE COMPONENTE
## Accounting Engine (SC-005.3)

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Componente:** Accounting Engine
**Documento de referencia:** SC-005.3 – Accounting Engine (Arquitectura Oficial) · DA-001 · reapertura de SC-004.5
**Estado anterior:** Diseño lógico de persistencia aprobado, implementación autorizada
**Estado resultante:** IMPLEMENTADO · VALIDADO · CERRADO
**Fecha:** 2026-07-16

---

### 1. Objeto del Acta

La presente Acta certifica la finalización oficial de la implementación del componente Accounting Engine, tercer y último componente de la Fase A del Plan Maestro de Implementación (Bloque III), así como la verificación de su conformidad respecto de la Arquitectura Oficial aprobada durante la Fase 4 (SC-005.3, DA-001) y respecto del Diseño Lógico de Persistencia aprobado expresamente por la Dirección del Proyecto en esta misma sesión de gobernanza.

### 2. Alcance implementado

**Persistencia** (`supabase/migrations/20260716000000_accounting_engine_credit_reservations.sql`):

- Tabla `credit_reservations` — modelo de datos, claves e índices tal como quedaron aprobados en el Diseño Lógico, incluyendo las tres resoluciones puntuales exigidas por la Dirección: `authorized_limit_snapshot` (auditoría, nunca fuente de verdad del límite), `request_id` opcional, `profile_id` con `ON DELETE RESTRICT`.
- Cuatro operaciones atómicas `SECURITY DEFINER`: `accounting_verify_and_reserve`, `accounting_settle_reservation`, `accounting_release_reservation`, `accounting_expire_stale_reservations` — cada una verificando `auth.uid()` contra el perfil afectado (salvo el barrido de caducidad, que no expone ni modifica importes).
- RLS con política de solo `SELECT`; ninguna política de `INSERT/UPDATE/DELETE` — toda escritura queda acotada a las cuatro funciones anteriores.

**Repository Layer** (ampliación aditiva, `lib/repository-layer/accounting.ts`): `verifyAndReserve()`, `settleReservation()`, `releaseReservation()`, `expireStaleReservations()`. No se modifica ningún accessor previamente cerrado.

**Accounting Engine** (`lib/accounting-engine/`): `verifyAndReserve()` (con `DEFAULT_RESERVATION_TTL_SECONDS` como política propia del componente), `settleReservation()`, `releaseReservation()`, `expireStaleReservations()` — capa fina sobre Repository Layer, sin acceso directo a Supabase, sin conocer ni derivar límites de plan.

Queda expresamente fuera del alcance de esta implementación, por decisión arquitectónica y no por defecto: el camino hacia Stripe vía Outbound/Inbound Provider Gateway (DT-002, sin especificación detallada propia todavía) y cualquier invocación real desde Credit Manager (SC-004.5), que no existe todavía en código — Accounting Engine se implementa, igual que Knowledge Assets con el SKM, sin consumidor real, con contratos limpios a la espera del Núcleo.

### 3. Evolución del invariante general de Repository Layer (hito de gobernanza)

Durante la verificación previa a la implementación se detectó que `contract-invariants.test.ts` de Repository Layer imponía, de forma automatizada, que el componente era "exclusivamente de lectura" — garantía de implementación introducida durante el cierre de Repository Layer, nunca parte del contrato congelado de SC-005.1. Tratado como bloqueo estructural, se detuvo la implementación y se presentó el hallazgo a la Dirección del Proyecto antes de escribir código.

**Resolución, aprobada expresamente por la Dirección:** el invariante general de componente evoluciona de *"Repository Layer es exclusivamente de lectura"* a:

> *Repository Layer constituye la única frontera autorizada entre la aplicación y la persistencia. Toda mutación deberá realizarse exclusivamente mediante operaciones nombradas, con contrato propio, invariantes de corrección demostrados y aprobación arquitectónica previa.*

Los cuatro archivos previamente cerrados (`identity.ts`, `professional-profile.ts`, `works.ts`, `organizations.ts`) no se modifican y conservan, en su propio test dedicado, la restricción original de cero escritura — el nuevo invariante es el máximo permitido a nivel de componente, no un mínimo que cada archivo deba alcanzar. `accounting.ts` es, por ahora, el único archivo que ejerce la capacidad de escritura, y únicamente a través de `.rpc()` a las cuatro funciones atómicas — verificado por un nuevo test dedicado que prohíbe explícitamente cualquier `.insert(`/`.update(`/`.upsert(`/`.delete(` directo.

Esta resolución no reabre ni modifica el alcance funcional de ningún componente previamente cerrado.

### 4. Ciclo oficial completado

1. Verificación de la especificación arquitectónica vigente (SC-005.3, DA-001, reapertura de SC-004.5).
2. Identificación de contratos, dependencias y restricciones.
3. Verificación del estado real del repositorio (confirmó ausencia de tabla de reservas/ledger; confirmó IA-001 como divergencia real y ya conocida; confirmó integración Stripe existente y anterior a DT-002).
4. **Fase previa exigida por la Dirección:** diseño lógico de persistencia completo (modelo de datos, claves, índices, restricciones, ciclo de vida, estrategia de expiración, definición conceptual de la operación atómica, justificación de invariantes), seguida de una ronda de revisión específica con tres cuestiones puntuales resueltas antes de autorizar la migración.
5. Elaboración del plan técnico definitivo, con un bloqueo estructural identificado y resuelto antes de escribir código (Sección 3).
6. Implementación (migración SQL, ampliación de Repository Layer, módulo Accounting Engine).
7. Revisión arquitectónica completa del código.
8. Reauditoría (sin hallazgos que corregir).
9. Pruebas unitarias.
10. Pruebas de integración / invariantes estructurales.
11. Validación final.

El componente supera satisfactoriamente todas las fases anteriores.

### 5. Hallazgos detectados durante la implementación

**Ninguno.** La revisión arquitectónica del código (migración SQL, `accounting.ts`, `lib/accounting-engine/`) verificó explícitamente, sin encontrar defectos: (a) el `RETURN` posterior al `RETURN QUERY SELECT` de la rama de denegación en `accounting_verify_and_reserve` — su ausencia habría permitido crear una reserva pese a la denegación; (b) el paso de `request_id` como `undefined` cuando es `null`, necesario porque el tipo generado de argumentos RPC lo declara opcional, no nullable; (c) que ninguna reserva se persiste en la rama de denegación; (d) que el filtro `expires_at > now()` hace efectiva la no-obstrucción de crédito independientemente del barrido de caducidad. No se asigna ningún nuevo identificador RA-xxx en este componente (el correlativo del Bloque III permanece en RA-002).

### 6. Incidencias arquitectónicas resueltas antes o durante de implementar

- Bloqueo del invariante "solo lectura" de Repository Layer → resuelto mediante la evolución de invariante descrita en la Sección 3, con aprobación expresa de la Dirección.
- Tres cuestiones puntuales del diseño lógico (`authorized_limit_snapshot`, `request_id` opcional, política FK de `profile_id`) → resueltas y aprobadas antes de autorizar la migración SQL (ver intercambio de gobernanza previo a esta Acta).

### 7. Pruebas realizadas

Se certifica:

- Revisión arquitectónica completa, sin hallazgos.
- 54 pruebas superadas en 13 archivos (9 preexistentes de Repository Layer + Knowledge Assets, sin regresiones, más 4 nuevos): `accounting.test.ts` (Repository Layer, mapeo de las cuatro operaciones y de la rama de denegación), `reservation.test.ts` y `settlement.test.ts` (Accounting Engine, delegación y política de TTL), `contract-invariants.test.ts` (Accounting Engine, nunca accede a Supabase directamente, nunca compone RPC/SQL propia, no importa el Núcleo, no deriva límites de plan) — más la adaptación de `contract-invariants.test.ts` de Repository Layer descrita en la Sección 3.
- Compilación correcta (`tsc --noEmit`).
- Análisis estático sin errores (`eslint`, solo warnings preexistentes no relacionados).

No se ha encontrado ningún incumplimiento del contrato SC-005.3 ni de DA-001.

### 8. Validaciones diferidas e incidencias abiertas asociadas

**Validaciones diferidas:**

- **VD-001 / VD-002** — heredadas de Repository Layer, aplican transitivamente por el mismo motivo ya documentado (contexto real de petición Next.js; acceso a datos reales de Supabase).
- **VD-003 (nueva)** — forma exacta de la respuesta JSON de PostgREST para funciones `RETURNS TABLE` (`accounting_verify_and_reserve`) frente a funciones `RETURNS <tabla>` (`accounting_settle_reservation`/`accounting_release_reservation`) no verificada contra el proyecto Supabase real — la migración no ha sido aplicada a ningún entorno vivo durante esta sesión. Las pruebas unitarias mockean la forma de respuesta documentada por el comportamiento estándar de PostgREST/supabase-js; no bloqueante para el cierre de este componente, mismo motivo que VD-002 (sin autorización de acceso a datos reales).

**Incidencias arquitectónicas abiertas:**

- **IA-001** — Abierta. No afecta a Accounting Engine de forma directa: DA-001 ya resolvió que el límite de plan lo entrega Credit Manager, no lo lee Accounting Engine. No bloquea.
- **IA-002** — Abierta. No afecta a Accounting Engine. No bloquea.
- **IA-003** — Abierta. No afecta a Accounting Engine (dominio de Knowledge Assets). No bloquea.

Con el cierre de Accounting Engine, **la Fase A del Plan Maestro de Implementación (Infraestructura Fundamental) queda completa**: Repository Layer ✅ · Knowledge Assets ✅ · Accounting Engine ✅.

### 9. Veredicto

Tras la revisión completa del componente se certifica que:

- la implementación respeta íntegramente la Arquitectura Oficial (SC-005.3, DA-001) y el Diseño Lógico de Persistencia aprobado por la Dirección;
- preserva los tres invariantes centrales — reserva activa cuenta como consumo, TOCTOU cerrado mediante operación atómica serializada por perfil, Accounting Engine nunca posee límites de plan;
- la evolución del invariante general de Repository Layer se tramitó como corresponde: hallazgo señalado, no ejecutado unilateralmente, resuelto con aprobación expresa, sin reabrir ningún componente ya cerrado;
- no presenta incumplimientos arquitectónicos abiertos;
- las incidencias y validaciones diferidas quedan correctamente registradas y acotadas.

En consecuencia,

**Accounting Engine queda oficialmente declarado:**

**IMPLEMENTADO · VALIDADO · CERRADO**

como tercer componente oficial del Bloque III – Implementación, y como cierre de la Fase A del Plan Maestro.

### 10. Autorización para continuar

La Dirección del Proyecto podrá autorizar el inicio de la Fase B (Núcleo) del Plan Maestro de Implementación, comenzando por la resolución de **R-01** (disposición definitiva de Response Dispatcher), prerrequisito ya identificado antes del primer componente de esa fase.

La presente Acta no implica el cierre de las incidencias abiertas (IA-001, IA-002, IA-003) ni de las validaciones diferidas (VD-001, VD-002, VD-003), que continuarán gestionándose conforme al procedimiento oficial de gobernanza del Bloque III.
