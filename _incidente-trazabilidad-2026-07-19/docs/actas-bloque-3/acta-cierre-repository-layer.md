# ACTA DE CIERRE OFICIAL DE COMPONENTE
## Repository Layer (SC-005.1)

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** III – Implementación
**Fase:** A — Infraestructura Fundamental, primer componente
**Componente:** Repository Layer
**Documento de referencia:** SC-005.1 – Repository Layer (Arquitectura Oficial)
**Estado resultante:** IMPLEMENTADO · VALIDADO · CERRADO
**Fecha de cierre original:** 2026-07-13

---

> **Nota de archivo (2026-07-18):** esta Acta certificó el cierre de Repository Layer en su momento (2026-07-13), pero nunca se guardó como documento en el repositorio — solo existió en el registro conversacional de gobernanza. Se reconstruye y archiva ahora, sin alterar ningún hecho ni fecha, como parte de la Etapa 1 (Cierre de gobernanza) del Corte de Control del 2026-07-18. Es el mismo contenido ya verificado entonces, no una revisión nueva.

### 1. Objeto del Acta

La presente Acta certifica la finalización oficial de la implementación de Repository Layer, primer componente del Bloque III – Implementación (Fase A), así como la verificación de su conformidad respecto de la Arquitectura Oficial aprobada durante la Fase 4 (SC-005.1).

### 2. Alcance implementado

Quedan implementados los siguientes contratos públicos:

- `Identity` — `getIdentity(userId)`
- `ProfessionalProfilePublic` — `getProfessionalProfilePublic(userId)`

Reutiliza `lib/supabase/server.ts` ya existente — RLS se sigue aplicando vía sesión de usuario, sin cliente privilegiado.

Quedan expresamente fuera del alcance de esta implementación, por decisión arquitectónica y no por defecto:

- Acceso a Subscription/plan — suspendido por la Incidencia A (ver Sección 6, IA-001).
- `getSpecializedProfile` / acceso a perfiles especializados — retirado durante la revisión arquitectónica (ver Sección 5).
- Cualquier otro contrato no autorizado por la Arquitectura Oficial.

Ningún otro archivo del repositorio fue modificado: los puntos de acceso directo a Supabase ya existentes en el repo (`app/perfil/**`, `app/obras/**`, etc.) quedan sin tocar — su migración a Repository Layer es tarea de Nivel 2 posterior, fuera de alcance de esta implementación inicial.

### 3. Ciclo oficial completado

1. Verificación de la especificación arquitectónica vigente (SC-005.1).
2. Identificación de contratos, dependencias, restricciones y criterios de aceptación.
3. Implementación.
4. Revisión arquitectónica (2 hallazgos reales corregidos, ver Sección 5).
5. Pruebas unitarias (6).
6. Pruebas de integración (11 en total, entre 3 archivos).
7. Validación final.

El componente supera satisfactoriamente todas las fases anteriores, sin incumplimientos del contrato SC-005.1 dentro del alcance autorizado.

### 4. Infraestructura de testing (primera vez en el repositorio)

Se incorporó Vitest al proyecto (`vitest.config.ts`, script `npm test`) — no existía ninguna infraestructura de pruebas automatizadas antes de este componente. 3 archivos de test en `lib/repository-layer/__tests__/`.

### 5. Hallazgos detectados durante la revisión arquitectónica (RA-001, RA-002 — corregidos)

Esta Acta introduce la numeración formal de trazabilidad (RA-xxx, VD-xxx, IA-xxx) que se adopta como esquema permanente para todo el Bloque III, correlativa entre componentes, nunca reiniciada.

1. **RA-001** — `getSpecializedProfile` devolvía la fila cruda de la tabla especializada (`select('*')`) — violaba el principio de que ningún consumidor puede depender de nombres de columna físicos. **Retirado del alcance**, pendiente de un contrato campo a campo antes de reimplementarse.
2. **RA-002** — `isPremium` en `ProfessionalProfilePublic` filtraba un dato del dominio Subscription por una vía indirecta, contradiciendo el espíritu de la Incidencia A (IA-001). **Retirado**, con test de regresión permanente para impedir que se reintroduzca.

### 6. Incidencias arquitectónicas abiertas asociadas

- **IA-001** (originalmente registrada como "Incidencia A") — doble fuente de verdad de Subscription/plan (`profiles.plan` enum vs. `subscriptions.plan` string/Stripe), confirmada contra el esquema real. Abierta, no bloqueante — **suspende exclusivamente** el contrato de acceso a Subscription/plan.
- **IA-002** — contrato público para perfiles profesionales especializados, pendiente de definición campo a campo. Abierta, no bloqueante (consecuencia directa de RA-001).

### 7. Validaciones diferidas (primera aparición en el Bloque III)

- **VD-001** — Propagación real de sesión de usuario: `cookies()` de `next/headers` exige un contexto real de petición Next.js, no reproducible en un test de proceso plano sin ampliar infraestructura (no autorizado). Demostrado empíricamente.
- **VD-002** — Verificación dinámica de RLS contra el proyecto Supabase real: sin autorización expresa para consultar datos reales durante las pruebas. Verificada en su lugar por inspección directa de las políticas ya definidas en `supabase/migrations/20260708000000_baseline_schema.sql`.

Ambas validaciones diferidas se heredan transitivamente por todo componente posterior que dependa de Repository Layer — no se repiten en cada Acta individual salvo que aporten un motivo nuevo.

### 8. Pruebas realizadas

- 6 pruebas unitarias + 11 pruebas de integración (3 archivos) superadas.
- Compilación correcta (`tsc --noEmit`).
- Análisis estático sin errores (`eslint`).

### 9. Veredicto

Tras la revisión completa del componente se certifica que:

- la implementación respeta íntegramente el contrato SC-005.1 dentro del alcance autorizado;
- no introduce ningún accessor de Subscription/plan (ausencia intencional, refleja la suspensión de IA-001, no un olvido);
- los dos hallazgos de revisión arquitectónica quedaron corregidos, con test de regresión donde aplicaba;
- las incidencias y validaciones diferidas quedan correctamente registradas y acotadas.

En consecuencia,

**Repository Layer queda oficialmente declarado:**

**IMPLEMENTADO · VALIDADO · CERRADO**

como primer componente oficial del Bloque III – Implementación.

### 10. Autorización para continuar

**No autorizado todavía el inicio de Knowledge Assets** (instrucción expresa de la Dirección del Proyecto en el momento del cierre) — próximo componente de Fase A, pendiente de autorización explícita para empezar (autorización recibida posteriormente; ver `acta-cierre-knowledge-assets.md`).

La presente Acta no implica el cierre de las incidencias abiertas (IA-001, IA-002) ni de las validaciones diferidas (VD-001, VD-002), que continuaron gestionándose conforme al procedimiento oficial de gobernanza del Bloque III.
