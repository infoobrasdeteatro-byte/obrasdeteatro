-- Organizaciones: tipos de entidad teatral y ubicación subnacional.
-- Puramente aditivo y reversible: no elimina columnas, no renombra valores,
-- no modifica ninguna fila existente. No toca el Núcleo de ScenaIA, no toca
-- auth.users, no toca patrimonio compartido.
--
-- Motivación: el dominio Organizaciones ya interpreta criterios (ADR
-- SCENAIA-002C.1) pero el modelo solo podía representar `type` y
-- `country_code`. Faltaba (a) poder decir que una institución es una
-- compañía o un teatro y (b) poder situarla por debajo del país.

-- 1. Ubicación subnacional. Se replica exactamente la convención ya vigente
--    en public.profiles (country_code + region + ciudad), en vez de
--    introducir un modelo geográfico nuevo. Ambas columnas son NULL:
--    una organización sin ubicación conocida permanece sin ubicación, nunca
--    se rellena con un valor supuesto.
alter table public.institutions
  add column if not exists region text,
  add column if not exists ciudad text;

comment on column public.institutions.region is
  'Región/comunidad autónoma o equivalente. NULL = dato no disponible, nunca inferido.';
comment on column public.institutions.ciudad is
  'Ciudad/localidad. NULL = dato no disponible, nunca inferida a partir de la región o del país.';

-- 2. Tipos de entidad. Ampliación COMPATIBLE del CHECK: los siete valores
--    anteriores se conservan literalmente y se añaden 'company' y 'theater',
--    que el modelo no podía representar. Toda fila existente sigue
--    satisfaciendo la restricción; no se reasigna ningún valor.
alter table public.institutions
  drop constraint if exists institutions_type_check;

alter table public.institutions
  add constraint institutions_type_check check (
    type = any (array[
      'platform',
      'editorial',
      'university',
      'cultural_org',
      'foundation',
      'festival',
      'other',
      'company',
      'theater'
    ])
  );

-- 3. Índices de consulta, con la misma forma que los ya existentes sobre
--    profiles (idx_profiles_country_code, idx_profiles_region).
create index if not exists idx_institutions_region
  on public.institutions (region)
  where region is not null;

create index if not exists idx_institutions_ciudad
  on public.institutions (ciudad)
  where ciudad is not null;

create index if not exists idx_institutions_type_ciudad
  on public.institutions (type, ciudad)
  where ciudad is not null;

-- 4. Enriquecimiento pendiente. Esta migración habilita la capacidad; NO
--    puebla ningún dato. Las filas ya existentes quedan con region y ciudad
--    a NULL y conservan su `type` original. Consulta de control para saber
--    qué registros necesitan enriquecimiento posterior:
--
--      select id, name, type, country_code
--      from public.institutions
--      where is_public and is_active and (ciudad is null or region is null);
--
--    Mientras una organización no tenga ubicación, jamás aparecerá como
--    coincidencia de una consulta geográfica: los filtros de Repository
--    Layer son `eq`/`ilike` sobre la columna, y NULL nunca casa.
