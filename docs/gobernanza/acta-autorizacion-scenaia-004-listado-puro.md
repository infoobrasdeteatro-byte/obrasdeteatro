# ACTA DE AUTORIZACIÓN — Listado puro sin IA (respuesta determinista con fichas)

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-004
**Fecha:** ____________
**Estado resultante:** PENDIENTE DE AUTORIZACIÓN — LA IMPLEMENTACIÓN NO ESTÁ AUTORIZADA

**Verificación documental previa a la asignación del expediente (2026-09-22):** `SCENAIA-004` no existía en documentación, código, migraciones, material archivado bajo `_incidente-trazabilidad-2026-07-19/`, mensajes de commit de ninguna rama, objetos versionados de ninguna rama, el stash de respaldo `refs/backup/stash-scenaia-bloque-3` (`f6f2caf`) ni el respaldo permanente de `Documentos\respaldos\obrasdeteatro-2026-09-19`. El expediente más alto en uso era `SCENAIA-003`.

---

### 1. Objeto del Acta

Autorizar que una petición de listado puro del catálogo de Obras se resuelva de forma determinista, con los datos ya recuperados y sin llamar al proveedor de IA.

Esta Acta **revisa una decisión vigente**: no se limita a autorizar lo ya aprobado. Por eso no puede tramitarse como decisión de implementación (acta de autorización del Orquestador, §4.6).

### 2. Base documental

1. `lib/decision-engine/needs-ai.ts` — regla vigente ("Reconexión del Núcleo Conversacional"), redactada en el propio código.
2. `docs/gobernanza/mapa-maestro-progreso-scenaia.md` §8, hito 3 — auditoría de experiencia de usuario que motivó esa regla.
3. `docs/gobernanza/scenaia-003-nucleo-factual-honesto.md` §4 (Caso 1), §5 y §8 (condición 7) — alcance de la respuesta determinista y prohibición de modificar `needsAI` dentro de aquel expediente.
4. `docs/actas-bloque-3/acta-cierre-decision-engine.md` §3 — `needsAI()` como aplicación del orden obligatorio de SC-002.
5. `docs/actas-bloque-3/acta-cierre-credit-manager.md` §2.4 — un turno sin IA no constituye operación económica.
6. `docs/actas-bloque-3/acta-cierre-repository-layer.md` — componente cerrado, afectado por la paginación (§4.4 de esta Acta).
7. Diagnóstico de respuesta truncada y propuesta de listado puro, entregados a Dirección el 2026-09-19, con datos reales de producción.

### 3. Principio que se revisa

**Regla vigente** (`needs-ai.ts`): conocimiento completo CON entidades recuperadas ⇒ se solicita IA, porque *"enumerar títulos no es responder a la petición del usuario, es listarla… la IA aporta la capa conversacional, nunca el dato"*.

**Por qué se revisa.** Esa regla se adoptó para corregir un defecto real: ScenaIA respondía de forma mecánica cuando sí había conocimiento. Pero la premisa era "lo determinista solo sabe enumerar títulos", y eso es una limitación del componente de composición, no del conocimiento disponible: el catálogo ya entrega autor, género, año, duración, reparto máximo, edad mínima e idioma, y todos esos campos ya viajan al proveedor en el prompt.

**Defecto verificado en producción.** "Dame una lista de todas las obras" se resuelve con IA y la respuesta se corta en la octava obra de once, al alcanzar el techo de 512 tokens (`RESPONSE_PARTIAL`). El usuario paga créditos por una lista incompleta que el sistema ya tenía completa antes de preguntar.

**Alcance de la revisión.** Se revisa la regla **solo** para las peticiones que cumplan la definición cerrada del §4.1. Fuera de ellas, la regla vigente sigue intacta: ante la duda, IA.

### 4. Qué cambia exactamente

**4.1 Definición cerrada de "listado puro".** Deben cumplirse TODAS:

  a) la petición contiene una expresión de una lista cerrada de listado;
  b) no contiene ninguna palabra que pida razonar (recomendar, comparar, elegir, resumir, explicar, superlativos);
  c) todos los criterios pedidos se han podido aplicar — sin autor no resuelto ni criterio pendiente;
  d) el dominio resuelto es Obras, y solo Obras;
  e) hay al menos un resultado recuperado.

Si falla cualquiera, el turno se comporta exactamente como hoy.

**4.2 Decisión.** `needsAI()` devuelve `false` en ese caso. Es el punto que esta Acta revisa, y el único.

**4.3 Composición.** `direct-content-builder` pasa a componer fichas con los campos ya presentes en `KnowledgeContext`, sin recuperar nada nuevo y sin inventar ninguna etiqueta. El nombre del idioma sale de la tabla compartida `lib/geo/languages.ts`, ya en producción.

**4.4 Paginación.** Diez fichas por turno, con recuento total y continuación explícita. **Queda dentro del alcance de esta Acta**, por decisión de Dirección, y no se tramita por separado.

**Motivo de la decisión.** El catálogo de obras crecerá a varios cientos en un plazo máximo de tres meses. La recuperación devuelve hoy un máximo de 20 resultados por dominio, de modo que, sin paginación, el listado puro reproduciría exactamente el síntoma que motiva esta Acta —contenido incompleto entregado sin aviso— en cuanto se supere ese límite. Autorizar el listado sin su paginación sería sustituir un corte por otro.

Lo que la decisión incluye:

  - **orden estable y desplazamiento en `listPublishedWorks`: la reapertura de Repository Layer queda AUTORIZADA como parte de esta Acta**, acotada a esas dos capacidades y a ningún otro cambio del componente. No requiere trámite aparte;
  - una señal de continuación en la petición — **contrato congelado**, que esta Acta abre con el mismo alcance acotado;
  - recuento total en la respuesta, para que el usuario sepa siempre cuántas obras hay y cuántas está viendo.

**4.5 Economía.** El turno no reserva ni liquida crédito alguno, por aplicación directa de la regla ya vigente: sin IA no hay operación económica. No se modifica `estimateCost`, ni Credit Manager, ni Accounting Engine.

**4.6 Lo que NO cambia.** El techo de 512 tokens; el prompt; la recuperación de conocimiento; el estado conversacional; el resto de la regla de `needsAI`; los avisos al usuario; y cualquier petición que no encaje en §4.1.

### 5. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **Subir el techo a 1024 tokens** | No resuelve el fondo: encarece cada turno con IA y alarga su espera, y la lista vuelve a cortarse hacia la obra dieciséis. Convierte un defecto de diseño en un problema de escala. |
| **Streaming (Arreglo D)** | No evita el corte: lo hace visible antes. Es una mejora de percepción, no de contenido, y se tramita en su propio expediente. Compatible con esta Acta, no sustitutiva. |
| **Dejarlo como está** | El usuario sigue recibiendo una lista incompleta y pagando por ella, con la información completa ya disponible en el sistema. |
| **Listado puro (propuesta)** | Respuesta completa y exacta, coste cero, sin espera de proveedor y sin riesgo de que el modelo invente. Su precio es una regla más y una respuesta menos conversacional en un conjunto acotado de peticiones. |

### 6. Riesgos y su acotación

1. **Respuesta menos natural** en las peticiones afectadas. Acotado por §4.1: solo alcanza a quien pide explícitamente una lista.
2. **Regla demasiado amplia**, que robe a la IA peticiones que sí la necesitan. Acotado por la condición (b) y por el criterio "ante la duda, IA", que debe quedar cubierto por pruebas antes de autorizar.
3. **Desbordamiento de la reapertura de Repository Layer.** La reapertura ya está autorizada en §4.4, así que el riesgo no es que se deniegue, sino que la implementación aproveche la puerta abierta y toque el componente más allá de lo acotado: **orden estable y desplazamiento en `listPublishedWorks`, y nada más**. Cualquier otro cambio —una consulta nueva, un accesor nuevo, una firma distinta, un filtro adicional— queda fuera de esta Acta aunque parezca conveniente. Se acota con dos comprobaciones: **revisión del diff de Repository Layer contra esas dos capacidades exclusivamente**, antes de fusionar, y las **pruebas sobre el catálogo simulado (§7, condición 8)**, que verifican que lo tocado hace lo que debe —orden estable entre páginas y recuento correcto— bajo la carga real prevista.

### 7. Condiciones de la futura implementación

1. Reversible por completo y contenida en los archivos declarados.
2. Ningún componente cerrado se modifica sin la reapertura expresa del §4.4.
3. Llamadas adicionales a IA: 0. Créditos adicionales: 0.
4. La regla del §4.1 vive en un único lugar; ningún otro componente interpreta texto para decidirla.
5. Pruebas obligatorias: los casos que cambian, los que no, y los límites de la regla.
6. Suite completa, `tsc`, lint y build en verde.
7. Aceptación funcional de Dirección tras el despliegue.
8. Las pruebas de la paginación deben ejecutarse sobre un **catálogo simulado de varios cientos de obras**, no solo sobre las 11 del catálogo actual: hay que comprobar el orden estable entre páginas y el recuento "mostrando X de N" bajo la carga real prevista (§4.4). Un catálogo de 11 obras cabe entero en una sola recuperación y no ejercita nada de lo que la paginación existe para resolver.

### 8. Veredicto

**PENDIENTE.** Esta Acta no autoriza nada por sí misma: revisa una decisión vigente y la somete a Dirección. Sin firma, la regla actual sigue intacta.

---

### 9. Autorización

**Decisión:** ☐ Autorizada   ☐ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

_______________________________________________________________

**Firma:** ____________________________   **Fecha:** ____________
