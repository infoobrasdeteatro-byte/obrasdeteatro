# ACTA OFICIAL DE CIERRE ADMINISTRATIVO Y DE GOBERNANZA — Incidente de Trazabilidad 2026-07-19

---

**Fecha de cierre:** 2026-08-06
**Expediente:** Resolución del Incidente de Trazabilidad abierto el 2026-07-19
**Alcance de esta Acta:** cierre administrativo y de gobernanza únicamente. No autoriza, no ejecuta ni presupone ningún movimiento físico del repositorio.

---

## 1. Origen

El 2026-07-19, ante Actas y código mutuamente contradictorios detectados en el repositorio, se produjo `docs/auditoria/inventario-trazabilidad-claude-2026-07-19.md`, que clasificó un conjunto de archivos ("Conjunto B") como de procedencia no verificable — ningún commit de git existe para ninguno de ellos, y varias de sus Actas de cierre narran decisiones (DT-004, cierre de Observabilidad/Analítica/Sistemas de Caché/SPO, apertura de "Fase F") sin rastro en la conversación que supuestamente las produjo, contradiciendo además a `docs/auditoria/corte-de-control-2026-07-18.md`, documento del mismo día. La instrucción vigente desde entonces fue no tratar ese contenido como Arquitectura Oficial, no eliminarlo ni modificarlo, mientras el incidente permaneciera abierto.

El 2026-08-06, a solicitud de Dirección Técnica, se realizó una investigación técnica completa del Conjunto B (motivada por el fallo de compilación que este código provoca) y, a continuación, una propuesta formal de clasificación de cada elemento, fundamentada exclusivamente en evidencia verificable: historial real de git, contenido literal de `docs/gobernanza/mapa-maestro-progreso-scenaia.md` (documento vivo, con historial de commits real), y comprobación directa de código. Dirección Técnica aprobó esa clasificación en su totalidad.

## 2. Hallazgo central

Tres de los cuatro componentes de código del Conjunto B (Observabilidad, Sistemas de Caché, y el rol de orquestador que el Conjunto B llamaba "SPO"/"Fase F") **ya tienen una implementación distinta, verificada, cerrada y en producción real**, bajo `lib/verified/`, resuelta sin usar en ningún momento el Conjunto B. El cuarto (Analítica) ya fue cerrado por Dirección, de forma verificada, **por diferimiento y sin implementación** (2026-07-23). No queda, por tanto, ningún componente cuyo destino correcto sea "adoptar tal cual" o "reescribir desde cero": ambos caminos ya se recorrieron por la vía verificada, de forma independiente del Conjunto B.

## 3. Clasificación oficial adoptada

### Código y migraciones

| Elemento | Destino | Fundamento |
|---|---|---|
| `lib/spo/` (completo) | **Archivar** | Superseded por `lib/verified/orquestador/` (cerrado, verificado, en producción vía `/api/scenaia-verified`). Su incompatibilidad con el contrato real de `executeAIRequest` ya estaba documentada desde el 2026-07-23. |
| `app/api/scenaia/route.ts` + test | **Eliminar** | Sin ninguna referencia real en el proyecto (verificado por grep). Dependiente de `lib/spo`. Sin valor documental propio distinto del de `lib/spo`. |
| `lib/observabilidad/` (completo) | **Archivar** | Superseded por `lib/verified/observabilidad/` (cerrado, Fase D). |
| `lib/sistemas-cache/` (completo) | **Archivar** | Superseded por `lib/verified/sistemas-cache/` (cerrado 2026-07-23, integrado en Repository Layer). |
| `lib/analitica/` (completo) | **Archivar** | Analítica cerrada por diferimiento y sin implementación (Decisión de Dirección, 2026-07-23) — mantenerlo o reescribirlo contradiría esa decisión ya vigente. |
| `lib/repository-layer/execution-audit.ts` + test | **Archivar** | El mecanismo de persistencia de `ExecutionAudit` sigue expresamente diferido a expediente futuro; el enrutamiento ya está resuelto por otra vía verificada (`lib/execution-audit-router/`, Conjunto A). |
| `supabase/migrations/20260718000001_execution_audit_log.sql` | **Archivar** | Migración del mismo mecanismo de persistencia todavía sin decisión. No aplicada nunca en Supabase real. |

### Documentación (`docs/actas-bloque-3/` y auditoría relacionada, 18 archivos)

| Grupo | Destino | Fundamento |
|---|---|---|
| `corte-de-control-2026-07-18.md`, `acta-apertura-bloque-3.md`, `acta-cierre-nucleo-bloque-1.md`, `acta-cierre-repository-layer.md` | **Archivar** | Internamente coherentes entre sí y con hechos ya aceptados por el Mapa Maestro verificado. Se conservan como registro histórico, sin promoción a fuente primaria de autoría. |
| Actas de cierre restantes (DT-004, Analítica, Observabilidad, P-017, Sistemas de Caché, SPO, Fase D global, Fase F, consolidación, Registro de Pendientes) | **Archivar, no citar nunca como decisión válida** | Contradicen documentos del mismo día o ya fueron resueltas de otra forma por el Mapa Maestro verificado. |
| Investigaciones y propuestas que se declaran a sí mismas sin decisión tomada (análisis comparativo DT-004, investigación de acceso multiusuario, investigación de orquestación, especificación del SPO) | **Archivar** | Material técnico de referencia con posible valor si se abre un expediente futuro sobre Analítica o el mecanismo de `ExecutionAudit`. |

### Elementos mixtos (Conjunto C)

- `lib/repository-layer/index.ts`: sin acción — nunca contuvo exportaciones de `execution-audit`.
- `lib/repository-layer/__tests__/contract-invariants.test.ts`: **reverificado en esta fecha** — ya no contiene ningún bloque de `execution-audit` (limpieza posterior ya realizada). Sin acción.
- `types/supabase.ts`: verificado que no contiene ninguna entrada de `execution_audit_log`. Sin acción.

## 4. Declaración de cierre

Queda **cerrado el expediente de gobernanza del Incidente de Trazabilidad 2026-07-19**: el Conjunto B deja de ser una incógnita técnica y pasa a estar formalmente clasificado en su totalidad, con destino decidido para cada elemento.

**Permanece expresamente abierto y separado** el expediente de **Archivado Físico**, que ejecutará el movimiento técnico conforme a la clasificación aquí aprobada, y que requiere autorización propia e independiente antes de tocar un solo archivo o configuración.

## 5. Restricciones vigentes hasta el Archivado Físico

Hasta que el expediente de Archivado Físico se autorice y ejecute, se mantienen sin cambio las restricciones ya vigentes desde el 2026-07-19: el Conjunto B permanece físicamente en su ubicación actual, sin modificar; sigue sin tratarse como Arquitectura Oficial; sigue sin poder citarse como fundamento de ninguna implementación nueva. Esta Acta fija su destino — no lo ejecuta todavía.

## 6. Efecto sobre la Arquitectura Oficial

Esta Acta **no modifica la Arquitectura Oficial vigente**. Su efecto se limita a formalizar la clasificación administrativa del Conjunto B — no introduce, sustituye ni deroga ninguna decisión arquitectónica ya congelada (Núcleo, DT-001/002/003, ni ninguna de las implementaciones verificadas bajo `lib/verified/`). Se mantiene expresamente la prohibición de utilizar cualquier elemento del Conjunto B como fundamento de nuevas implementaciones, hasta que exista una decisión posterior — propia, explícita e independiente de esta Acta — que autorice lo contrario.

---

**Aprobada por Dirección Técnica el 2026-08-06.**
