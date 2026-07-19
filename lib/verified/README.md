# `lib/verified/` — ubicación provisional por incidente de trazabilidad

**No es una versión funcional distinta de ningún componente.** Es una medida temporal de preservación de evidencia, motivada exclusivamente por el incidente de trazabilidad abierto el 2026-07-19 sobre `Desktop/obrasdeteatro` (ver `docs/auditoria/inventario-trazabilidad-claude-2026-07-19.md`).

**Contexto:** varios directorios de `lib/` (`lib/observabilidad/`, `lib/analitica/`, `lib/sistemas-cache/`, `lib/spo/`, entre otros) contienen código cuya procedencia no ha podido demostrarse — no se ha determinado si ese contenido es válido o inválido, solo que no es verificable todavía. Por instrucción expresa de la Dirección, ese contenido permanece intacto, sin modificar, mover ni eliminar, mientras el incidente siga abierto.

Cuando la implementación de un componente ya autorizado (Plan Técnico congelado, arquitectura verificada) colisiona de nombre con un directorio ya ocupado por contenido no verificado, la implementación real se coloca aquí, bajo `lib/verified/<nombre-del-componente>/`, en vez de sobrescribir el directorio original.

**Qué significa esto y qué no:**
- No implica que el contenido de `lib/<componente>/` sea inválido.
- No implica que `lib/verified/<componente>/` vaya a sustituirlo automáticamente.
- La integración definitiva entre ambas ubicaciones (cuál permanece, cómo se reconcilian, o si se descarta alguna) se decidirá únicamente cuando el incidente de trazabilidad del repositorio quede resuelto — no antes, y no por iniciativa propia.

**Componentes aquí en este momento:**
- `lib/verified/observabilidad/` — implementación autorizada tras el Plan Técnico congelado (revisión R-02, 2026-07-19). Colisiona con `lib/observabilidad/` (Conjunto B, no verificado).
