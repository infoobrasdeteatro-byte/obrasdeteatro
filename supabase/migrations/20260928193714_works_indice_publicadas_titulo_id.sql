-- SCENAIA-006, migracion 2: indice para el orden estable del listado.
--
-- POR QUE. El listado de obras en modo pagina ordena por title y, en empate,
-- por id, y filtra obras publicadas y no borradas. Sin indice, cada pagina
-- ordena todo el catalogo y cada desplazamiento profundo recorre todas las
-- filas anteriores. Con este indice parcial el orden se lee ya hecho.
--
-- SIN CONCURRENTLY. CREATE INDEX CONCURRENTLY no puede ejecutarse dentro de
-- una transaccion, y las migraciones se aplican dentro de una. Con el
-- catalogo actual (11 obras) el bloqueo de escritura dura milisegundos. En
-- un catalogo grande, un indice nuevo de este tipo deberia crearse con
-- CONCURRENTLY fuera de una migracion.
--
-- Hereda la colacion de la base (en_US.UTF-8), la misma del ORDER BY.
--
-- Acta: docs/gobernanza/acta-autorizacion-scenaia-006-genero-sin-acentos.md
-- Reversion: drop index if exists public.works_publicadas_titulo_id_idx;

create index if not exists works_publicadas_titulo_id_idx
  on public.works (title, id)
  where is_published and deleted_at is null;

comment on index public.works_publicadas_titulo_id_idx is
  'Orden estable (title, id) del listado de obras publicadas y no borradas (SCENAIA-006).';
