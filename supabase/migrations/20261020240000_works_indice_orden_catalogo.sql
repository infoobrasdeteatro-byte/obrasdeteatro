-- SCENAIA-010: indice para el orden del catalogo de /obras, que desde este
-- expediente usa tambien el listado de obras de ScenaIA.
--
-- POR QUE. Los dos listados ordenan por author_death_year (nulos al final),
-- title e id sobre las obras publicadas y no borradas. Sin indice, cada
-- pagina ordena las 5.840 obras (~13 ms medidos en produccion); con este
-- indice parcial el orden se lee ya hecho (<1 ms), como el de title e id.
--
-- SIN CONCURRENTLY: misma razon que 20260928193714. Con 5.840 obras el
-- bloqueo de escritura dura una fraccion de segundo.
--
-- Acta: docs/gobernanza/acta-autorizacion-scenaia-010-orden-y-miles-listado-obras.md
-- Reversion: drop index if exists public.works_publicadas_orden_catalogo_idx;

create index if not exists works_publicadas_orden_catalogo_idx
  on public.works (author_death_year asc nulls last, title, id)
  where is_published and deleted_at is null;

comment on index public.works_publicadas_orden_catalogo_idx is
  'Orden (author_death_year nulls last, title, id) del catalogo de /obras y del listado de ScenaIA (SCENAIA-010).';
