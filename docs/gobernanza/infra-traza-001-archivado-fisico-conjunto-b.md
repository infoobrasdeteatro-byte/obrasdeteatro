# INFRA-TRAZA-001 — Archivado Físico del Conjunto B

**Expediente:** INFRA-TRAZA-001, derivado de la Acta Oficial de Cierre Administrativo y de Gobernanza del Incidente de Trazabilidad 2026-07-19 (`f92d753`).
**Ámbito:** infraestructura y saneamiento del repositorio — movimiento físico del Conjunto B, ajustes de `tsconfig.json` y `vitest.config.ts`.
**Explícitamente fuera de ámbito:** cualquier decisión arquitectónica, cualquier comportamiento funcional del producto.
**Estado:** CERRADO.

---

## Acta Oficial de Cierre — INFRA-TRAZA-001: Archivado Físico del Conjunto B

**Fecha:** 2026-08-06
**Expediente:** INFRA-TRAZA-001 — Archivado Físico del Conjunto B
**Estado final:** CERRADO

### 1. Contexto

El Incidente de Trazabilidad se originó el 2026-07-19, al detectarse Actas y código mutuamente contradictorios en el repositorio. El inventario oficial resultante (`docs/auditoria/inventario-trazabilidad-claude-2026-07-19.md`) clasificó el material afectado en tres conjuntos: Conjunto A (procedencia completamente verificada), Conjunto B (procedencia no verificada) y Conjunto C (archivos mixtos), con instrucción vigente de no tratar el Conjunto B como Arquitectura Oficial ni modificarlo mientras el incidente permaneciera abierto.

El 2026-08-06, tras una investigación técnica completa motivada por el fallo de compilación que ese material provocaba, se produjo una clasificación formal de cada elemento del Conjunto B en una de cuatro categorías (mantener e integrar, reescribir, archivar, eliminar), fundamentada exclusivamente en evidencia verificable. Esa clasificación fue aprobada íntegramente por Dirección Técnica y certificada mediante la Acta Oficial de Cierre Administrativo y de Gobernanza del Incidente de Trazabilidad (commit `f92d753`).

Esa misma Acta estableció una separación deliberada entre dos expedientes distintos: el cierre administrativo (decisión de gobernanza, ya certificado) y el archivado físico (ejecución material sobre el árbol del repositorio), exigiendo autorización propia e independiente para cada uno antes de modificar un solo archivo. INFRA-TRAZA-001 es ese segundo expediente.

### 2. Objetivo

Cerrar el Incidente de Trazabilidad también en su vertiente técnica, ejecutando el archivado físico del Conjunto B exactamente conforme a la clasificación ya aprobada — sin reinterpretar, ampliar ni revisar ninguna decisión tomada en el expediente de gobernanza que lo precede.

### 3. Alcance ejecutado

- **Verificación previa:** confirmada la existencia de los siete elementos de código y la migración clasificados, la vigencia de las tres implementaciones sustitutivas verificadas (`lib/verified/observabilidad/`, `lib/verified/orquestador/`, `lib/verified/sistemas-cache/`), y la ausencia de cualquier referencia activa al Conjunto B desde `app/`, `components/` o el resto de `lib/`. Se detectó y resolvió un falso positivo durante esta verificación: `docs/actas-bloque-3/` contiene 41 archivos en total, de los cuales 25 pertenecen al Conjunto A ya trackeado y conviven en la misma ruta que los 16 del Conjunto B — `git status` confirmó el número exacto esperado.
- **Movimiento físico:** creación de `_incidente-trazabilidad-2026-07-19/`, replicando íntegramente las rutas relativas originales de cada elemento. Se empleó copia seguida de borrado en lugar de `git mv`, justificado por la ausencia total de historial de git en estos archivos (ningún commit existía para ninguno de ellos). Se archivaron: `lib/spo/`, `lib/observabilidad/`, `lib/sistemas-cache/`, `lib/analitica/`, `lib/repository-layer/execution-audit.ts` con su test, la migración `20260718000001_execution_audit_log.sql`, y los 16 documentos de `docs/actas-bloque-3/` más los 2 de `docs/auditoria/` ya clasificados.
- **Eliminación:** `app/api/scenaia/route.ts` y su test, categoría "Eliminar" ya aprobada — dados de baja sin archivar, recuperables en el historial de git a partir del commit de este expediente.
- **Ajustes de `tsconfig.json`:** ampliado su `exclude` para incorporar el nuevo directorio de archivo.
- **Ajustes de `vitest.config.ts`:** incorporado un `exclude` explícito para ese mismo directorio, construido a partir de `defaultExclude` importado directamente del propio framework, para no reducir accidentalmente el conjunto de exclusiones que Vitest aplica por defecto.

### 4. Evidencias

- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 86/86 archivos, 422/422 pruebas en verde.
- `npm run build`: correcto, 40/40 rutas — `/api/scenaia` deja de existir; `/api/scenaia-verified`, la ruta real en producción, permanece intacta.
- Las tres validaciones se ejecutaron directamente sobre el árbol real del repositorio, sin necesidad de worktree aislado — confirmación directa de que el Conjunto B ha dejado de contaminar la compilación del proyecto.
- Verificación estructural del archivo histórico, auditada y confirmada por Dirección Técnica: la jerarquía de rutas relativas de cada elemento archivado queda preservada íntegramente bajo `_incidente-trazabilidad-2026-07-19/`.

### 5. Relación con la Arquitectura Oficial

Este expediente no modifica ninguna decisión arquitectónica — no ha reinterpretado, revisado ni cuestionado ninguna de las conclusiones ya certificadas en el expediente de gobernanza que lo precede. No modifica ningún comportamiento funcional del producto, confirmado por la ausencia de regresión en la batería completa de pruebas y en el build. El único cambio producido es la organización física del repositorio: dónde vive cada archivo, no qué hace ni qué significa ningún componente de la Arquitectura Oficial.

### 6. Estado final

- El Conjunto B deja de formar parte del árbol activo del repositorio.

Las implementaciones verificadas que sustituyen al material archivado permanecen como únicas fuentes activas de la Arquitectura Oficial, sin dependencia funcional del contenido trasladado al archivo histórico.

- El archivo histórico, bajo `_incidente-trazabilidad-2026-07-19/`, preserva de forma íntegra la trazabilidad y la estructura original de cada elemento archivado.
- El Incidente de Trazabilidad abierto el 2026-07-19 queda cerrado también en su vertiente técnica, completando el cierre administrativo ya certificado en `f92d753`.

### 7. Declaración Oficial de Cierre

Queda formalmente certificado que el expediente **INFRA-TRAZA-001 — Archivado Físico del Conjunto B** concluye satisfactoriamente en esta fecha. El Conjunto B ha sido retirado del árbol activo del repositorio, preservando íntegramente su valor histórico bajo un directorio de archivo dedicado; el repositorio queda técnicamente saneado, con `tsc`, `vitest` y `npm run build` limpios, sin ninguna referencia activa pendiente hacia el material archivado. **El Incidente de Trazabilidad 2026-07-19 queda oficialmente cerrado en su totalidad, tanto en su vertiente administrativa como en su vertiente técnica.**

Con el cierre de INFRA-TRAZA-001 queda definitivamente concluido el Incidente de Trazabilidad iniciado el 19 de julio de 2026. Cualquier consulta futura sobre el material archivado deberá realizarse exclusivamente a través del directorio histórico y de la documentación de gobernanza asociada, sin reincorporar dicho material al árbol activo salvo mediante un expediente formal expresamente autorizado por Dirección Técnica.
