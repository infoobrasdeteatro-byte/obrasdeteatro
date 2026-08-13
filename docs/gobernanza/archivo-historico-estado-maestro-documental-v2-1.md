# Archivo histórico — ESTADO_MAESTRO_DOCUMENTAL.md, borrador v2.1

**Fecha de este documento:** 2026-08-13
**Ámbito:** gobernanza documental. No documenta estado técnico de ScenaIA ni de ningún otro subsistema — solo la historia y el razonamiento de una decisión de gobernanza ya cerrada.

---

## 1. Contexto

`docs/auditoria/ESTADO_MAESTRO_DOCUMENTAL.md` es una auditoría documental periódica del repositorio (no un índice actualizado en vivo), con dos versiones commiteadas hasta la fecha:

- v1.0 — commit `f1130cc`, 2026-06-20.
- v2.0 — commit `efd756f`, 2026-07-08, "Auditoría Maestra 2026-07-08". Es la **única versión que ha existido nunca en ningún commit posterior a esa fecha**.

En algún momento posterior al 2026-07-08 (working tree encontrado ya modificado al auditar el repositorio en 2026-08-13, sin commit que lo respalde en ninguna rama) apareció una modificación local, no commiteada, que se autodenominaba **v2.1** — misma base que v2.0, añadiendo una Sección 10 sobre "ScenaIA — Bloque I/II/III", fechada internamente 2026-07-18. Esa v2.1 nunca formó parte de ningún commit, en ninguna rama, en ningún momento.

## 2. Decisión y motivo

La v2.1 **no se integró como versión oficial**. El motivo no es una valoración nueva hecha en 2026-08-13 — es la aplicación de una decisión de gobernanza ya tomada por el propio proyecto durante el Incidente de Trazabilidad del 2026-07-19:

- `docs/auditoria/inventario-trazabilidad-claude-2026-07-19.md` registra explícitamente que la Sección 10 de este documento tiene autoría/procedencia no verificable, "pese a ser consistente con hechos verificables".
- `docs/gobernanza/acta-preparacion-preview-vercel.md` registra que, por ese motivo, `ESTADO_MAESTRO_DOCUMENTAL.md` se dejó explícitamente fuera del commit de preservación de aquel incidente (`989eaaa`).

La auditoría de 2026-08-13 (Tarea 7 de la sesión de gobernanza de esa fecha) no descubrió un problema nuevo — confirmó que ese problema, ya señalado en julio, seguía sin resolver, y que además la Sección 10 contradecía para entonces el estado real ya publicado en `origin/main` (concretamente, sobre Observabilidad y Sistemas de Caché de ScenaIA, ya presentes en `main` desde el commit `989eaaa`, cuando la Sección 10 los daba por pendientes).

## 3. Preservación

- **Commit que ejecutó la preservación:** `900e0d8539a9a3bd94c4e5ff8cd4dd6d9138ad4e` — `docs(gobernanza): preservar borrador no oficial de ESTADO_MAESTRO_DOCUMENTAL v2.1`, rama `scenaia-bloque-3`, publicado en `origin/scenaia-bloque-3`.
- **Ubicación de la copia íntegra de la v2.1:** `_incidente-trazabilidad-2026-07-19/docs/auditoria/ESTADO_MAESTRO_DOCUMENTAL.md` (206 líneas, contenido verificado idéntico al original mediante comparación de checksum antes/después de la copia).
- **Nota de gobernanza que acompañó esa preservación:** `docs/gobernanza/cierre-pendiente-estado-maestro-documental.md` (mismo commit `900e0d8`).

## 4. Precedente de gobernanza aplicado

La preservación siguió, sin modificarla ni reinterpretarla, la misma convención ya certificada por Dirección Técnica en `docs/gobernanza/infra-traza-001-archivado-fisico-conjunto-b.md` (expediente **INFRA-TRAZA-001**) para el material de procedencia no verificada del Incidente de Trazabilidad 2026-07-19 (el "Conjunto B"): preservación física íntegra bajo `_incidente-trazabilidad-2026-07-19/`, replicando la ruta relativa original, fuera del árbol activo, sin reincorporación salvo expediente formal expresamente autorizado.

## 5. Estado oficial vigente

`docs/auditoria/ESTADO_MAESTRO_DOCUMENTAL.md` es, y sigue siendo tras esta preservación, **v2.0** — idéntica en `origin/main`, `origin/develop` y `origin/scenaia-bloque-3`. No contiene ninguna sección sobre ScenaIA.

## 6. Decisión diferida

La eventual incorporación de ScenaIA a este documento maestro queda **sin resolver, deliberadamente**, como decisión separada y futura. La Tarea 7A-PRE de la sesión de gobernanza de 2026-08-13 identificó que el estado vivo de ScenaIA ya se documenta, correctamente y de forma continuamente actualizada, en `docs/gobernanza/mapa-maestro-progreso-scenaia.md` — y que una futura versión (v3.0) de este documento maestro podría remitir a esa fuente por referencia, en vez de reproducir su contenido. Esa v3.0 no ha sido autorizada ni redactada.

## 7. Guía para una futura revisión

Si en el futuro se autoriza retomar esta cuestión:

1. **No reutilizar el texto de la v2.1 preservada sin revalidar cada afirmación contra el estado real** de `origin/main`/`origin/develop`/`origin/scenaia-bloque-3` en ese momento — la v2.1 ya demostró estar desactualizada frente a `main` incluso en el momento de su propio descubrimiento.
2. **No asumir que `mapa-maestro-progreso-scenaia.md` sigue existiendo o vigente sin comprobarlo** — verificar primero que sigue publicado y actualizado.
3. **Establecer previamente, y por escrito, la procedencia y el criterio de aprobación** de cualquier contenido nuevo antes de escribirlo — no repetir el patrón que originó este archivo.
4. Puntos de partida verificables para reconstruir el contexto completo, en orden:
   - Este documento.
   - Commit `900e0d8539a9a3bd94c4e5ff8cd4dd6d9138ad4e`.
   - `_incidente-trazabilidad-2026-07-19/docs/auditoria/ESTADO_MAESTRO_DOCUMENTAL.md` (la v2.1 íntegra).
   - `docs/gobernanza/infra-traza-001-archivado-fisico-conjunto-b.md` (el precedente).
   - `docs/auditoria/inventario-trazabilidad-claude-2026-07-19.md` y `docs/gobernanza/acta-preparacion-preview-vercel.md` (el origen del Incidente de Trazabilidad).

## 8. Qué NO debe interpretarse como aprobado por este archivo

- No aprueba, valida ni legitima el contenido de la Sección 10 de la v2.1.
- No aprueba ni propone una v3.0 de `ESTADO_MAESTRO_DOCUMENTAL.md`.
- No es, ni pretende ser, una fuente del estado técnico actual de ScenaIA.
- No reabre el Incidente de Trazabilidad 2026-07-19 ni ninguna de sus conclusiones ya certificadas.
- No autoriza ninguna implementación, migración ni cambio de código.
