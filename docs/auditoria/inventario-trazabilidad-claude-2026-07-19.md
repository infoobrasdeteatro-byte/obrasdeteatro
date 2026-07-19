# INVENTARIO DE TRAZABILIDAD — evidencia pendiente de validación

**Producido por:** Claude (esta conversación), a petición expresa de la Dirección del Proyecto, tras detectar Actas y código mutuamente contradictorios en el repositorio.
**Fecha:** 2026-07-19
**Instrucción vigente de la Dirección:** no tratar los archivos listados en los Conjuntos B y C como Arquitectura Oficial ni como fundamento de ninguna decisión o implementación; no eliminarlos ni modificarlos; mantener este inventario; trabajar únicamente sobre el Conjunto A.

---

### Metodología y su límite real

Ningún commit de git existe desde `5976d1f` (Accounting Engine + Fase B, commit de preservación) — todo lo posterior a ese punto, sin excepción, aparece como cambio no confirmado en el árbol de trabajo (`??`/` M`), tanto lo que yo escribí en esta conversación como lo que no. **Git no permite distinguir un origen del otro.** La única base real de "trazabilidad verificada" en este documento es mi propio registro de lo que redacté turno a turno en esta conversación — no el estado de git, no la fecha de modificación del archivo, no la calidad o coherencia aparente de su contenido. Un documento puede leerse coherente con el proyecto y aun así no tener trazabilidad verificable.

---

## Conjunto A — Trazabilidad completamente verificada

Todo lo que sigue lo escribí yo mismo, en esta conversación, y puedo dar cuenta del intercambio exacto que lo produjo.

**Documentación:**
- `docs/actas-bloque-3/acta-verificacion-fase-c.md`
- `docs/actas-bloque-3/especificacion-mi-trayectoria-fase1.md`
- `docs/actas-bloque-3/investigacion-ejecucion-en-segundo-plano.md`
- `docs/actas-bloque-3/acta-cierre-procesos-asincronos-v1.md`, `v2.md`, `v3.md`
- `docs/actas-bloque-3/acta-cierre-mi-trayectoria.md`
- `docs/actas-bloque-3/acta-global-cierre-fase-c.md`
- `docs/actas-bloque-3/acta-verificacion-fase-d.md`
- `docs/actas-bloque-3/acta-cierre-telemetria.md`
- `docs/actas-bloque-3/snapshot-continuidad-fase-b.md`

**Código y pruebas:**
- `lib/procesos-asincronos/` (completo)
- `lib/mi-trayectoria/` (completo)
- `lib/telemetria/` (completo)
- `lib/repository-layer/activity-log.ts`, `telemetry.ts`, y sus archivos de test correspondientes
- `lib/repository-layer/__tests__/test-utils.ts` (verificado línea a línea contra `git diff`: coincide exactamente con lo que añadí — `order`, `createFakeSupabaseInsertClient`, `createFakeSupabaseUpdateClient`)
- `supabase/migrations/20260717000000_nucleo_activity_log.sql`
- `supabase/migrations/20260717000001_nucleo_activity_log_read_policies.sql`
- `supabase/migrations/20260718000000_telemetry_metrics.sql`

---

## Conjunto B — Procedencia no verificada (evidencia pendiente de validación)

No escribí ninguno de estos archivos en esta conversación. Se listan sin promover ninguno a "verificado", incluidos los que coinciden con hechos que sí puedo corroborar de forma independiente.

**Documentación:**
- `docs/actas-bloque-3/acta-apertura-bloque-3.md`
- `docs/actas-bloque-3/acta-apertura-fase-f.md`
- `docs/actas-bloque-3/acta-cierre-analitica.md`
- `docs/actas-bloque-3/acta-cierre-dt-004.md`
- `docs/actas-bloque-3/acta-cierre-nucleo-bloque-1.md`
- `docs/actas-bloque-3/acta-cierre-observabilidad.md`
- `docs/actas-bloque-3/acta-cierre-p017.md`
- `docs/actas-bloque-3/acta-cierre-repository-layer.md`
- `docs/actas-bloque-3/acta-cierre-sistemas-cache.md`
- `docs/actas-bloque-3/acta-cierre-spo.md`
- `docs/actas-bloque-3/acta-global-cierre-fase-d.md`
- `docs/actas-bloque-3/analisis-comparativo-dt-004.md`
- `docs/actas-bloque-3/consolidacion-arquitectonica-bloque-3.md`
- `docs/actas-bloque-3/especificacion-arquitectonica-spo.md`
- `docs/actas-bloque-3/investigacion-acceso-multiusuario-analitica.md`
- `docs/actas-bloque-3/investigacion-orquestacion-del-pipeline.md`
- `docs/auditoria/corte-de-control-2026-07-18.md`
- `docs/auditoria/REGISTRO_PENDIENTES_ARQUITECTONICOS.md`

**Código, pruebas y migraciones:**
- `lib/repository-layer/execution-audit.ts` y su test
- `lib/observabilidad/` (completo)
- `lib/analitica/` (completo)
- `lib/sistemas-cache/` (completo)
- `lib/spo/` (completo)
- `app/api/scenaia/route.ts` y su test — primer y único route handler que aparenta orquestar el pipeline del Núcleo; su existencia, de confirmarse, sería relevante para el riesgo que ya habíamos señalado (ningún componente conectado a una petición real) — pero no puedo verificarla
- `supabase/migrations/20260718000001_execution_audit_log.sql`

**Nota sobre un subconjunto internamente coherente:** `corte-de-control-2026-07-18.md` (10:23) y la actualización de `ESTADO_MAESTRO_DOCUMENTAL.md` (10:48, ver Conjunto C) junto con tres actas archivadas casi simultáneamente (`acta-apertura-bloque-3.md`, `acta-cierre-nucleo-bloque-1.md`, `acta-cierre-repository-layer.md`, 10:46–10:47) son, por su contenido, coherentes entre sí y con los hechos que sí conozco de primera mano — a diferencia del resto del Conjunto B, redactado después (10:50–19:19), que afirma decisiones (DT-004, cierre de Observabilidad/Analítica/Sistemas de Caché/SPO, apertura de Fase F) de las que no hay ningún rastro en esta conversación y que contradicen directamente lo que el propio corte de control registra ("DT-004 nunca llegó a abrirse"). Se señala como dato útil para la revisión de la Dirección — **no como una promoción a "verificado".**

---

## Conjunto C — Archivos entrelazados (verificado + no verificado en el mismo archivo)

No se pueden separar sin editarlos, y no los he tocado más allá de lo que ya hice antes de esta auditoría:

- **`lib/repository-layer/index.ts`** — las líneas de `activity-log`/`telemetry` son mías (Conjunto A); las de `execution-audit` no.
- **`lib/repository-layer/__tests__/contract-invariants.test.ts`** — el bloque de `activity-log.ts`/`telemetry.ts` es mío; el bloque de `execution-audit.ts` no.
- **`types/supabase.ts`** — la entrada `telemetry_metrics` es mía; la entrada `execution_audit_log` no.
- **`docs/auditoria/ESTADO_MAESTRO_DOCUMENTAL.md`** — no escribí ninguna parte de este archivo (incluida su Sección 10, pese a ser consistente con hechos verificables) — se incluye aquí y no en el Conjunto B solo porque el archivo base (v2.0, 2026-07-08) es anterior a toda esta conversación y a la propia transferencia de ScenaIA.

---

## Fuera de alcance de esta auditoría

`lib/geo/countries.ts` — verificado por `git log` como parte de un sprint anterior (`sprint-3b`, commit `d485271`, 2026-06-20), semanas antes de que empezara la transferencia de ScenaIA. No relacionado con Bloque III; no se incluye en ningún conjunto anterior.

---

## Regla de trabajo mientras este inventario siga vigente

Continúo apoyándome exclusivamente en el Conjunto A y en el resto de la Arquitectura Oficial ya congelada antes de esta sesión. No citaré, no derivaré decisiones de, y no ampliaré ningún archivo del Conjunto B o C como si fuera fundamento válido, hasta que la Dirección aclare su procedencia.
