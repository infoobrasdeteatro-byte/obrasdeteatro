# ADENDA AL ACTA DE AUTORIZACIÓN — Listado puro sin IA: género y exportación de tipos

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente propuesto:** SCENAIA-004A (adenda a SCENAIA-004)
**Fecha:** ____________
**Estado resultante:** PENDIENTE DE AUTORIZACIÓN — LA IMPLEMENTACIÓN NO ESTÁ AUTORIZADA

**Verificación documental previa a la asignación del expediente (2026-09-28):** `SCENAIA-004A` no existía en documentación, código, migraciones, material archivado bajo `_incidente-trazabilidad-2026-07-19/`, mensajes de commit de ninguna rama, objetos versionados de ninguna rama, el stash ni las referencias de respaldo (`refs/backup`), ni el respaldo permanente de `Documentos\respaldos\obrasdeteatro-2026-09-19`. Tampoco existía ninguna adenda previa en el proyecto.

---

### 1. Objeto de la Adenda

Ampliar, en dos puntos concretos, la reapertura acotada de Repository Layer que el §4.4 del Acta SCENAIA-004 limitó a «orden estable y desplazamiento en `listPublishedWorks`, y nada más»:

  a) que la página de obras con **filtro por género** tenga un recuento y unas páginas correctos más allá de 200 candidatos;
  b) que los tipos `PublishedWorksPage` y `PublishedWorksPageOptions` se **exporten desde `lib/repository-layer/index.ts`**, para que la Parte 3 los consuma por la vía pública del componente.

Nada más. El resto del Acta SCENAIA-004 sigue vigente sin cambios.

### 2. Base documental

1. `docs/gobernanza/acta-autorizacion-scenaia-004-listado-puro.md` — §4.4 (alcance de la reapertura), §6.3 (riesgo de desbordarla) y §7, condición 8 (catálogo simulado de varios cientos de obras).
2. `lib/repository-layer/works.ts` — excepción documentada de SCENAIA-002C (Punto 2): el género se compara en memoria (`stripDiacritics`, `matchesGenre`) sobre un máximo de `GENRE_FILTER_CANDIDATE_LIMIT = 200` candidatos.
3. `lib/knowledge-assets/interpret-work-query.ts:339-341` — el criterio `genre` solo toma tres valores: `comedia`, `musical`, `clasico`.
4. PR #26, fusionado en `main` como `36f0c13` (Parte 2 de SCENAIA-004).
5. Análisis de solo lectura entregado a Dirección el 2026-09-28, con datos reales de producción: tipo y valores de `works.genre` y comparación entre `matchesGenre`, `ILIKE` y filtrado sin acentos.

### 3. Qué se revisa

**3.1 Género.** En modo página, con filtro por género, el recuento y el desplazamiento se calculan después de filtrar en memoria sobre los 200 primeros candidatos en orden estable. Si más de 200 obras publicadas cumplen el resto del criterio, las que quedan fuera no se evalúan: el recuento se queda corto y las últimas páginas no existen, **sin ningún aviso**. Es exactamente el síntoma que motivó SCENAIA-004 —contenido incompleto entregado sin aviso—, trasladado del corte de tokens al corte de candidatos. Con el catálogo previsto (varios cientos de obras en tres meses, §4.4), ocurrirá.

**Hechos verificados (2026-09-28):** `works.genre` es texto libre (`text`, sin restricción ni índice); la extensión `unaccent` está disponible pero no instalada. Con las 11 obras actuales, un `ILIKE` directo **pierde «Teatro clásico»** con el término `clasico`; un filtro sin acentos coincide con `matchesGenre` en los tres términos posibles, incluida la inclusión de «Tragicomedia» en `comedia`.

**3.2 Exportación de tipos.** La Parte 2 definió `PublishedWorksPage` y `PublishedWorksPageOptions` en `works.ts` sin reexportarlos, porque `index.ts` quedaba fuera del §4.4. La Parte 3 necesita nombrarlos.

### 4. Qué cambia exactamente

**4.1 Candidatos con género en modo página — `lib/repository-layer/works.ts`, solo en la rama paginada de `listPublishedWorks`.** El número máximo de candidatos pasa de 200 a **1.000** (constante propia del modo página). Si la consulta devuelve exactamente ese máximo, el recuento se declara **no determinado** (`total: null`) en lugar de darse como exacto; las obras de la página se siguen devolviendo en orden estable. La comparación sigue siendo `matchesGenre`, sin ningún cambio de semántica.

**4.2 Exportación — `lib/repository-layer/index.ts`.** Una única línea: `export type { PublishedWorksPage, PublishedWorksPageOptions } from './works'`.

**4.3 Lo que NO cambia.**
  - La llamada sin página (`listPublishedWorks(criteria, limit)`): sigue con 200 candidatos, sin `ORDER BY`, con el mismo resultado y la misma clave de caché.
  - `matchesGenre`, `stripDiacritics` y la excepción de SCENAIA-002C.
  - La base de datos: ni extensión, ni migración, ni columna nueva.
  - Cualquier otra función, consulta, filtro o firma de Repository Layer.
  - Los valores de género que produce el intérprete.

### 5. Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| **Dejarlo como está (200)** | Recuento y páginas incompletos, sin aviso, en cuanto el catálogo supere los 200 candidatos: reproduce el defecto que motivó SCENAIA-004. |
| **`ILIKE` directo en la base** | Verificado: pierde «Teatro clásico» con `clasico`. Rompe un caso que hoy funciona. |
| **Filtrar en la base sin acentos** (columna normalizada o función inmutable sobre `unaccent`, con índice) | Es la solución definitiva: exacta a cualquier escala y retira la excepción de SCENAIA-002C. Pero toca la plataforma (extensión, migración, relleno de datos, trigger o columna generada) y reabre una decisión de SCENAIA-002C: excede una adenda y debe tramitarse en su propio expediente cuando el catálogo se acerque al límite del §4.1. |
| **Dos consultas** (géneros de todas las obras y después la página por ids) | Añade una consulta nueva, expresamente excluida por el §6.3 del Acta SCENAIA-004. |
| **Ampliar candidatos en modo página, con aviso de desbordamiento (propuesta)** | Correcta hasta 1.000 candidatos y honesta por encima: declara el recuento no determinado en vez de dar uno falso. No toca la base ni la semántica del filtro, y deja intacto el modo sin página. |

### 6. Riesgos y su acotación

1. **Volumen transferido.** Unos 690 bytes por obra con las columnas actuales: hasta ~690 KB por página con género cuando no hay caché; la caché es por página, así que cada página vuelve a traer los candidatos. Acotado a las peticiones con género en modo página y a 60 s de caché por clave.
2. **Tope de la API.** 1.000 coincide con el máximo de filas por defecto de la API de Supabase; pedir más no serviría sin cambiar esa configuración. Por encima, el recuento se declara no determinado (§4.1), nunca se inventa.
3. **Desbordar la reapertura.** Como en el §6.3 del Acta SCENAIA-004: fuera de §4.1 y §4.2, nada. Se comprueba revisando el diff de Repository Layer contra esos dos puntos antes de fusionar.

### 7. Condiciones de la futura implementación

1. Contenida en §4.1 y §4.2. El diff de Repository Layer se revisa contra esos dos puntos exclusivamente.
2. La llamada sin página se comporta exactamente como hoy; las pruebas existentes siguen en verde sin modificarse.
3. Pruebas obligatorias sobre un **catálogo simulado con más de 200 obras del mismo género**: recuento exacto y recorrido completo sin solapes ni huecos. Además: recuento `null` al alcanzar el máximo de candidatos, y los tres términos del intérprete (`comedia`, `musical`, `clasico`) con acentos en la base.
4. Suite completa, `tsc`, lint y build en verde.
5. Aceptación funcional de Dirección tras el despliegue.

### 8. Veredicto

**PENDIENTE.** Sin firma, la página con género sigue calculándose sobre 200 candidatos y los tipos siguen sin exportarse desde `index.ts`.

---

### 9. Autorización

**Decisión:** ☐ Autorizada   ☐ Autorizada con condiciones   ☐ Denegada   ☐ Aplazada

**Condiciones o exclusiones:**

_______________________________________________________________

Esta autorización no es irrevocable. Puede modificarse, ampliarse o sustituirse en el futuro mediante una nueva Acta o Adenda que la revise expresamente, con el mismo procedimiento que esta Adenda ha seguido para ampliar el §4.4 del Acta SCENAIA-004. Ningún alcance de este documento (máximo de candidatos, forma de declarar el recuento no determinado, etc.) se considera fijo si la evolución de la plataforma lo justifica.

**Firma:** ____________________________   **Fecha:** ____________
