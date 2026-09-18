-- Convocatorias, 3 de 3: RLS, índices y cierre por plazo vencido.

-- 1. La política del autor, partida por comando.
--
--    "Convocatoria propia" era FOR ALL. Una política ALL autoriza también el
--    UPDATE, y RLS no distingue columnas: el autor podía escribir
--    is_published = true, o estado = 'publicado', y saltarse la revisión. El
--    guard del trigger (migración 2) ya lo corrige aunque la política no
--    cambiara -- reconduce a 'pendiente_revision' a quien no modera --, pero
--    conviene que la RLS y el trigger digan lo mismo en vez de que uno arregle
--    lo que el otro permite.
--
--    Van CUATRO políticas y no dos porque PostgreSQL 17 no admite varios
--    comandos en una sola cláusula FOR (`for select, update` es error de
--    sintaxis 42601), y porque WITH CHECK solo es válido en INSERT y UPDATE:
--    en SELECT y DELETE solo cabe USING.
--
--    La creación NO exige plan de pago, a diferencia de Castings: aquí el plan
--    Gratuito sí publica, con el techo de 3 al mes que impone el trigger.
drop policy if exists "Convocatoria propia" on public.calls;

drop policy if exists "Convocatoria propia - lectura" on public.calls;
create policy "Convocatoria propia - lectura" on public.calls
  for select
  using (auth.uid() = profile_id);

drop policy if exists "Convocatoria propia - edición" on public.calls;
create policy "Convocatoria propia - edición" on public.calls
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "Convocatoria propia - borrado" on public.calls;
create policy "Convocatoria propia - borrado" on public.calls
  for delete
  using (auth.uid() = profile_id);

drop policy if exists "Convocatoria propia - creación" on public.calls;
create policy "Convocatoria propia - creación" on public.calls
  for insert
  with check (auth.uid() = profile_id);

-- 2. Moderación.
--
--    Sin esto la cola no existe: un admin no vería las convocatorias ajenas en
--    'pendiente_revision', que son justamente las que tiene que revisar. Es el
--    mismo hueco que hubo que cerrar en Castings.
--
--    es_moderador() ya existe desde 20260911203312 y es SECURITY DEFINER a
--    propósito: leer profile_roles dentro de una política sin bypass
--    reintroduce la recursión que dejó public.profiles ilegible.
drop policy if exists "Moderación gestiona convocatorias" on public.calls;
create policy "Moderación gestiona convocatorias" on public.calls
  for all
  using (public.es_moderador())
  with check (public.es_moderador());

-- 3. Índices.
--
--    La tabla solo tenía el de su clave primaria. Los tres primeros sirven a
--    las consultas que el módulo va a hacer desde el primer día: las propias
--    del autor, la cola de moderación y el listado público.
create index if not exists idx_calls_profile_id
  on public.calls (profile_id);

create index if not exists idx_calls_estado
  on public.calls (estado);

create index if not exists idx_calls_deadline
  on public.calls (deadline);

-- El cuarto no es rendimiento, es CORRECCIÓN. El trigger calls_auto_slug
-- desambigua colisiones con un sufijo numérico, pero solo se dispara en INSERT
-- y solo cuando el slug llega nulo: un slug escrito a mano, o cambiado en un
-- UPDATE, podía duplicarse sin que nada lo impidiera. Y el slug es la clave
-- por la que se va a servir /convocatoria/[slug].
--
-- Parcial sobre deleted_at is null para respetar el mismo contrato que ya usa
-- la función al buscar colisiones: una convocatoria borrada no debe bloquear
-- la reutilización de su slug.
create unique index if not exists idx_calls_slug_unico
  on public.calls (slug)
  where slug is not null and deleted_at is null;

-- 4. Cierre por plazo vencido.
--
--    Mismo motivo que en Castings: que llegue la fecha límite no es un evento
--    de escritura, así que ningún trigger puede reaccionar. Hace falta algo que
--    mire el reloj por su cuenta.
--
--    Pasa a 'cerrado', no a 'cancelado': el plazo se agotó, que es distinto de
--    que alguien la retirara.
--
--    Una diferencia con castings que conviene notar: allí `fecha_cierre` era
--    de tipo date y hubo que comparar contra current_date para no cerrar una
--    convocatoria a las 00:00 de su último día. Aquí `deadline` es timestamptz
--    -- lleva la hora dentro --, así que `deadline < now()` es exacto y no
--    necesita ese ajuste.
create extension if not exists pg_cron;

create or replace function public.cerrar_convocatorias_vencidas()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  update public.calls
  set estado = 'cerrado'
  where estado = 'publicado'
    and deadline is not null
    and deadline < now();
end;
$$;

comment on function public.cerrar_convocatorias_vencidas() is
  'Cierra las convocatorias publicadas cuyo plazo ya paso. La invoca el job pg_cron cerrar-convocatorias-vencidas; no la llama la aplicacion. Ignora las que no declaran deadline.';

-- Se desprograma primero cualquier job homónimo para que reaplicar la
-- migración no deje dos. Por jobid via SELECT y no con unschedule('nombre'),
-- que lanza excepción si el job no existe y haría fallar la primera aplicación.
do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'cerrar-convocatorias-vencidas';
end;
$$;

select cron.schedule(
  'cerrar-convocatorias-vencidas',
  '*/15 * * * *',
  $job$select public.cerrar_convocatorias_vencidas();$job$
);
