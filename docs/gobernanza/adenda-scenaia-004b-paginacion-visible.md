# ADENDA AL ACTA DE AUTORIZACIÓN — Listado puro sin IA: paginación visible (Parte 3)

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-004B (adenda a SCENAIA-004)
**Fecha:** 2026-09-28
**Estado resultante:** AUTORIZADA CON CONDICIONES — LISTA PARA IMPLEMENTACIÓN

**Verificación documental previa a la asignación del expediente (2026-09-28):** `SCENAIA-004B` no existía en documentación, código, migraciones, material archivado bajo `_incidente-trazabilidad-2026-07-19/`, mensajes de commit de ninguna rama, objetos versionados de ninguna rama, el stash ni las referencias de respaldo (`refs/backup`), ni el respaldo permanente de `Documentos\respaldos\obrasdeteatro-2026-09-19`. El sufijo más alto en uso era `SCENAIA-004A`. El nombre `SCENAIA_PAGINACION_ENABLED` tampoco estaba en uso.

---

### 1. Objeto de la Adenda

Autorizar la **Parte 3** del Acta SCENAIA-004 —paginación visible del listado puro: diez fichas por turno, recuento y continuación explícita (§4.4)— **detrás del interruptor `SCENAIA_PAGINACION_ENABLED`, apagado por defecto**.

El §4.4 del Acta abrió «una señal de continuación en la petición». El diseño verificado exige además transportar la página y su recuento a través de contratos que el §4.4 no nombró. Esta Adenda los reabre **con alcance acotado, y solo estos**:

  a) el campo opcional `continuation` en el cuerpo de la petición;
  b) el sexto parámetro opcional de `coordinateFlow`;
  c) el campo `worksPage` en `KnowledgeRetrievalResult` y en `KnowledgeContext`, con el paso de la página por Scenaia Knowledge Model y Knowledge Assets hasta `listPublishedWorks`;
  d) la regla del Decision Engine: `offset > 0` implica `needsAI = false`, también con 0 resultados;
  e) el texto de `buildDirectContent` con el total;
  f) `listingPage` en `TurnOutcome` y en la respuesta HTTP, **siempre fuera de `ResponseContext`**;

y la interfaz que lo presenta (pie de página y botón «Ver más»). El resto del Acta SCENAIA-004 y de la Adenda SCENAIA-004A sigue vigente sin cambios.

### 2. Base documental

1. `docs/gobernanza/acta-autorizacion-scenaia-004-listado-puro.md` — §4.1 (definición cerrada de listado puro), §4.2 (`needsAI`), §4.3 (composición de fichas), §4.4 (paginación y señal de continuación, «contrato congelado»), §6.3 y §7 condición 8.
2. `docs/gobernanza/adenda-scenaia-004a-genero-y-tipos.md` — página con género hasta 1.000 candidatos, `total: null` al alcanzar el máximo y exportación de `PublishedWorksPage` y `PublishedWorksPageOptions`.
3. Partes ya en producción: #22 y #23 (listado puro), #26 (`36f0c13`, orden estable, desplazamiento y recuento en `listPublishedWorks`) y #27 (`8009980`, Adenda 004A).
4. `lib/verified/orquestador/types.ts` — `TurnOutcome`: el estado conversacional viaja junto a la respuesta, no dentro; `ResponseContext` no gana campos (PRD-001).
5. `lib/conversation-state/types.ts` y `lib/knowledge-assets/interpret-work-query.ts:39` — el estado guarda ranuras (`genero`, `duracion`, `edad`, `epoca`, `reparto`); **el autor y el número explícito de actores no son ranuras**.
6. Informe de solo lectura entregado a Dirección el 2026-09-28: recorrido de un listado puro desde `ScenaiaClient.tsx` hasta `listPublishedWorks` y vuelta, con archivos y líneas, y propuesta en cinco PR.
7. Índices vigentes de `public.works` (consulta de solo lectura, 2026-09-28): clave primaria (`id`), `slug` único parcial y tres índices parciales ajenos al listado (`access_type`, `institution_id`, `is_library_work`). **Ninguno sobre `title` ni sobre `is_published`.**

### 3. Qué se revisa

**Objetivo y escala.** ObrasDeTeatro® aspira a ser la mayor base de datos de obras teatrales del ámbito hispano, con **miles de obras a corto plazo**. La paginación no es un refinamiento para 11 obras: es la condición para que el listado siga siendo completo y honesto cuando el catálogo crezca. Esta Adenda se evalúa contra esa escala (§3 bis), no contra el catálogo actual.

**Hoy.** Un listado puro recupera como máximo 20 obras, sin orden y sin página (`retrieve-knowledge.ts:20` pasa `limit` indefinido), y las muestra todas en una sola respuesta. No hay forma de pedir la página siguiente ni de saber cuántas obras hay en total.

**Por qué no basta la señal del §4.4.** Pedir una página exige que el desplazamiento llegue a `listPublishedWorks` y que el recuento vuelva hasta la interfaz. Ese camino atraviesa el Orquestador, Scenaia Knowledge Model, Knowledge Assets, el Decision Engine y la composición: todos con contratos cerrados.

**Riesgo económico que la Parte 3 abriría sin una regla expresa.** La condición (e) del §4.1 («al menos una obra recuperada») haría que una página más allá del final dejase de ser listado puro y **acabase en la IA, reservando créditos**, por un simple clic en «Ver más».

### 3 bis. Análisis de escala

Cifras de coste **estimadas**, no medidas, sobre la consulta de la Parte 2 (filtro por `is_published` y `deleted_at`, orden por `title` e `id`, `count: 'exact'`) y los índices vigentes (§2.7). Las fichas pesan unos 690 bytes por obra con las columnas actuales (medido con las 11 obras reales).

| Aspecto | 5.000 obras | 50.000 obras |
|---|---|---|
| **Recuento exacto (`count: 'exact'`)** | Recorrido completo de la tabla por petición: del orden de milisegundos. Asumible. | Del orden de decenas de milisegundos por página, repetido en cada «Ver más» (la caché es de 60 s por página). Asumible, pero ya no despreciable. |
| **Orden por título** | Sin índice, ordenar 5.000 filas por página es barato. No bloquea. | Sin índice, cada página ordena el catálogo entero y cada desplazamiento profundo recorre todas las filas anteriores. **Hace falta un índice sobre `(title, id)`, parcial a obras publicadas y no borradas**, antes de llegar a esta escala. |
| **Género: tope de 1.000 candidatos** (Adenda 004A) | **Insuficiente.** Solo se evalúan las 1.000 primeras obras en orden alfabético: las comedias posteriores **no aparecen en ninguna página** y el recuento es `null`. El listado con género queda incompleto, aunque lo declara. | Igual, con más gravedad: se evalúa el 2 % del catálogo. |
| **Volumen por página** | Sin género: unos 7 KB (10 fichas). Con género: hasta ~690 KB (1.000 candidatos), en cada página. | Igual por página; el problema con género es de alcance, no de volumen. |
| **Modo sin página (20 obras)** | Todo lo que no es listado puro —las respuestas con IA incluidas— trabaja con 20 obras arbitrarias de 5.000, sin orden. Y con el interruptor apagado, **un listado puro mostraría 20 de 5.000 como si fueran todas**. | Igual, sobre 50.000. |

**Conclusiones.**
1. **El filtrado sin acentos en la base de datos es el siguiente expediente**, y debe estar en producción antes de que el catálogo supere las 1.000 obras. No se diseña aquí. El índice sobre `(title, id)` es un cambio de la base de datos y encaja en ese mismo expediente o en uno propio. Esta Adenda no autoriza ninguna migración.
2. **El interruptor no puede esperar a la escala**: con más de 20 obras, un listado puro sin paginación ya es incompleto (§4.9).
3. **El límite de 20 obras del modo sin página** afecta a la calidad de las respuestas con IA a gran escala. Es un problema de relevancia de la recuperación, fuera del alcance de esta Adenda, y queda señalado para su propio expediente.
4. **Diez fichas por página siguen siendo razonables** a 5.000 y a 50.000 obras. En una conversación, el valor a esa escala está en acotar la búsqueda (autor, género, época), no en páginas más largas: 50 fichas por turno serían ilegibles en el chat y no cambian el hecho de que recorrer 5.000 obras no es un uso real. «Mostrando 1-10 de 5.000» es, por sí mismo, la señal honesta para acotar. El tamaño queda en una constante ajustable (§4.2). Los totales se muestran con separador de miles («5.000»).

### 4. Qué cambia exactamente

**4.1 Interruptor.** `SCENAIA_PAGINACION_ENABLED`, apagado por defecto. Apagado, no se ejecuta ninguna rama nueva, no se lee `continuation` y **la respuesta es idéntica byte a byte a la actual**.

**4.2 Señal de continuación — `app/api/scenaia-verified/route.ts`.** Campo opcional `continuation: { offset: number }`. El botón «Ver más» reenvía **el mismo `message`** del listado con ese desplazamiento.
  - **Constantes únicas y ajustables.** El tamaño de página y el desplazamiento máximo se definen **una sola vez**, en el módulo del Orquestador, que la ruta ya importa: `LISTADO_TAMANO_PAGINA = 10` y `LISTADO_DESPLAZAMIENTO_MAXIMO = 50_000`. La ruta valida con ellas y el Orquestador pasa el tamaño de página como dato a Scenaia Knowledge Model y a Knowledge Assets, que no lo definen. Ningún otro punto del código repite esas cifras.
  - **Por qué 50.000.** En un catálogo de 50.000 obras, la última página empieza en 49.990: cualquier desplazamiento mayor que 50.000 no corresponde a ninguna página real de esa escala. El tope cubre el horizonte previsto y acota el coste de los desplazamientos profundos, que en PostgreSQL crece con el desplazamiento. Cuando el catálogo se acerque a esa cifra se sube la constante, en un único sitio. Si para entonces los desplazamientos profundos resultan lentos, se valorará la paginación por clave en su propio expediente.
  - Se valida en la ruta, junto a las cotas ya existentes y antes del flujo. **400 «Continuación no válida»** si no es un objeto, o si `offset` no es entero, es negativo, vale 0 o es mayor que `LISTADO_DESPLAZAMIENTO_MAXIMO`.
  - Solo se aplica si el intérprete marca la petición como listado puro de Obras (`requestsPlainListing`). En cualquier otro caso se ignora y el turno se resuelve exactamente como hoy.

**4.3 Orquestador — `coordinateFlow`.** Sexto parámetro opcional con la continuación ya validada. Sin él, el turno es idéntico al actual.

**4.4 Transporte de la página — `KnowledgeRetrievalResult` y `KnowledgeContext`.** Campo `worksPage: { offset, pageSize, returned, total: number | null } | null`, con el mismo patrón que ya siguió `workOccupancy` (Fase 3).
  - La página pasa por `buildKnowledgeContext`, `retrieveKnowledgeForDomain`, `retrieveRelevantKnowledge` / `SemanticRetriever.retrieve` (interfaz interna, sigue sin exportarse) y `listWorkKnowledge`, hasta `listPublishedWorks(criteria, LISTADO_TAMANO_PAGINA, { offset })`.
  - El modo página se usa **solo** en listados puros con el interruptor encendido. En cualquier otro caso `worksPage` es `null` y la recuperación es la de hoy.

**4.5 Decision Engine.** Si `worksPage.offset > 0`, `needsAI = false` **siempre**, también con 0 resultados. El Credit Manager (`NO_APLICA`, sin reserva) y el AI Gateway (`NO_REQUERIDO`) siguen actuando como segunda y tercera guarda, sin cambios.

**4.6 Composición — `buildDirectContent`.**
  - El texto usa el **total**: «he encontrado 11 resultados», no las 10 mostradas.
  - Con total `null`: «estas son las obras encontradas».
  - Página de continuación vacía: «No hay más obras en este listado.»

**4.7 Respuesta — `TurnOutcome` y cuerpo HTTP.** Campo `listingPage: { from, to, total: number | null, nextOffset: number | null } | null`, **al lado de `conversationState` y nunca dentro de `ResponseContext`**. `nextOffset` es `null` cuando no hay más obras: con total, si `to >= total`; con total `null`, si la página no vino llena.

**4.8 Interfaz.** Componente nuevo `ListingFooter` (`app/scenaia/components/`), pintado por `ChatMessage` bajo la respuesta que trae `listingPage`. `ScenaiaClient` guarda `listingPage` en cada mensaje y envía la continuación.

**4.9 Decisiones ya tomadas por Dirección.**
  - Pie con total: «Mostrando 1-10 de N». Con total `null`: **«Mostrando 1-10», sin cifra total**, nunca «de N».
  - Una sola obra en la página: **«Mostrando 11 de 11»**, no «11-11».
  - **400** ante una continuación inválida: no es un objeto, `offset` no entero, negativo, 0 o mayor que `LISTADO_DESPLAZAMIENTO_MAXIMO` (§4.2).
  - El botón «Ver más» aparece **solo en la última respuesta**, nunca en las anteriores, y está bloqueado mientras hay una petición en curso.
  - Las páginas de continuación se muestran pero **no entran en el historial enviado**, y no se añade ningún mensaje del usuario por pulsar «Ver más».
  - **El interruptor debe validarse y encenderse ANTES de la carga masiva de obras. Dirección decide la fecha de encendido, pero la paginación debe estar en producción y probada antes de que el catálogo supere el límite de 20 obras del modo sin página.**

**4.10 Lo que NO cambia.** `ResponseContext`; Repository Layer (Partes 2 y 004A, ya en producción); Request Interpreter; Credit Manager; AI Gateway; el contrato de `ConversationState`; las peticiones que no son listado puro; la base de datos (ni índices ni migraciones, §3 bis); y, con el interruptor apagado, todo.

### 5. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **Fiarse solo del estado conversacional, sin reenviar el texto** | El estado guarda ranuras, y el autor y el número explícito de actores no lo son: «obras de Lope, página 2» perdería el autor y mostraría otra lista. |
| **Descartar en silencio una continuación inválida** | Es el criterio del historial, pero aquí convertiría «Ver más» en la página 1: el usuario vería obras repetidas presentadas como nuevas. Un 400 es honesto y no cuesta nada. |
| **Estado o cursor guardado en el servidor** | No existe persistencia del estado en servidor (vive en el cliente por diseño); exigiría almacenamiento nuevo y su ciclo de vida. |
| **Que el cliente envíe los criterios ya resueltos** | Amplía la superficie que hay que validar como no confiable y duplica fuera del intérprete lo que el intérprete ya resuelve de forma determinista. |
| **Llevar la página en `ResponseContext` o en `responseMetadata`** | PRD-001 lo proscribe: `ResponseContext` no gana campos, y un `Record<string, string>` sería una convención implícita. |
| **Escribir el pie solo dentro del texto de la respuesta** | El botón no sabría qué desplazamiento pedir ni si hay más: texto y botón podrían contradecirse. |
| **Sin interruptor** | El cambio de orden (alfabético) y la división en páginas serían visibles al fusionar, sin que Dirección decida el momento. |

### 6. Riesgos y su acotación

1. **Económico: una continuación que llegue a la IA o reserve créditos.** Acotado por la regla del §4.5 y por las dos guardas ya existentes. Se prueba con **cero ejecuciones del Gateway y cero reservas** en toda continuación, incluida la página vacía, y se comprueba en producción: ninguna fila nueva en `credit_reservations` ni en `ai_requests` (§7.6).
2. **Mezcla de criterios con un «Ver más» antiguo** (texto de un listado anterior sobre un estado posterior). Acotado: el botón solo existe en la última respuesta.
3. **Historial desbordado por muchas páginas** (`MAX_HISTORY_TURNS`). Acotado: las páginas de continuación no se envían como historial.
4. **Catálogo cambiante entre páginas** (una obra añadida o retirada puede desplazar una ficha a la página contigua). Se acepta: el total se relee en cada página y ninguna ficha se inventa.
5. **Cambio visible de orden** (hoy la primera obra es *Teresa's Ecstasy*; en orden alfabético será la última). Acotado por el interruptor y por la decisión de Dirección sobre cuándo encenderlo.
6. **Manipulación de la petición.** Un `continuation` o un estado manipulados solo pueden pedir páginas que el usuario ya podría pedir: no autorizan nada, nunca tienen coste y los valores inválidos se rechazan (§4.2).
7. **Desbordar la reapertura.** Fuera de los puntos a)–f) del §1 y de la interfaz del §4.8, nada. Se comprueba revisando el diff de cada PR contra esta Adenda.

### 7. Condiciones de la futura implementación

1. **Cinco PR, en este orden:**
   1. Transporte de la página y del total (Knowledge Assets, Scenaia Knowledge Model, `KnowledgeContext.worksPage`), con el interruptor.
   2. Decision Engine y composición (continuación sin IA, texto con el total, página vacía).
   3. Ruta y Orquestador (constantes del §4.2, parseo y validación de `continuation`, sexto parámetro, `listingPage` en `TurnOutcome` y en la respuesta).
   4. Interfaz (`ListingFooter`, «Ver más» solo en la última respuesta, fuera del historial, bloqueo mientras hay petición en curso).
   5. Encendido en Preview y, cuando Dirección lo decida (§4.9), en Production.
2. **Catálogo simulado de varios cientos de obras** (Acta SCENAIA-004, §7 condición 8) **y, además, una prueba con un catálogo simulado de varios miles de obras**: páginas de 10 sin solapes ni huecos y recuento correcto atravesando Knowledge Assets y Scenaia Knowledge Model, desplazamientos profundos hasta la última página, el rechazo de un desplazamiento mayor que `LISTADO_DESPLAZAMIENTO_MAXIMO`, y con género el recuento `null` al superar los 1.000 candidatos.
3. **Con el interruptor apagado, respuesta idéntica byte a byte** a la actual, demostrado por pruebas.
4. Pruebas del riesgo económico del §6.1 y de cada decisión del §4.9, incluidos los cinco casos de 400.
5. Los invariantes de contrato se actualizan solo en lo que esta Adenda reabre. **Diff de cada PR revisado contra este alcance** antes de fusionar. Suite completa, `tsc`, lint y build en verde en cada PR.
6. **Comprobación en producción con una cuenta de prueba dedicada**, con recuento y huellas antes y después, y limpieza verificada: página 1 en orden alfabético con «Mostrando 1-10 de 11» y botón; «Ver más» con «Mostrando 11 de 11» y sin botón; un listado de una sola página sin botón; una continuación manipulada con 400; y ninguna fila nueva en `credit_reservations` ni en `ai_requests`.
7. Aceptación funcional de Dirección tras el despliegue.

### 8. Veredicto

**AUTORIZADA CON CONDICIONES.** Dirección autoriza la Parte 3 del Acta SCENAIA-004 según los puntos 4.1 a 4.9 de esta Adenda, en los términos de las condiciones del §7 y de las recogidas en el §9. Hasta que la implementación cumpla esas condiciones y se despliegue, el comportamiento no cambia: el listado puro sigue entregando hasta 20 fichas en una sola respuesta, sin pie ni continuación.

---

### 9. Autorización

**Decisión:** ☐ Autorizada   ☒ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

Se autoriza la Parte 3 del Acta SCENAIA-004 según los puntos 4.1 a 4.9 de esta Adenda, detrás de SCENAIA_PAGINACION_ENABLED, que debe validarse y encenderse antes de la carga masiva de obras. Esta Adenda no autoriza ningún cambio en la base de datos: el filtrado sin acentos y el índice sobre (title, id) requieren expediente propio, que debe estar en producción antes de que el catálogo supere las 1.000 obras.

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta o Adenda que la revise expresamente. Ningún alcance de este documento se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** Héctor Renee Díaz Bausson — Founder & CEO, obrasdeteatro.com   **Fecha:** 2026-09-28
