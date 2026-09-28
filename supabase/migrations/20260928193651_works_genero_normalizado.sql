-- SCENAIA-006, migracion 1: genero normalizado en la base de datos.
--
-- POR QUE. El texto de una peticion llega a Repository Layer sin acentos y en
-- minusculas ("clasico"), pero works.genre guarda "Teatro clásico". Un ILIKE
-- de PostgreSQL no ignora los acentos, asi que hoy el genero se compara en
-- memoria (excepcion de SCENAIA-002C, Punto 2) sobre como mucho 1.000
-- candidatos. Con mas de 1.000 obras publicadas, las posteriores nunca se
-- evaluan. Esta migracion deja preparado en la base el valor normalizado y su
-- indice; la aplicacion NO lo usa todavia (eso es el PR 2, detras de
-- SCENAIA_GENERO_SQL_ENABLED).
--
-- Acta: docs/gobernanza/acta-autorizacion-scenaia-006-genero-sin-acentos.md
-- Reversion: supabase/reversiones/ (mismo nombre, sufijo _inversa).

-- 1. unaccent, en el esquema extensions (convencion de Supabase).
create extension if not exists unaccent with schema extensions;

-- 2. Envoltorio inmutable.
--
-- extensions.unaccent(text) es STABLE, no IMMUTABLE: depende del diccionario
-- y de search_path, y por eso no puede usarse en una columna generada ni en
-- un indice. El envoltorio nombra el diccionario expresamente y fija
-- search_path vacio, asi que su resultado solo depende del texto de entrada
-- y del contenido del fichero unaccent.rules.
--
-- Si ese fichero cambiara (actualizacion de la extension o de PostgreSQL),
-- las filas ya guardadas no se recalcularian solas: habria que regenerar la
-- columna y reindexar. La prueba supabase/tests/works_genero_normalizado.sql
-- lo detecta.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

comment on function public.f_unaccent(text) is
  'Envoltorio IMMUTABLE de extensions.unaccent con el diccionario nombrado. Base de works.genre_normalizado (SCENAIA-006).';

-- 3. Columna generada. Se rellena sola para las obras existentes al crearse
-- (reescribe la tabla: trivial con el catalogo actual) y se mantiene sola en
-- cada alta o edicion. Ninguna escritura puede darle valor: PostgreSQL lo
-- rechaza. coalesce hace que una obra sin genero quede en '' y no en NULL.
alter table public.works
  add column if not exists genre_normalizado text
  generated always as (lower(public.f_unaccent(coalesce(genre, '')))) stored;

comment on column public.works.genre_normalizado is
  'Genero en minusculas y sin acentos, generado a partir de genre. Solo lectura. Para el filtro ILIKE por genero (SCENAIA-006).';

-- 4. Indice de trigramas: permite resolver ILIKE '%comedia%' (comodin a ambos
-- lados) por indice. pg_trgm ya esta instalada en el esquema public.
create index if not exists works_genre_normalizado_trgm_idx
  on public.works using gin (genre_normalizado public.gin_trgm_ops);

comment on index public.works_genre_normalizado_trgm_idx is
  'Trigramas para el filtro ILIKE de genero sin acentos (SCENAIA-006).';
