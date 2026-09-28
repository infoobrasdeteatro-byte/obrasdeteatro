# ACTA DE AUTORIZACIÓN — Filtrado de género sin acentos en la base de datos

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-006
**Fecha:** ____________
**Estado resultante:** ____________

**Verificación documental previa a la asignación del expediente (2026-09-28):** `SCENAIA-006` no existía en ninguno de estos sitios:
- la documentación, el código, las migraciones ni el material archivado bajo `_incidente-trazabilidad-2026-07-19/`;
- los mensajes de commit ni los objetos versionados de ninguna rama, incluidos el reflog, el stash y las referencias de respaldo (`refs/backup`);
- los 32 objetos sueltos del repositorio;
- el respaldo permanente de `Documents\respaldos\obrasdeteatro-2026-09-19`. Los dos paquetes git que contiene solo apuntan a commits presentes en ramas locales revisadas.

El número más alto en uso era `SCENAIA-005`. Tampoco estaban en uso los nombres `SCENAIA_GENERO_SQL_ENABLED`, `genre_normalizado`, `f_unaccent`, `works_genre_normalizado_trgm_idx` ni `works_publicadas_titulo_id_idx`.

---

### 1. Objeto del Acta

Autorizar el **filtrado del género sin acentos en la base de datos** para el modo página de `listPublishedWorks`, con la opción (b) del informe del 2026-09-28. Se hace en **dos migraciones**:

  a) **Migración 1:** la extensión `unaccent`, una función envoltorio inmutable `public.f_unaccent(text)`, la columna generada `works.genre_normalizado` y su índice de trigramas;
  b) **Migración 2:** el índice parcial sobre `(title, id)` para el orden estable del listado;

y el **filtro por SQL en el modo página de `listPublishedWorks`**, detrás del interruptor propio `SCENAIA_GENERO_SQL_ENABLED`, apagado por defecto.

Nada más. Quedan **fuera** de esta Acta:
  - **El modo sin página** de `listPublishedWorks`. Su paso a SQL y la retirada de `matchesGenre`, `stripDiacritics` y los topes de candidatos quedan para un PR 3 aparte, que exige su propia autorización y su propio periodo de observación antes de fusionarse.
  - **La época tratada como género** («teatro clásico», «Siglo de Oro»). Queda señalada como **el siguiente expediente prioritario** tras este (§3.3).
  - La lista cerrada de géneros y la normalización al importar obras (BNE y Biblioteca Virtual Miguel de Cervantes).

### 2. Base documental

1. **Informe de solo lectura entregado a Dirección el 2026-09-28**: cómo se filtra hoy el género, comparación de las opciones (a), (b) y (c), normalización al importar, índice parcial sobre `(title, id)`, cambios en Repository Layer y división en PRs.
2. **SCENAIA-002C, Punto 2** (excepción documentada en `lib/repository-layer/works.ts`). El género se compara en memoria (`stripDiacritics`, `matchesGenre`) porque un `ILIKE` de PostgreSQL no ignora los acentos. La propia excepción dice que la solución definitiva «queda pendiente de un expediente futuro; esta excepción no la sustituye». **Esta Acta la revisa** (§4.5).
3. **Reapertura acotada de Repository Layer.** El componente está cerrado y congelado desde el 2026-07-13 (`docs/gobernanza/mapa-maestro-progreso-scenaia.md`). Se reabrió por última vez en el §4.4 del Acta SCENAIA-004 y en la Adenda 004A. Esta Acta lo reabre de nuevo, solo en lo que dice el §4.4.
4. **`docs/gobernanza/adenda-scenaia-004a-genero-y-tipos.md`.** Su **§4.1** (1.000 candidatos con género en modo página y `total: null` al alcanzar el máximo) **queda sustituido para el género** mientras el interruptor esté encendido (§4.6).
5. **`docs/gobernanza/adenda-scenaia-004b-paginacion-visible.md`.** Su **§3 bis queda resuelto en lo que toca al género**: filtrado sin acentos e índice sobre `(title, id)`. Su §9 exigía este expediente antes de superar las 1.000 obras.
6. `lib/knowledge-assets/interpret-work-query.ts:339-341`: el criterio `genre` solo toma los valores `comedia`, `musical` y `clasico`.
7. **Hechos de la base de datos** (consultas de solo lectura, 2026-09-28):
   - `works.genre` es `text`, sin restricción ni índice.
   - `unaccent` está disponible (1.1) pero no instalada. `pg_trgm` está instalada.
   - La colación es `en_US.UTF-8`.
   - Ningún índice de `works` cubre `title` ni `is_published`.
   - Hay 11 obras publicadas, con unos 690 bytes por obra.

### 3. Qué se revisa

**3.1 El límite del filtro en memoria.** En modo página, el género se compara en memoria sobre las 1.000 primeras obras en orden alfabético (Adenda 004A).
- **Con más de 1.000 obras publicadas,** las posteriores **no se evalúan nunca**: no aparecen en ninguna página y el recuento es `null`.
- **Con 50.000 obras,** se evaluaría el 2 % del catálogo.
- **La Adenda 004A lo declaró honestamente, pero no lo resolvía.** La Adenda 004B exigió este expediente antes de superar las 1.000 obras.

**3.2 Por qué no basta un `ILIKE` directo.** Está verificado con las 11 obras actuales: **pierde «Teatro clásico» con el término `clasico`**. Un filtro sin acentos coincide con `matchesGenre` en los tres términos del intérprete, incluida la inclusión de «Tragicomedia» en `comedia`.

**3.3 Lo que este expediente no resuelve: la época como género.** Hoy «Teatro clásico» figura como género principal. Las diez obras de Calderón y de Lope llevan «Teatro del Siglo de Oro» solo en `secondary_genres`, que ningún filtro consulta. Por eso **«obras de teatro clásico» devuelve 1 de las 10 obras del Siglo de Oro**. Es un problema de vocabulario, no de acentos.

Se suman tres vocabularios distintos:
- el desplegable de los formularios (16 valores, duplicado en dos ficheros);
- la taxonomía de la Biblioteca;
- los valores de los lotes del Archivo Maestro.

**Queda señalado como el siguiente expediente prioritario tras este.**

### 4. Qué cambia exactamente

**4.1 Migración 1 — normalización del género.**
  - `create extension if not exists unaccent with schema extensions;`
  - **Función envoltorio `public.f_unaccent(text)`**, declarada `immutable`, `strict` y `parallel safe`. Llama a `extensions.unaccent('extensions.unaccent'::regdictionary, $1)` con el diccionario nombrado expresamente, para no depender de `search_path`.
  - **Columna generada:**
    `works.genre_normalizado text generated always as (lower(public.f_unaccent(coalesce(genre, '')))) stored`.
    Se rellena sola al crearse, para todas las obras existentes, y se mantiene sola en cada alta o edición. **No requiere cambios en los formularios ni en las importaciones.**
  - **Índice `works_genre_normalizado_trgm_idx`:** GIN con `gin_trgm_ops`, del esquema en que esté instalada `pg_trgm`, que se verifica antes de redactar la migración. Tamaño estimado: unos 0,3 MB con 5.000 obras y de 2 a 4 MB con 50.000.
  - **Migración inversa** redactada y probada en el mismo PR (§6.3).

**4.2 Migración 2 — índice para el orden estable.**
  ```sql
  create index concurrently works_publicadas_titulo_id_idx
    on public.works (title, id)
    where is_published and deleted_at is null;
  ```
  - **`CONCURRENTLY` no puede ir dentro de una transacción.** Va en una migración aparte, o sin `CONCURRENTLY` mientras el catálogo sea del tamaño actual.
  - **Hereda la colación `en_US.UTF-8`,** la misma del `ORDER BY`.
  - **Tamaño estimado:** unos 0,3 MB con 5.000 obras y de 3 a 5 MB con 50.000.

**4.3 Interruptor.** `SCENAIA_GENERO_SQL_ENABLED`, apagado por defecto y leído en cada llamada, como `SCENAIA_PAGINACION_ENABLED`. **Apagado, `listPublishedWorks` es idéntica a la actual:** `matchesGenre` sobre 1.000 candidatos y `total: null` al alcanzar el máximo.

**4.4 Repository Layer — rama paginada de `listPublishedWorks` con género, y solo esa.** Con el interruptor encendido:
  - el género se filtra en la misma consulta que el resto del criterio, con `.ilike('genre_normalizado', '%' + término + '%')`;
  - el término se escapa (`%`, `_`, `\`) y se normaliza con la misma regla: minúsculas y sin acentos;
  - la consulta usa `count: 'exact'`, `range` y el orden `title`, `id`;
  - el recuento es exacto a cualquier escala, **sin tope de candidatos y sin `total: null` por tope**.

**No cambian:**
  - `Work` ni `WORK_COLUMNS`: la columna normalizada **no se expone** fuera de Repository Layer;
  - la firma de `listPublishedWorks`;
  - la llamada sin página;
  - cualquier otra función de Repository Layer.

**La clave de caché distingue los dos caminos,** para que encender o apagar el interruptor no sirva páginas del camino anterior.

**4.5 Revisión de SCENAIA-002C, Punto 2.**
  - **Se retira la excepción para el modo página con el interruptor encendido:** el género se resuelve en SQL, como el resto de campos de `WorkSearchCriteria`.
  - **La excepción sigue vigente, de forma transitoria,** en dos casos: el modo sin página y el modo página con el interruptor apagado. Se retirará del todo con el PR 3, que exige autorización propia (§1).
  - `matchesGenre` y `stripDiacritics` permanecen en el código hasta entonces.

**4.6 Sustitución del §4.1 de la Adenda 004A.** Con el interruptor encendido, el máximo de 1.000 candidatos y la regla `total: null` al alcanzarlo **dejan de aplicarse al género**. Con el interruptor apagado siguen vigentes, sin cambios.

**4.7 Decisiones ya tomadas por Dirección.**
  - **Opción (b):** columna normalizada generada con índice de trigramas, más el índice parcial sobre `(title, id)`, en dos migraciones.
  - **El modo sin página queda fuera de alcance por ahora:** PR 3 aparte, con autorización y periodo de observación propios antes de fusionarse.
  - **La época como género se trata en otro expediente,** que queda como **prioritario** tras este.

**4.8 Lo que NO cambia.**
  - `ResponseContext`;
  - Request Interpreter y los tres valores de género que produce;
  - Knowledge Assets, Scenaia Knowledge Model, Decision Engine, Credit Manager y AI Gateway;
  - la ficha de la obra («Otras obras de este género», igualdad exacta sobre `genre`);
  - los formularios de alta y edición, y las importaciones;
  - `secondary_genres`;
  - con el interruptor apagado, todo el comportamiento de la aplicación.

### 5. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **(a) `unaccent` con envoltorio y campo calculado de PostgREST, sin columna** | Mismo resultado, pero con un índice de expresión más delicado de mantener y un mecanismo menos conocido. No aporta nada frente a (b). |
| **(c) Lista cerrada de géneros con clave foránea** | Es la solución de fondo para la taxonomía, pero cambia el modelo de datos. También cambia los formularios, las importaciones y la ficha de la obra, y la semántica del filtro: «comedia» dejaría de ser «contiene». Pertenece al expediente de taxonomía (§3.3). |
| **`ILIKE` directo sobre `genre`** | Verificado: pierde «Teatro clásico» con `clasico` (§3.2). |
| **Subir el tope de candidatos en memoria** | No escala: el volumen transferido crece con el catálogo y el tope de filas de la API sigue existiendo. |
| **Colación ICU no determinista** | No admite `LIKE` en PostgreSQL y cambiaría el orden por título. |

### 6. Riesgos y su acotación

1. **Inmutabilidad de la función envoltorio.** `unaccent` depende de un diccionario de texto. Se declara inmutable para poder usarla en una columna generada, aunque técnicamente no lo es.
   - **Riesgo:** si el diccionario cambiara, las filas ya guardadas no se recalcularían.
   - **Acotación:** el diccionario se nombra expresamente (§4.1). Ante una actualización de la extensión o de PostgreSQL que lo cambie, se regenera la columna y se reindexa (`reindex index works_genre_normalizado_trgm_idx`). La prueba de equivalencia del §7.3 lo detecta.
2. **Bloqueo breve al crear la columna.** Una columna generada `stored` reescribe la tabla y la bloquea mientras dura. **Con el catálogo actual (11 obras) es trivial.** Con 50.000 obras serían segundos: una razón más para aplicarla ahora.
3. **Reversibilidad.** Las dos migraciones son reversibles: se borran los índices, la columna y la función, y la extensión si nada más la usa. La migración inversa se redacta y se prueba en el PR 1. Con el interruptor apagado, la aplicación no depende de la columna: **revertir no exige desplegar código**.
4. **Escrituras que envíen la columna generada.** PostgreSQL rechaza cualquier escritura que dé un valor a `genre_normalizado`. Antes del PR 1 se verifica que ninguna escritura sobre `works` la incluya: formularios, importaciones o actualizaciones construidas a partir de un `select('*')`.
5. **La migración se aplica directamente sobre la base de producción.** Se ensaya antes en una rama de base de datos de Supabase o en un PostgreSQL local con el esquema de producción. La migración 1 no cambia el comportamiento de la aplicación.
6. **Equivalencia con `matchesGenre`.**
   - `unaccent` y `stripDiacritics` coinciden en castellano.
   - `unaccent` además descompone ligaduras (œ→oe, ß→ss), que JavaScript no toca. Con los tres términos del intérprete no hay diferencia observable.
   - Lo cubre una prueba específica (§7.2).
7. **Desbordar la reapertura de Repository Layer.** Fuera de los §4.4 a §4.6, nada. Se revisa el diff de cada PR contra esos puntos antes de fusionar.

### 7. Condiciones de la futura implementación

1. **PRs, en este orden:**
   0. Esta Acta.
   1. **Migraciones** (§4.1 y §4.2), sin ningún cambio de código de la aplicación.
   2. **Filtro por SQL** en el modo página de `listPublishedWorks` (§4.4), detrás de `SCENAIA_GENERO_SQL_ENABLED`, apagado por defecto.

   El PR 3 (modo sin página y retirada completa de la excepción) **no queda autorizado por esta Acta**.
2. **Pruebas:**
   - **Con el interruptor apagado,** comportamiento idéntico al actual, demostrado por pruebas. Las pruebas existentes siguen en verde sin modificarse.
   - **Integración contra la rama de base de datos,** con un **catálogo simulado de varios miles de obras** que tengan géneros con acentos, mayúsculas y ligaduras. Deben cumplirse:
     - resultados idénticos a los de `matchesGenre` para `comedia`, `musical` y `clasico`;
     - recuento exacto también por encima de 1.000 coincidencias;
     - recorrido completo en páginas de 10, sin solapes ni huecos;
     - `EXPLAIN` que muestre el uso de los dos índices;
     - escapado correcto de `%` y `_` en el término.
   - Suite completa, `tsc`, lint y build en verde en cada PR.
3. **Tras el PR 1, comprobación de equivalencia en producción,** de solo lectura, con las 11 obras actuales:
   - todas las filas cumplen `genre_normalizado = lower(f_unaccent(coalesce(genre, '')))`;
   - `comedia` → **5 obras** (incluida la Tragicomedia);
   - `musical` → **0 obras**;
   - `clasico` → **1 obra**;
   - en los tres casos, los mismos identificadores que devuelve hoy `matchesGenre`.
4. **Tras el PR 2, repetición de la prueba del PR 5 de la Adenda 004B.** Se hace con una compilación local contra la base de producción, con `SCENAIA_PAGINACION_ENABLED` y `SCENAIA_GENERO_SQL_ENABLED` encendidos. Cuenta de prueba dedicada, con recuentos y huellas antes y después y limpieza verificada. Resultados exigidos:
   - «dame la lista de obras de comedia» → 5 fichas y «Mostrando 1-5 de 5»;
   - «teatro clásico» → 1 ficha y «Mostrando 1 de 1»;
   - el listado sin género sigue igual;
   - ninguna fila nueva en `credit_reservations` ni en `ai_requests`.
5. **Diff de cada PR revisado contra este alcance** antes de fusionar.
6. **Encendido.** Dirección decide cuándo se enciende `SCENAIA_GENERO_SQL_ENABLED` en Production. Condiciones:
   - debe estar encendido **antes de que el catálogo supere las 1.000 obras**;
   - solo actúa con la paginación encendida, así que exige `SCENAIA_PAGINACION_ENABLED` encendido antes o a la vez.
7. **Aceptación funcional de Dirección** tras el despliegue.

### 8. Veredicto

____________

---

### 9. Autorización

**Decisión:** ☐ Autorizada   ☐ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

____________

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta o Adenda que la revise expresamente. Ningún alcance de este documento se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** ____________________________   **Fecha:** ____________
