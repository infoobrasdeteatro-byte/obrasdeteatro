-- Buscador de la biblioteca (/obras): título, autor y género en minúsculas y
-- sin tildes, para que «calderon» encuentre «Calderón». Columna generada con
-- el mismo envoltorio f_unaccent que genre_normalizado, e índice de
-- trigramas para resolver ILIKE '%…%' por índice con miles de obras.
alter table public.works
  add column if not exists busqueda_normalizada text
  generated always as (
    lower(public.f_unaccent(coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(genre, '')))
  ) stored;

comment on column public.works.busqueda_normalizada is
  'Título, autor y género en minúsculas y sin tildes, generado. Solo lectura. Para el buscador de /obras.';

create index if not exists works_busqueda_normalizada_trgm_idx
  on public.works using gin (busqueda_normalizada public.gin_trgm_ops);
