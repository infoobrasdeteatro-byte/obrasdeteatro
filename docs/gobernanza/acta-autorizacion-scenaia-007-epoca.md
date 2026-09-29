# ACTA DE AUTORIZACIÓN — La época como dimensión propia

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-007
**Fecha:** 2026-09-29
**Estado resultante:** AUTORIZADA CON CONDICIONES — LISTA PARA IMPLEMENTACIÓN

**Verificación documental previa a la asignación del expediente (2026-09-29):** `SCENAIA-007` no existía en ninguno de estos sitios:
- la documentación, el código, las migraciones ni el material archivado bajo `_incidente-trazabilidad-2026-07-19/`, incluidos los ficheros ignorados por git;
- los ficheros de los dos árboles de trabajo adicionales (`_aec003-fase5` y `_scenaia-003-replay`);
- los mensajes de commit ni los objetos versionados de ninguna rama, incluidos el reflog, el stash y las referencias de respaldo (`refs/backup`). Son 68 referencias en total, 2 de ellas de respaldo;
- los 1.458 objetos sueltos o inalcanzables del repositorio, examinados uno a uno;
- el respaldo permanente de `Documents\respaldos\obrasdeteatro-2026-09-19`. Los dos paquetes git que contiene solo apuntan a commits presentes en el repositorio local.

El número más alto en uso era `SCENAIA-006`. Tampoco estaban en uso, ni en el código ni en la base de datos, los nombres:
- `SCENAIA_EPOCA_ENABLED`;
- `epocas`;
- `works_epocas_check`;
- `works_epocas_gin_idx`.

La base de producción no tiene ninguna columna, restricción, índice ni función cuyo nombre contenga «epoca».

---

### 1. Objeto del Acta

Autorizar el tratamiento de la **época como dimensión propia**, separada del género, en cuatro piezas:

  a) **Base de datos:** la columna `works.epocas text[]`, con una lista cerrada de valores garantizada por una restricción `CHECK`, un índice GIN y el relleno de las obras actuales en los términos del §4.1;
  b) **Repository Layer:** el campo `WorkSearchCriteria.epocas` y su traducción en `applyCriteria` mediante `.overlaps` (§4.3);
  c) **Intérprete:** reconocimiento de términos de época en la ranura `epoca` de `interpret-work-query.ts`, con la revisión expresa de la ambigüedad «clásico» (§4.4);
  d) **Interruptor propio:** `SCENAIA_EPOCA_ENABLED`, apagado por defecto (§4.2).

Nada más. Quedan **fuera** de esta Acta:
  - **Los formularios de alta y edición** (selector de época). Pertenecen a un expediente propio.
  - **El desplegable de género,** que sigue ofreciendo «Teatro clásico» y «Teatro contemporáneo», y **la taxonomía de géneros** en general (tres vocabularios distintos). Pertenecen al expediente de taxonomía de géneros.
  - **La carga masiva** desde la BNE y la BVMC, y cómo se asigna la época a las obras que traiga.
  - **`secondary_genres`,** que no se modifica ni se vacía.
  - **El modo sin página del género** (PR 3 de SCENAIA-006), que sigue sin autorizar.

### 2. Base documental

1. **Informe de solo lectura entregado a Dirección el 2026-09-29:**
   - diagnóstico de la época tratada como género;
   - recuentos de producción;
   - ejecución real del intérprete;
   - comparación de las opciones (a) columna `text[]`, (b) `secondary_genres`, (c) derivación por año y (d) tablas N:M;
   - fuentes BNE y BVMC;
   - división en PRs.
2. **SCENAIA-002C, Punto 2** (excepción documentada en `lib/repository-layer/works.ts`). Su principio es que todo campo de `WorkSearchCriteria` se resuelve en SQL, y el género quedó como única excepción transitoria.
   - Esta Acta aplica **el mismo espíritu a un campo distinto**: `epocas` nace resolviéndose en SQL, en los dos modos de `listPublishedWorks`, **sin excepción en memoria, sin tope de candidatos y sin depender de `SCENAIA_GENERO_SQL_ENABLED`**.
3. **Reapertura acotada de Repository Layer.** El componente está cerrado y congelado desde el 2026-07-13 (`docs/gobernanza/mapa-maestro-progreso-scenaia.md`). Se reabrió en el §4.4 del Acta SCENAIA-004, en la Adenda 004A y en el §4.4 del Acta SCENAIA-006. Esta Acta lo reabre de nuevo, **solo en lo que dice el §4.3**.
4. **`lib/knowledge-assets/interpret-work-query.ts`, líneas 328-332.** El comentario resuelve hoy la ambigüedad «clásicos» (género o época) **hacia género**, «pendiente de confirmación de Dirección si se prefiere la interpretación por época».
   - **Esta Acta es esa confirmación:** con el interruptor encendido, la ambigüedad se resuelve **hacia época** (§4.4).
   - Además, el criterio `genre` deja de tomar el valor `clasico` (líneas 105 y 341).
5. **Acta SCENAIA-006, §3.3 y §4.7.** Señalaron la época como género como el siguiente expediente prioritario. El §7.4 de esa Acta se revisa en la Adenda SCENAIA-006A, que se tramita a la vez que esta.
6. **Hechos de la base de datos** (consultas de solo lectura, 2026-09-29):
   - 11 obras, todas publicadas y ninguna borrada.
   - `works.genre`: «Teatro clásico» figura en **1** obra (*La vida es sueño*) y «Teatro contemporáneo» en 1 (*Teresa's Ecstasy*).
   - `secondary_genres`: «Teatro del Siglo de Oro» figura en **10** obras y «Teatro barroco» en **9** (le falta *El alcalde de Zalamea*). Ningún filtro consulta este campo, y ningún formulario lo escribe.
   - Ninguna obra tiene `year >= 1950`. *Teresa's Ecstasy* tiene `year` nulo. Las 10 del Siglo de Oro tienen un año entre 1610 y 1655.
   - `works` ya tiene los índices `works_genre_normalizado_trgm_idx` y `works_publicadas_titulo_id_idx` de SCENAIA-006.

### 3. Qué se revisa

**3.1 «Teatro clásico» encuentra 1 de las 10 obras del Siglo de Oro.** El intérprete traduce «clásico» a `genre: 'clasico'`, y ese texto solo figura en el género de *La vida es sueño*. Las otras nueve llevan la época en `secondary_genres`. Es un problema de modelo, no de acentos: SCENAIA-006 no lo resuelve.

**3.2 La época y el género compiten por la misma ranura.** `CLASICO` y `COMEDIA` ocupan los dos la ranura `genero`, y gana la última mención.
- «comedias clásicas» produce `{genre:'clasico'}`: **descarta la comedia** y devuelve *La vida es sueño*, que es un drama.
- «dramas clásicos» se comporta igual.

**3.3 Los términos de época no se reconocen, y alguno se confunde con un autor.**
- «obras del siglo de oro» y «obras del siglo xx» no producen ningún criterio. Además, `hasUnresolvedAuthor` las marca como **autor no resuelto** («siglo»).
- «teatro barroco», «isabelino», «griego» o «medieval» devuelven el listado completo sin ningún aviso.

**3.4 «Teatro contemporáneo» devuelve 0 obras.** Se traduce a `yearFrom: 1950`, y la única obra contemporánea tiene `year` nulo.
- Esta Acta resuelve «contemporáneo» con un OR (§4.4).
- **Con el catálogo actual el resultado seguirá siendo 0**: por decisión de Dirección, *Teresa's Ecstasy* no recibe época por inferencia (§4.7). Se dejará constancia en la prueba posterior al despliegue (§7.4).

### 4. Qué cambia exactamente

**4.1 Migración — columna, restricción, índice y relleno.**
  - **Columna:** `works.epocas text[] not null default '{}'::text[]`.
  - **Restricción `works_epocas_check`:**
    ```sql
    check (epocas <@ array['grecolatino','medieval','renacimiento','siglo_de_oro','barroco',
                           'isabelino','neoclasico','romanticismo','realismo_naturalismo',
                           'vanguardias','posguerra','contemporaneo']::text[])
    ```
  - **Índice `works_epocas_gin_idx`:** GIN sobre `epocas`, con la clase de operadores por defecto para arrays (`array_ops`), que sirve al operador de solapamiento `&&`.
    - Las claves son ASCII y cerradas: **no hace falta** `f_unaccent` ni una columna generada como la de SCENAIA-006.
  - **Relleno:** las 10 obras del Siglo de Oro reciben `{'siglo_de_oro','barroco'}`.
    - Se identifican **por su identificador**, fijado en el PR tras una consulta de solo lectura. No se identifican por texto en tiempo de migración.
    - La migración **comprueba que actualiza exactamente 10 filas** y aborta en caso contrario.
    - Incluye añadir `barroco` a *El alcalde de Zalamea* (§4.7).
    - *Teresa's Ecstasy* queda en `'{}'`.
  - **Migración inversa** redactada y probada en el mismo PR, en `supabase/reversiones/`: se borran el índice, la restricción y la columna.

**4.2 Interruptor.** `SCENAIA_EPOCA_ENABLED`, apagado por defecto y leído en cada llamada.
- **Lista cerrada** de valores que lo encienden: `'1'` y `'true'`, igual que `SCENAIA_PAGINACION_ENABLED` y `SCENAIA_GENERO_SQL_ENABLED`.
- **Dónde se lee:** en `semantic-retriever` y en la ruta HTTP, nunca dentro del intérprete, que sigue siendo puro. Se le pasa como opción.
- **Apagado, el comportamiento es idéntico al actual:**
  - `CLASICO` sigue en la ranura `genero` y produce `genre: 'clasico'`;
  - `CONTEMPORANEO` sigue produciendo `yearFrom: 1950`;
  - no se reconoce ningún término nuevo;
  - el Intent Resolver decide igual que hoy si consulta al proveedor;
  - ningún criterio lleva `epocas`.

**4.3 Repository Layer — `WorkSearchCriteria` y `applyCriteria`, y solo eso.**
  - **Campos nuevos en `WorkSearchCriteria`:**
    - `epocas?: readonly string[]`;
    - `epocaYearFrom?: number`, que solo tiene sentido junto a `epocas` y expresa el OR de «contemporáneo».
  - **Traducción en `applyCriteria`:**
    - solo `epocas` → `.overlaps('epocas', criteria.epocas)` (SQL `&&`: la obra pertenece a **alguna** de las épocas pedidas);
    - `epocas` y `epocaYearFrom` → `.or('epocas.ov.{…},year.gte.N')`;
    - lista vacía → no se filtra.
  - **Se aplica igual en el modo página y en el modo sin página.** No hay excepción en memoria, así que el recuento es exacto a cualquier escala.
  - **La clave de caché** ya incluye el criterio serializado y distingue sola los dos caminos.

**No cambian:**
  - `Work` ni `WORK_COLUMNS`: la columna no se expone fuera de Repository Layer;
  - la firma de `listPublishedWorks`;
  - el tratamiento del género, en ninguno de sus caminos;
  - cualquier otra función de Repository Layer.

**4.4 Intérprete — `interpret-work-query.ts`, con el interruptor encendido.**
  - **`CLASICO` pasa de la ranura `genero` a la ranura `epoca`,** y se expande a `grecolatino`, `renacimiento`, `siglo_de_oro`, `barroco`, `isabelino` y `neoclasico` (§4.7).
    - «comedias clásicas» produce `{genre:'comedia', epocas:[…]}`.
  - **`CONTEMPORANEO`** produce `{epocas:['contemporaneo'], epocaYearFrom:1950}` (§4.7).
  - **Conceptos nuevos,** uno por clave de la lista cerrada. Todos van a la ranura `epoca` y cada uno se expande a su propia clave.
  - **Sinónimos propuestos** (normalizados, sin acentos). Dirección puede modificarlos antes de firmar:

    | Concepto | Sinónimos |
    |---|---|
    | GRECOLATINO | grecolatino, grecolatina, grecolatinos, grecolatinas, griego, griega, griegos, griegas |
    | MEDIEVAL | medieval, medievales |
    | RENACIMIENTO | renacimiento, renacentista, renacentistas |
    | SIGLO_DE_ORO | siglo de oro, siglos de oro, aureo |
    | BARROCO | barroco, barroca, barrocos, barrocas |
    | ISABELINO | isabelino, isabelina, isabelinos, isabelinas |
    | NEOCLASICO | neoclasico, neoclasica, neoclasicos, neoclasicas |
    | ROMANTICISMO | romanticismo |
    | REALISMO_NATURALISMO | realismo, naturalismo, naturalista, naturalistas |
    | VANGUARDIAS | vanguardia, vanguardias, vanguardista, vanguardistas |
    | POSGUERRA | posguerra, postguerra |

  - **Excluidos a propósito:**
    - «romántico/a», porque «comedia romántica» no se refiere al Romanticismo;
    - «realista», porque describe un estilo;
    - «romano», porque confundiría el teatro romano de Mérida.
  - **Autoría:** `siglo` y `siglos` se añaden a `NON_AUTHOR_COMPLEMENTS` (solo con el interruptor encendido), para que «obras del siglo de oro» deje de marcar un autor no resuelto.
  - **Comentario de las líneas 328-332:** se reescribe para dejar constancia de que, con el interruptor encendido, la ambigüedad se resuelve hacia época por esta Acta, y de que apagado rige la resolución anterior.
  - **Intent Resolver (`vocabulary.ts`):** los términos nuevos se incorporan a `CONCEPT_TERMS` y a `ALREADY_UNDERSTOOD` **solo con el interruptor encendido**. Su test de sincronía término a término sigue siendo obligatorio.
  - **Estado de la conversación (`validate.ts`):** además de comprobar que la ranura y el concepto existen, se comprueba que el concepto pertenece a esa ranura **según el valor vigente del interruptor** (§6.4).
  - **Limitación aceptada:** la ranura admite un único concepto vigente. «barroco o renacentista» se queda con el último mencionado, igual que ocurre hoy con el género.

**4.5 Revisión de SCENAIA-002C, Punto 2.** No se añade ninguna excepción. `epocas` es un criterio SQL desde su origen, en cumplimiento del principio de ese Punto. La excepción del género sigue exactamente como la dejó el §4.5 del Acta SCENAIA-006.

**4.6 Revisión del §7.4 del Acta SCENAIA-006.** Se hace en la Adenda SCENAIA-006A.

**4.7 Decisiones ya tomadas por Dirección.**
  - **Lista cerrada de épocas:** grecolatino, medieval, renacimiento, siglo_de_oro, barroco, isabelino, neoclasico, romanticismo, realismo_naturalismo, vanguardias, posguerra, contemporaneo.
  - **«Teatro clásico» (CLASICO) se expande a:** grecolatino, renacimiento, siglo_de_oro, barroco, isabelino, neoclasico.
  - **Siglo_de_oro y barroco pueden coexistir en la misma obra.** En la migración de relleno se añade barroco a *El alcalde de Zalamea*, para quedar coherente con las otras 9 obras del lote que ya lo tienen.
  - **«Contemporáneo» se resuelve con OR:** la clave contemporaneo en epocas, o year >= 1950.
  - **El desplegable de género** con «Teatro clásico» y «Teatro contemporáneo» no se toca en este expediente; queda para el expediente de taxonomía de géneros.
  - **Ninguna obra recibe una época por inferencia automática al desplegar esta acta:** *Teresa's Ecstasy* queda en '{}' hasta que su titular la edite.

**4.8 Lo que NO cambia.**
  - `ResponseContext`;
  - Scenaia Knowledge Model, Decision Engine, Credit Manager y AI Gateway;
  - `works.genre`, `genre_normalizado`, `secondary_genres` y el desplegable de género;
  - la ficha de la obra, incluida «Otras obras de este género»;
  - los formularios de alta y edición, y las importaciones;
  - los perfiles de personas y organizaciones (`esp_clasico`, `tipo_clasico`);
  - con el interruptor apagado, todo el comportamiento de la aplicación.

### 5. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **Reutilizar `secondary_genres` con una convención** | Perpetúa el problema: época y género mezclados en texto libre, sin restricción. Los formularios no lo escriben, y un prefijo («época:…») se vería en las etiquetas de la ficha. |
| **Derivar la época del año (`year`)** | `year` es ambiguo: *El caballero de Olmedo* consta como 1641, que es la publicación, no la composición. No distingue el Siglo de Oro del teatro isabelino, que comparten años. Deja fuera las obras sin año. Solo sirve como ayuda editorial al rellenar, nunca como filtro, salvo en el OR de «contemporáneo» decidido por Dirección. |
| **Tablas `periodos` + `work_periodos` (N:M)** | Admite una jerarquía editable, pero añade dos tablas, RLS, filtros con `!inner` en PostgREST y cambios en formularios y caché. La jerarquía que hoy hace falta («clásico» como conjunto de épocas) se resuelve en el intérprete. Queda como evolución futura. |
| **Dejarlo como está** | «Teatro clásico» seguiría devolviendo 1 de 10; «comedias clásicas» seguiría perdiendo la comedia, y «siglo» seguiría tomándose por autor. |
| **Columna `text[]` con lista cerrada (propuesta)** | Admite varias épocas por obra; la restricción la garantiza la base; se resuelve en SQL sin excepción; es reversible sin desplegar código con el interruptor apagado. |

### 6. Riesgos y su acotación

1. **Datos mal formados en la carga masiva.** La restricción `works_epocas_check` es la salvaguarda:
   - cualquier clave fuera de la lista, una errata o una mayúscula hace **fallar la inserción**, en lugar de dejar una época que ningún filtro encontraría;
   - un lote sin columna `epocas` recibe `'{}'`, nunca un valor inventado;
   - ampliar la lista exige una migración nueva, y por tanto una decisión expresa;
   - la restricción no impide claves repetidas dentro de una misma obra, lo que no altera el resultado de `&&`.
2. **Operador de solapamiento e índice GIN.**
   - **Ensayo previo:** con el mismo protocolo que en SCENAIA-006, en el PostgreSQL 17.6 embebido, con réplica de `works` y un catálogo simulado de 50.000 obras:
     - `ANALYZE` tras crear la columna, porque sin él el planificador estima 1 fila y el uso del índice resulta engañoso;
     - comprobación **forzada** del índice sin la condición de publicadas y con `enable_seqscan` y `enable_indexscan` desactivados;
     - con catálogos pequeños o épocas muy frecuentes, que el planificador prefiera recorrer la tabla completa es correcto.
   - **El OR de «contemporáneo»** combina `epocas` y `year`, y no hay índice sobre `year`: esa consulta puede recorrer la tabla completa. Se acepta con el catálogo previsto. Si el ensayo muestra un coste inaceptable, un índice sobre `year` exige una adenda.
3. **Bloqueo al crear la columna.** Una columna con valor por defecto constante no reescribe la tabla en PostgreSQL 17; la restricción `CHECK` sí recorre las filas existentes. Con 11 obras es trivial.
4. **Estado de conversación heredado con `{genero:'CLASICO'}`.** Una conversación abierta antes de encender el interruptor puede traer esa ocupación; y al revés, `{epoca:'CLASICO'}` si el interruptor se apaga. **Se opta por invalidar el estado completo**, no por descartar solo la pareja:
   - **Coherencia con el contrato:** `parseConversationState` declara «validación total o descarte total … nunca se repara ni se acepta a medias — un criterio fantasma es peor que ningún criterio». Descartar solo la pareja introduciría la primera excepción a ese contrato.
   - **Resultado conocido:** el turno continúa como hoy sin estado. El usuario pierde la herencia de las demás ranuras una sola vez, solo en conversaciones abiertas al cambiar el interruptor, y lo que escriba en ese turno se interpreta con normalidad.
   - **Simetría:** la comprobación depende del valor vigente del interruptor, así que protege igual al encender y al apagar.
   - **Descartado reasignar** `{genero:'CLASICO'}` a `{epoca:'CLASICO'}`: el validador valida, no traduce.
5. **Coincidencias dentro de otra palabra.** Hoy los términos se detectan con `includes`, y «neoclasico» contiene «clasico»: activaría `CLASICO` y, por la regla de la última mención, además ganaría. **Con el interruptor encendido, los términos de época se detectan por palabra completa.** Se cubre con pruebas específicas (§7.2).
6. **Reversibilidad.**
   - Apagar el interruptor restituye el comportamiento actual sin tocar la base.
   - Las migraciones se revierten con la inversa del PR 1, **siempre con el interruptor apagado antes**, porque el código de Repository Layer referencia la columna cuando recibe `epocas`.
   - El relleno se pierde al revertir y se reconstruye volviendo a aplicar la migración.
7. **Escrituras sobre `works`.** Antes del PR 1 se verifica que ninguna escritura envía `epocas`, ni formularios, ni importaciones, ni actualizaciones construidas desde `select('*')`, o que, si la envía, es con valores válidos.
8. **Desbordar la reapertura.** Fuera de los §4.1 a §4.4, nada. El diff de cada PR se revisa contra esos puntos antes de fusionar.

### 7. Condiciones de la futura implementación

1. **PRs, en este orden:**
   0. Esta Acta y la Adenda SCENAIA-006A.
   1. **Migración** (§4.1): columna, restricción, índice y relleno, sin ningún cambio de código de la aplicación.
   2. **Repository Layer** (§4.3): `WorkSearchCriteria.epocas`, `epocaYearFrom` y `applyCriteria`. Sin cambio observable, porque nadie emite todavía el criterio.
   3. **Intérprete, Intent Resolver y validación del estado** (§4.2 y §4.4), detrás de `SCENAIA_EPOCA_ENABLED`, apagado por defecto.

   El PR de formularios (selector de época) **no queda autorizado por esta Acta**.

2. **Pruebas:**
   - **PR 1:**
     - test autodeshecho en `supabase/tests/`: la restricción rechaza claves fuera de la lista, mayúsculas y cadenas vacías; el valor por defecto es `'{}'`; la inversa funciona;
     - ensayo en el PostgreSQL embebido con 50.000 obras y el protocolo del §6.2, con `EXPLAIN` que muestre el uso del GIN con `&&`.
   - **PR 2:**
     - sin `epocas`, comportamiento idéntico, con las pruebas existentes sin modificar;
     - con `epocas`: solapamiento con una y con varias claves, lista vacía sin filtro ni error, OR con `epocaYearFrom` y año nulo excluido;
     - recuento exacto por encima de 1.000 coincidencias y recorrido completo en páginas de 10 sin solapes ni huecos;
     - combinación con el género en los dos caminos (memoria y SQL) y en los dos modos (con página y sin página).
   - **PR 3:**
     - **con el interruptor apagado,** salida idéntica a la actual en toda la suite, incluidas las consultas del §3;
     - **con el interruptor encendido,** una tabla de consultas con su resultado esperado:
       - «obras de teatro clásico» → `{epocas:[6 claves]}`;
       - «comedias clásicas» → `{genre:'comedia', epocas:[6 claves]}`;
       - «obras del siglo de oro» → `{epocas:['siglo_de_oro']}`, sin autor no resuelto;
       - «teatro barroco» → `{epocas:['barroco']}`;
       - «neoclásico» → solo `NEOCLASICO`;
       - «comedia romántica» → sin época;
       - «teatro contemporáneo» → `{epocas:['contemporaneo'], epocaYearFrom:1950}`;
     - estado heredado `{genero:'CLASICO'}` con el interruptor encendido → `null`, y `{epoca:'CLASICO'}` con el interruptor apagado → `null`;
     - test de sincronía del vocabulario del Intent Resolver en los dos estados del interruptor.
   - Suite completa, `tsc`, lint y build en verde en cada PR.

3. **Tras el PR 1, comprobación de equivalencia en producción,** de solo lectura:
   - todas las filas cumplen la restricción;
   - `'siglo_de_oro' = any(epocas)` → **10 obras**, con **los mismos identificadores** que `'Teatro del Siglo de Oro' = any(secondary_genres)`;
   - `'barroco' = any(epocas)` → **10 obras**, las mismas;
   - *Teresa's Ecstasy* → `'{}'`;
   - las 11 filas conservan una huella idéntica en todas las demás columnas.

4. **Tras el PR 3, prueba del PR 5 de la Adenda 004B.**
   - **Montaje:** compilación local contra la base de producción, con `SCENAIA_PAGINACION_ENABLED` y `SCENAIA_EPOCA_ENABLED` encendidos, y `SCENAIA_GENERO_SQL_ENABLED` en el estado vigente en Production.
   - **Procedimiento:** cuenta de prueba dedicada, con recuentos y huellas antes y después y limpieza verificada.
   - **Resultados exigidos:**
     - «obras de teatro clásico» → **10** fichas y recuento 10;
     - «obras del Siglo de Oro» → **10**;
     - «comedias clásicas» → **5** (las 3 comedias de enredo, *La dama boba* y *El caballero de Olmedo*);
     - «teatro contemporáneo» → **0**, con aviso honesto de que no hay resultados (consecuencia del §4.7);
     - el listado sin época sigue igual;
     - ninguna fila nueva en `credit_reservations` ni en `ai_requests`.

5. **Diff de cada PR revisado contra este alcance** antes de fusionar.

6. **Encendido.** Dirección decide cuándo se enciende `SCENAIA_EPOCA_ENABLED` en Production, en el orden que fija la Adenda SCENAIA-006A. El PR 1 debe estar aplicado en Production antes.

7. **Aceptación funcional de Dirección** tras el despliegue.

### 8. Veredicto

**AUTORIZADA CON CONDICIONES.** Dirección autoriza los puntos del §4 de esta Acta, en los términos de las condiciones del §7 y de las recogidas en el §9. El PR de formularios (selector de época) no queda autorizado por esta Acta. Hasta que la implementación cumpla esas condiciones y se despliegue con el interruptor encendido, no cambia ningún comportamiento:
- «clásico» se sigue interpretando como género;
- «contemporáneo» como `year >= 1950`;
- la base de datos no tiene ni la columna `epocas` ni su índice.

---

### 9. Autorización

**Decisión:** ☐ Autorizada   ☒ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

Se autoriza el tratamiento de la época como dimensión propia según los términos del §4, con las decisiones del §4.7 tomadas por Dirección. El PR de formularios (selector de época) no queda autorizado por esta Acta. SCENAIA_EPOCA_ENABLED se enciende según el orden que fija la Adenda SCENAIA-006A.

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta o Adenda que la revise expresamente. Ningún alcance de este documento se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** Héctor Renee Díaz Bausson — Founder & CEO, obrasdeteatro.com   **Fecha:** 2026-09-29
