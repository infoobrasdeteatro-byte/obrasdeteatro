# ACLARACIÓN DE GOBERNANZA — Interpretación oficial del camino crítico

**Fecha:** 2026-07-19
**Objeto:** determinar, exclusivamente con evidencia documental, si la Lectura A o la Lectura B del camino crítico es la vigente — o si la documentación es insuficiente para decidirlo.
**No modifica** el Mapa Maestro, no inicia el ciclo del orquestador, no revisa IA-001/IA-006, no caracteriza nada.

---

## 1. Origen documental de la propia distinción Lectura A / Lectura B

Verificado contra el texto real: la distinción no procede de ningún documento Nivel 1 (SC-001 a SC-005, DT-001/002/003), ni de ninguna Acta de componente. **Procede del propio Mapa Maestro de Progreso**, redactado por esta misma vía de gobernanza el 2026-07-19, que la introdujo como herramienta de análisis y la dejó, en su propio texto, explícitamente sin resolver: *"Conclusión del camino crítico, con una bifurcación real que esta auditoría no resuelve por sí misma — depende de qué se entienda por 'funcional'."*

## 2. ¿Define algún documento anterior qué significa "primera ejecución funcional completa" de ScenaIA?

Revisada la instrucción original que dio origen al propio Mapa Maestro: pide determinar *"la secuencia mínima necesaria para conseguir la primera ejecución funcional completa de ScenaIA"*, distinguiéndolo expresamente de *"la finalización completa del proyecto"* — pero no precisa si esa "ejecución funcional" exige contenido real generado por un proveedor de IA, o si basta con que el pipeline complete su recorrido y produzca cualquier respuesta válida (incluida una denegación o un error controlado).

Revisada también la arquitectura Nivel 1 congelada: ningún documento (SC-003, SC-004.x, SC-005.x) define un criterio de aceptación para "primera ejecución funcional" como hito de proyecto — es un concepto de gobernanza de esta implementación, no de la Arquitectura Oficial congelada en la Fase 4.

**No existe, en ningún documento anterior a la creación de la propia distinción, una definición que permita resolverla.**

## 3. ¿Resolvió algo posterior esta ambigüedad, aunque fuera de forma indirecta?

Revisados todos los documentos de gobernanza emitidos después del Mapa Maestro (Acta de Validación de `ExecutionAudit`, Evaluación de Apertura, Reanudación de Analítica, Verificación de Prioridad del Orquestador): ninguno se pronuncia sobre qué lectura rige — todos citan la bifurcación tal como quedó en el Mapa Maestro, sin resolverla. La propia Verificación de Prioridad del Orquestador (inmediatamente anterior a esta aclaración) la señaló con más detalle, pero explícitamente **"no resuelve aquí cuál lectura es la vigente."**

---

## Conclusión

**Opción C — la documentación vigente resulta insuficiente para establecer una interpretación oficial del camino crítico.**

**Lo que falta, con precisión:** una decisión de gobernanza — no arquitectónica, no de diseño — que defina el criterio de aceptación de "primera ejecución funcional completa de ScenaIA" como hito de proyecto: si basta con que el pipeline complete su recorrido y produzca una respuesta válida cualquiera (Lectura A), o si se exige que una petición que necesita IA obtenga contenido realmente generado por un proveedor (Lectura B). Esta decisión no existe en ningún documento — ni en la Arquitectura Oficial (no le corresponde, es un criterio de proyecto, no de arquitectura), ni en ninguna Acta de gobernanza emitida hasta ahora. No es un vacío arquitectónico ni requiere caracterización — es una definición de criterio de éxito pendiente, competencia exclusiva de la Dirección del Proyecto.
