# ACTA DE AUTORIZACIÓN — Orden y cifra del listado de obras

**Proyecto:** ScenaIA – ObrasDeTeatro®
**Bloque:** IV – Evolución del motor conversacional
**Expediente:** SCENAIA-010
**Fecha:** 2026-10-20
**Autoriza:** Héctor Renee Díaz Bausson (fundador y CEO), en conversación del 2026-10-20
**Estado resultante:** AUTORIZADA — IMPLEMENTADA

`SCENAIA-010` no aparecía en la documentación, el código ni las migraciones del repositorio al asignarse.

---

### 1. Objeto

Ante la pregunta «¿cuántas obras tienes en la biblioteca?», ScenaIA respondía:

- «En obras he encontrado **5840** resultados:», mientras el pie de la misma respuesta decía «Mostrando 1-10 de **5.840**»;
- un listado ordenado por título, que con 5.840 obras empieza por los títulos con signos («¡¡Buena estampa!!», «¡Bonita está la Corte!»…), en lugar de por los clásicos con que abre el catálogo de `/obras`.

Esta Acta autoriza dos cambios:

1. **Cifra con punto de miles.** `recuento()` en `lib/direct-content-builder/build-direct-content.ts` usa `formatearMiles` (`lib/biblioteca/catalogo.ts`), la misma función del catálogo y de la portada. El singular («un resultado») no cambia.
2. **Mismo orden que el catálogo.** En modo página, `listPublishedWorks` (`lib/repository-layer/works.ts`) ordena por `author_death_year` ascendente con nulos al final, después por `title` y, en empate, por `id`. Sigue siendo un orden total y estable, así que la paginación («Ver más») no cambia.

### 2. Qué queda fuera

- La IA, el intérprete de peticiones y cualquier respuesta que no sea el listado directo de obras.
- El modo sin página de `listPublishedWorks` (no ordenaba y sigue igual).
- Los filtros (género, época, autor…) y sus recuentos.

### 3. Rendimiento

Medido en producción el 2026-10-20 (5.840 obras publicadas), página de 10 obras con desplazamiento 100:

| Orden | Sin índice | Con índice parcial |
|---|---|---|
| `title, id` (anterior) | — | 0,4 ms (`works_publicadas_titulo_id_idx`) |
| `author_death_year, title, id` (nuevo) | 13 ms | < 1 ms (`works_publicadas_orden_catalogo_idx`) |

La migración `20261020240000_works_indice_orden_catalogo.sql` crea el índice. El resultado de cada página sigue en la caché de Repository Layer, como antes.

### 4. Pruebas

- `pagina-listado.test.ts`: un total de 5.840 se escribe «5.840 resultados».
- `works-paginacion`, `works-genero-sql`, `works-epocas` y `paginacion-transporte`: la secuencia de llamadas pasa a `order:author_death_year`, `order:title`, `order:id`.

### 5. Reversión

Volver a ordenar solo por `title` e `id` y a escribir `${total}` en `recuento()`. El índice puede quedarse, porque también lo usa el catálogo de `/obras`, o eliminarse con `drop index if exists public.works_publicadas_orden_catalogo_idx;`.
