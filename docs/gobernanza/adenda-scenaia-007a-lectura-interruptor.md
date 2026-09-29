# ADENDA AL ACTA DE AUTORIZACIÓN — Dónde se lee el interruptor de época

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-007A (adenda a SCENAIA-007)
**Fecha:** 2026-09-29
**Estado resultante:** AUTORIZADA CON CONDICIONES — LISTA PARA IMPLEMENTACIÓN

**Verificación documental previa a la asignación del expediente (2026-09-29):** `SCENAIA-007A` no existía en ninguno de estos sitios:
- la documentación, el código, las migraciones ni el material archivado bajo `_incidente-trazabilidad-2026-07-19/`;
- los ficheros de los tres árboles de trabajo adicionales (`_aec003-fase5`, `_scenaia-003-replay` y `_scenaia-007-pr3`);
- los mensajes de commit ni los objetos versionados de ninguna rama, incluidos el reflog, el stash y las referencias de respaldo (`refs/backup`). Son 73 referencias en total;
- los 1.497 objetos sueltos o inalcanzables del repositorio, examinados uno a uno;
- el respaldo permanente de `Documents\respaldos\obrasdeteatro-2026-09-19`.

Las adendas existentes son la 004A, la 004B y la 006A.

---

### 1. Objeto de la Adenda

Corregir el **§4.2 del Acta SCENAIA-007** en lo que se refiere a dónde se lee el interruptor `SCENAIA_EPOCA_ENABLED` y cómo llega a quien lo usa. Como consecuencia, ampliar el alcance de su PR 3 a los ficheros que **solo transportan** ese valor. Nada más. El resto del Acta SCENAIA-007 sigue vigente sin cambios.

### 2. Base documental

1. **Acta SCENAIA-007, §4.2:** decía que el interruptor se leería «en `semantic-retriever` y en la ruta HTTP, nunca dentro del intérprete».
2. **Invariante de Knowledge Assets fijado en la SCENAIA-004B (PR 1, #28):** «transporta la página como dato: no define el tamaño ni lee el interruptor». Está en `lib/knowledge-assets/__tests__/contract-invariants.test.ts` y prohíbe cualquier lectura de `process.env` en ese componente, `semantic-retriever.ts` incluido.
3. **Precedente de `SCENAIA_PAGINACION_ENABLED`:** se lee en `lib/verified/orquestador/paginacion.ts` y el tamaño de página llega a Knowledge Assets como dato.
4. **Decisión de Dirección del 2026-09-29:** opción B, con el alcance del PR 3 ampliado a la ruta, al Orquestador, a `knowledge-context-builder.ts` y a `retrieve-knowledge.ts` como tránsito, y sin tocar ningún invariante existente.
5. **PR #36:** implementación del PR 3 conforme a esta Adenda.

### 3. Qué se revisa

Leer el interruptor en `semantic-retriever`, como decía el §4.2, rompería el invariante de la 004B. Además, `validate.ts` necesita el valor del interruptor, pero es un módulo puro que solo puede importar de Knowledge Assets y lo invoca la ruta. El §4.2 no resolvía ninguna de las dos cosas sin tocar un invariante ya fijado por Dirección.

### 4. Qué cambia exactamente

**4.1 Dónde se lee.** En dos puntos, y solo en esos:
- **en el Orquestador,** en un fichero nuevo `lib/verified/orquestador/epoca.ts`, con el mismo patrón que `paginacion.ts`: lista cerrada `'1'`/`'true'` y lectura en cada petición. El Orquestador lo lee una sola vez por turno;
- **en la ruta** `app/api/scenaia-verified/route.ts`, para validar el estado heredado.

**4.2 Cómo viaja, siempre como dato.**
- **Al intérprete:** el Orquestador → `buildKnowledgeContext` (`knowledge-context-builder.ts`) → `retrieveKnowledgeForDomain` (`retrieve-knowledge.ts`) → `retrieveRelevantKnowledge` → `interpret-work-query.ts`, que sigue siendo puro. Solo Obras lo recibe.
- **Al Intent Resolver:** desde el Orquestador (`buildResolverPrompt`, `resolveVocabulary` y `composeAugmentedRequest`).
- **A la validación del estado:** la ruta lo pasa como opción a `parseConversationState(body, { epocaHabilitada })`.

**4.3 Alcance ampliado del PR 3.**
- Entran como **tránsito puro:** la ruta, el Orquestador (`epoca.ts` y las dos llamadas a `buildKnowledgeContext` en `coordinate-flow.ts`), `knowledge-context-builder.ts`, `retrieve-knowledge.ts` y `retrieveRelevantKnowledge`. En ellos no cambia nada más que el transporte del valor.
- **Exportaciones:** `lib/knowledge-assets/index.ts` y `lib/intent-resolver/index.ts` solo exportan los tipos y funciones nuevos que ese transporte necesita.

**4.4 Con el interruptor apagado,** no se añade ningún argumento a ninguna llamada: son exactamente las anteriores.

**4.5 Validación del estado.** La comprobación de que cada concepto pertenece a su ranura se aplica en los dos estados del interruptor. Con el interruptor apagado, rechaza también parejas que nunca fueron coherentes, como `{epoca: 'COMEDIA'}`, y que antes pasaban. Ningún estado emitido por el servidor tiene esa forma.

**4.6 Lo que NO cambia.**
- Ningún invariante de contrato existente.
- Los §4.1, §4.3, §4.4, §4.7 y siguientes del Acta SCENAIA-007.
- El comportamiento con el interruptor apagado.

### 5. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **Leerlo en `semantic-retriever`, como decía el §4.2** | Exige modificar el invariante de la 004B y abrir la primera excepción a una regla fijada por Dirección. Además, `validate.ts` pasaría a depender del entorno de forma indirecta. |
| **Leerlo en el Orquestador y en la ruta y transportarlo como dato (adoptada)** | No toca ningún invariante y sigue el precedente de la paginación. Su coste son unos pocos ficheros de tránsito, acotados en el §4.3. |

### 6. Riesgos y su acotación

1. **Dos lecturas por petición** (ruta y Orquestador). La variable solo cambia al redesplegar, así que dentro de una misma petición ambas lecturas coinciden.
2. **Un llamador futuro que no transporte la opción.** Se comportaría como con el interruptor apagado, que es el valor seguro por defecto.
3. **Desbordar el tránsito.** Lo acotan invariantes nuevos:
   - `SCENAIA_EPOCA_ENABLED` solo se lee en `epoca.ts`, en todo `lib/` y `app/`;
   - ni el intérprete, ni el recuperador, ni el Intent Resolver, ni `validate.ts`, ni los ficheros de tránsito leen el entorno;
   - el Orquestador lo lee una sola vez por turno.

### 7. Condiciones

1. Las pruebas del PR 3 demuestran el transporte en los dos estados del interruptor y que, apagado, las llamadas son las de siempre.
2. Los invariantes del §6.3 forman parte del PR 3.
3. El diff del PR 3 se revisa contra el §4.3 antes de fusionar.
4. Aceptación de Dirección.

### 8. Veredicto

**AUTORIZADA CON CONDICIONES.** Dirección autoriza los puntos del §4 de esta Adenda, en los términos de las condiciones del §7 y de las recogidas en el §9. El resto del Acta SCENAIA-007 sigue vigente sin cambios.

---

### 9. Autorización

**Decisión:** ☐ Autorizada   ☒ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

Se autoriza la corrección del §4.2 del Acta SCENAIA-007 y la ampliación de alcance del PR 3 según los términos del §4 de esta Adenda. El resto del Acta SCENAIA-007 sigue vigente sin cambios.

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta o Adenda que la revise expresamente. Ningún alcance de este documento se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** Héctor Renee Díaz Bausson — Founder & CEO, obrasdeteatro.com   **Fecha:** 2026-09-29
