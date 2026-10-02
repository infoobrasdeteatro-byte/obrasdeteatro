-- Noticias (1/5): vocabulario de categorías.
--
-- Mismo modelo que casting_categorias: id de texto estable, etiqueta visible,
-- orden de presentación y un interruptor `activo` para retirar una categoría
-- sin borrarla (las noticias ya clasificadas la siguen referenciando).
-- Ampliable por moderación sin migraciones.
--
-- Lectura pública solo de las activas: el panel y la sección pública pintan
-- las categorías disponibles. Moderación las gestiona todas.

create table public.noticias_categorias (
  id text primary key,
  etiqueta text not null,
  orden integer not null default 0,
  activo boolean not null default true,
  constraint noticias_categorias_id_formato check (id ~ '^[a-z][a-z0-9_]*$')
);

comment on table public.noticias_categorias is
  'Vocabulario de categorías de noticias. Ampliable por moderación sin migraciones; el panel y la sección pública lo leen de aquí.';

alter table public.noticias_categorias enable row level security;

create policy "Categorías de noticias activas visibles" on public.noticias_categorias
  for select
  using (activo = true);

create policy "Moderación gestiona categorías de noticias" on public.noticias_categorias
  for all
  using (public.es_moderador())
  with check (public.es_moderador());

-- Los visitantes sin sesión solo leen; TRUNCATE no pasa por RLS.
revoke insert, update, delete, truncate on public.noticias_categorias from anon;
revoke truncate on public.noticias_categorias from authenticated;

insert into public.noticias_categorias (id, etiqueta, orden) values
  ('estreno',      'Estreno',      1),
  ('festival',     'Festival',     2),
  ('temporada',    'Temporada',    3),
  ('premio',       'Premio',       4),
  ('convocatoria', 'Convocatoria', 5),
  ('compania',     'Compañía',     6),
  ('teatro',       'Teatro',       7),
  ('formacion',    'Formación',    8),
  ('actualidad',   'Actualidad',   9);
