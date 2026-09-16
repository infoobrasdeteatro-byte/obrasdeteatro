-- Organizaciones: tipos de entidad teatral y ubicación subnacional.
--
-- CAPTURA DE UN CAMBIO YA APLICADO. Esta migración está aplicada en el
-- proyecto remoto y consta en su historial con la versión 20260828204044,
-- pero nunca tuvo fichero en supabase/migrations/. Este archivo NO introduce
-- nada nuevo: existe para que el repo refleje el estado real y no haya deriva
-- entre supabase/migrations/ y producción.
--
-- ORIGEN DEL SQL. El texto que sigue es el contenido literal almacenado en
-- supabase_migrations.schema_migrations.statements para esa versión, extraído
-- en modo lectura el 2026-09-16. No se ha reescrito, reordenado ni completado:
-- es exactamente lo que se ejecutó contra la base de datos.
--
-- NO SE REAPLICARÁ. A diferencia de otras capturas de este directorio, esta
-- migración SÍ consta en el historial del proyecto remoto. El nombre del
-- fichero lleva el timestamp remoto exacto (20260828204044) precisamente para
-- que coincida con esa entrada: `supabase db push` la reconocerá como ya
-- aplicada y la omitirá. Si el fichero se renombrara con otro timestamp, se
-- intentaría ejecutar de nuevo.

-- Organizaciones: tipos de entidad teatral y ubicación subnacional.
-- Puramente aditivo y reversible: no elimina columnas, no renombra valores,
-- no modifica ninguna fila existente. No toca el Núcleo de ScenaIA, no toca
-- auth.users, no toca patrimonio compartido.

alter table public.institutions
  add column if not exists region text,
  add column if not exists ciudad text;

comment on column public.institutions.region is
  'Región/comunidad autónoma o equivalente. NULL = dato no disponible, nunca inferido.';
comment on column public.institutions.ciudad is
  'Ciudad/localidad. NULL = dato no disponible, nunca inferida a partir de la región o del país.';

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

create index if not exists idx_institutions_region
  on public.institutions (region)
  where region is not null;

create index if not exists idx_institutions_ciudad
  on public.institutions (ciudad)
  where ciudad is not null;

create index if not exists idx_institutions_type_ciudad
  on public.institutions (type, ciudad)
  where ciudad is not null;
