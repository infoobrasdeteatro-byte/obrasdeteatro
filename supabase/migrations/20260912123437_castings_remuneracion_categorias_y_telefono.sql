-- Castings: matices de remuneracion, categorias editables y telefono de contacto.
--
-- Tres correcciones al modelo tras probar la Fase 2, todas del mismo tipo: el
-- esquema afirmaba menos cosas de las que el sector distingue.
--
--   1. `remunerado` era un booleano. Pero entre "pagan" y "no pagan" caben
--      los proyectos que cubren gastos, las cooperativas a beneficios y los
--      trabajos academicos. Un booleano obligaba a mentir en tres casos
--      reales.
--   2. Las categorias eran cuatro columnas booleanas fijas. Anadir doblaje o
--      circo exigia una migracion cada vez, de modo que el vocabulario del
--      producto quedaba preso del ritmo de despliegue.
--   3. El unico contacto posible era email o URL. En este sector mucha gente
--      convoca por telefono o WhatsApp.

-- 1. Tipo de remuneracion.
alter table public.castings
  add column if not exists tipo_remuneracion text
  check (tipo_remuneracion in (
    'remunerado',
    'no_remunerado_gastos_cubiertos',
    'cooperativa',
    'no_remunerado_academico'
  ));

comment on column public.castings.tipo_remuneracion is
  'Condicion economica declarada. Vocabulario cerrado: lo que no se declara no se supone.';

-- Backfill. `remunerado = true` se traduce sin ambiguedad. `remunerado = false`
-- NO se traduce: las tres opciones no remuneradas afirman cada una algo extra
-- (que se cubren gastos, que hay reparto a beneficios, que es formacion) y
-- ninguna se deduce de un booleano en falso. Si un entorno futuro llega aqui
-- con filas en false, el SET NOT NULL de mas abajo fallara, y eso es lo
-- correcto: mejor que la migracion se detenga a que invente por su cuenta la
-- condicion economica de una convocatoria que la gente va a leer.
update public.castings
set tipo_remuneracion = 'remunerado'
where remunerado is true
  and tipo_remuneracion is null;

alter table public.castings drop column if exists remunerado;

alter table public.castings alter column tipo_remuneracion set not null;

-- 2. Categorias de proyecto, en tabla propia.
--
--    Mismo patron que moderacion_reglas: el vocabulario vive en datos, no en
--    el codigo, para que ampliarlo sea un INSERT y no un despliegue.
create table if not exists public.casting_categorias (
  id text primary key,
  etiqueta text not null,
  orden integer not null default 0,
  activo boolean not null default true
);

comment on table public.casting_categorias is
  'Vocabulario de categorias de casting. Ampliable por moderacion sin migraciones; el formulario lo lee de aqui.';

alter table public.casting_categorias enable row level security;

-- Lectura abierta: el formulario de cualquier organizador necesita pintar las
-- casillas, y un catalogo de categorias no es informacion reservada.
drop policy if exists "Categorías visibles para todos" on public.casting_categorias;
create policy "Categorías visibles para todos" on public.casting_categorias
  for select
  using (true);

-- Escritura solo para moderacion. Van TRES politicas y no una: PostgreSQL 17
-- no admite varios comandos en una sola clausula FOR (`for insert, update,
-- delete` es error de sintaxis 42601), y ademas WITH CHECK no es valido en
-- DELETE ni USING en INSERT.
drop policy if exists "Moderación crea categorías" on public.casting_categorias;
create policy "Moderación crea categorías" on public.casting_categorias
  for insert
  with check (public.es_moderador());

drop policy if exists "Moderación edita categorías" on public.casting_categorias;
create policy "Moderación edita categorías" on public.casting_categorias
  for update
  using (public.es_moderador())
  with check (public.es_moderador());

drop policy if exists "Moderación borra categorías" on public.casting_categorias;
create policy "Moderación borra categorías" on public.casting_categorias
  for delete
  using (public.es_moderador());

insert into public.casting_categorias (id, etiqueta, orden) values
  ('teatro',      'Teatro',                1),
  ('musical',     'Musical',               2),
  ('audiovisual', 'Audiovisual (cine/TV)', 3),
  ('danza',       'Danza',                 4),
  ('doblaje',     'Doblaje / Voz',         5),
  ('publicidad',  'Publicidad',            6),
  ('opera',       'Ópera',                 7),
  ('circo',       'Circo / Performance',   8),
  ('modelaje',    'Modelaje',              9),
  ('otro',        'Otro',                 10)
on conflict (id) do nothing;

alter table public.castings
  add column if not exists categorias text[] not null default '{}';

comment on column public.castings.categorias is
  'Categorias del proyecto, por id de casting_categorias. Array vacio = ninguna declarada.';

-- Backfill de las cuatro booleanas. Aqui si hay traduccion exacta: cada
-- booleano en true era exactamente una categoria marcada.
update public.castings
set categorias = (
  select coalesce(array_agg(cat order by cat), '{}')
  from (
    select 'teatro' as cat where tipo_teatro
    union all select 'musical' where tipo_musical
    union all select 'audiovisual' where tipo_audiovisual
    union all select 'danza' where tipo_danza
  ) as marcadas
)
where categorias = '{}';

alter table public.castings drop column if exists tipo_teatro;
alter table public.castings drop column if exists tipo_musical;
alter table public.castings drop column if exists tipo_audiovisual;
alter table public.castings drop column if exists tipo_danza;

-- `tipo_otro` se conserva tal cual: es texto libre, no una categoria del
-- vocabulario, y el formulario solo lo pide cuando se marca la categoria 'otro'.

-- 3. Telefono de contacto.
alter table public.castings
  add column if not exists telefono_contacto text;

comment on column public.castings.telefono_contacto is
  'Telefono o WhatsApp de contacto. Tercera via junto a email_recepcion y url_externa; al menos una de las tres debe existir para que alguien pueda presentarse.';
