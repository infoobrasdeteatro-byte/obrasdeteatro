-- Embajadores de Escena: tres meses para los colegas y escalera del embajador.
--
-- A. Colegas que entran por el enlace de un embajador (canjear_referido, que
--    se ejecuta solo al confirmar el correo del registro, sin botón):
--    · 3 meses de cortesía (antes, 1 mes): Premium si es persona, Empresas si
--      es organización (compañía, productora, sala, festival, escuela o
--      institución). ScenaIA, como fija la tabla oficial para cada plan: el
--      acceso sale de profiles.plan y nada de aquí toca el circuito económico.
--    · subir_plan nunca baja a quien ya tenga un plan superior; al terminar,
--      expirar_cortesias lo devuelve a su plan (plan_tras_cortesia).
--    · Solo registros nuevos: las cortesías ya concedidas no se tocan.
--    · Atribución propia (embajadores_referidos, una por cuenta): el colega
--      sigue contando para su embajador aunque luego cambie su membresía.
--
-- B. Escalera del propio embajador, con el mismo motor que el Elenco Fundador:
--    · Colega activo y puntos con las MISMAS reglas que elenco_colegas
--      (función colega_estado, calculada siempre en SQL, sin contadores).
--    · 5 puntos: +6 meses a su membresía. 10: +12 meses. 25: Embajador/a de
--      Honor, Destacado para siempre (subir_plan: si paga uno superior, lo
--      conserva). El tiempo se suma al que le quede, nunca lo recorta.
--    · Cada escalón una sola vez (clave única en embajadores_recompensas).
--    · Revisión diaria (pg_cron, 03:30 UTC, antes de expirar_cortesias a las
--      03:40) y comprobación inmediata cuando un colega pasa a activo.
--    · El correo al subir de escalón lo envía /api/cron/embajadores.
--
-- El Elenco Fundador no cambia: solo se LEE su función elenco_es_organizacion
-- (inmutable). Ninguna tabla, vista, función ni trigger del Elenco se toca.
--
-- 1. membresias_cortesia: plan 'empresas' y marca de Honor.
-- 2. embajadores_referidos (atribución) y relleno desde las cortesías actuales.
-- 3. colega_estado, vista embajadores_colegas y embajadores_puntos.
-- 4. canjear_referido: 3 meses, Premium o Empresas.
-- 5. Escalera: embajadores_recompensas, embajadores_revisar(_todos), triggers.
-- 6. Funciones para la web: mi_embajador, embajadores_distintivos.

-- 1 ─────────────────────────────────────────────────────────────────────────
alter table public.membresias_cortesia drop constraint if exists membresias_cortesia_plan_check;
alter table public.membresias_cortesia
  add constraint membresias_cortesia_plan_check check (plan in ('premium', 'destacado', 'empresas'));

alter table public.membresias_cortesia add column if not exists honor_at timestamptz;

comment on column public.membresias_cortesia.honor_at is
  'Embajadores de Escena: cuándo llegó a Embajador/a de Honor (25 puntos). Desde entonces, hasta = infinity.';

-- 2 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.embajadores_referidos (
  profile_id   uuid primary key references public.profiles (id) on delete cascade,
  embajador_id uuid not null references public.profiles (id) on delete cascade,
  creado_at    timestamptz not null default now()
);
create index if not exists embajadores_referidos_embajador_idx on public.embajadores_referidos (embajador_id);

comment on table public.embajadores_referidos is
  'Embajadores de Escena: embajador/a que trajo a cada cuenta (primer enlace /r/<código> con el que se registró; una vez por cuenta). Solo service_role.';

alter table public.embajadores_referidos enable row level security;
revoke all on public.embajadores_referidos from anon, authenticated;
grant select, insert, update, delete on public.embajadores_referidos to service_role;

-- Colegas que ya entraron con el enlace de un embajador (su cortesía no cambia).
insert into public.embajadores_referidos (profile_id, embajador_id, creado_at)
select m.profile_id, m.referido_por, m.desde
from public.membresias_cortesia m
where m.tipo = 'referido' and m.referido_por is not null
on conflict (profile_id) do nothing;

-- 3 ─────────────────────────────────────────────────────────────────────────

/**
 * Clase de un colega, si está activo y sus puntos. MISMAS reglas que la vista
 * elenco_colegas (20261031150000), que no se toca:
 *   persona:      correo confirmado + foto + al menos una profesión. 1 punto.
 *   organización: perfil completo (logo, presentación y ciudad). 3 puntos.
 *   sala:         reclamación de su ficha en Espacios Escénicos aprobada. 3 puntos.
 *   público general: nunca suma.
 * Una cuenta borrada no cuenta.
 */
create or replace function public.colega_estado(p_perfil uuid)
returns table (clase text, activo boolean, puntos integer)
language sql
stable
set search_path = 'public'
as $$
  select c.clase,
         a.activo,
         case when a.activo then (case c.clase when 'persona' then 1 else 3 end) else 0 end
  from public.profiles p
  cross join lateral (
    select case when p.tipo_perfil::text = 'teatro' then 'sala'
                when public.elenco_es_organizacion(p.tipo_perfil::text) then 'organizacion'
                when p.tipo_perfil::text = 'publico' then 'publico'
                else 'persona' end as clase
  ) c
  cross join lateral (
    select p.deleted_at is null and case c.clase
      when 'persona' then p.verificado
                          and coalesce(btrim(p.avatar_url), '') <> ''
                          and exists (select 1 from public.profile_specialties s where s.profile_id = p.id)
      when 'organizacion' then coalesce(btrim(p.avatar_url), '') <> '' and coalesce(btrim(p.bio), '') <> '' and coalesce(btrim(p.ciudad), '') <> ''
      when 'sala' then exists (select 1 from public.espacios_reclamaciones er where er.profile_id = p.id and er.estado = 'aprobada')
      else false
    end as activo
  ) a
  where p.id = p_perfil;
$$;

/** Colegas de cada embajador/a, con su clase, si están activos y sus puntos. */
create or replace view public.embajadores_colegas
with (security_invoker = true)
as
select r.embajador_id,
       r.profile_id,
       r.creado_at,
       p.created_at as alta,
       coalesce(nullif(btrim(p.nombre_artistico), ''), p.nombre) as nombre,
       p.tipo_perfil::text as tipo_perfil,
       e.clase,
       e.activo,
       e.puntos
from public.embajadores_referidos r
join public.profiles p on p.id = r.profile_id
cross join lateral public.colega_estado(r.profile_id) e;

comment on view public.embajadores_colegas is
  'Embajadores de Escena: colegas referidos, si están activos y sus puntos (mismas reglas que el Elenco Fundador, función colega_estado). Calculado siempre a partir de los datos reales. Solo service_role.';

revoke all on public.embajadores_colegas from anon, authenticated;
grant select on public.embajadores_colegas to service_role;

/** Puntos de un/a embajador/a: suma de los de sus colegas activos. */
create or replace function public.embajadores_puntos(p_embajador uuid)
returns integer
language sql
stable
security definer
set search_path = 'public'
as $$
  select coalesce(sum(puntos), 0)::int from public.embajadores_colegas where embajador_id = p_embajador;
$$;

-- 4 ─────────────────────────────────────────────────────────────────────────

/** Plan de cortesía de un colega según su tipo de perfil: Empresas si es organización, si no, Premium. */
create or replace function public.embajadores_plan_colega(p_tipo text)
returns text
language sql
immutable
as $$
  select case when public.elenco_es_organizacion(p_tipo) then 'empresas' else 'premium' end;
$$;

/**
 * Una cuenta nueva (menos de 14 días) canjea el código de un/a embajador/a
 * activo/a. Se ejecuta solo al confirmar el correo (lib/auth/confirmacion.ts).
 *   · Atribución al embajador: una vez por cuenta (la primera).
 *   · Cortesía: 3 meses de Premium (persona) o Empresas (organización), una
 *     sola vez por cuenta y nunca si ya tuvo una cortesía. subir_plan no baja
 *     nunca un plan superior.
 * Devuelve 'ok' | 'no_valido' | 'no_aplica'.
 */
create or replace function public.canjear_referido(p_codigo text)
returns text
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_yo   uuid := auth.uid();
  v_emb  uuid;
  v_plan text;
begin
  if v_yo is null or p_codigo is null then return 'no_valido'; end if;

  select profile_id into v_emb from public.membresias_cortesia
  where codigo_referido = upper(btrim(p_codigo)) and tipo = 'embajador'
    and hasta > now() and renunciada_at is null;
  if v_emb is null or v_emb = v_yo then return 'no_valido'; end if;

  select public.embajadores_plan_colega(p.tipo_perfil::text) into v_plan
  from public.profiles p where p.id = v_yo and p.created_at > now() - interval '14 days';
  if v_plan is null then return 'no_aplica'; end if;

  insert into public.embajadores_referidos (profile_id, embajador_id) values (v_yo, v_emb)
  on conflict (profile_id) do nothing;

  if exists (select 1 from public.membresias_cortesia where profile_id = v_yo) then
    return 'no_aplica';
  end if;

  insert into public.membresias_cortesia (profile_id, tipo, plan, desde, hasta, referido_por)
  values (v_yo, 'referido', v_plan, now(), now() + interval '3 months', v_emb);

  perform public.subir_plan(v_yo, v_plan);
  return 'ok';
end;
$$;

-- 5 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.embajadores_recompensas (
  id                uuid primary key default gen_random_uuid(),
  embajador_id      uuid not null references public.profiles (id) on delete cascade,
  escalon           smallint not null check (escalon in (5, 10, 25)),
  puntos            integer not null,
  otorgada_at       timestamptz not null default now(),
  correo_enviado_at timestamptz,
  constraint embajadores_recompensas_una_vez unique (embajador_id, escalon)
);

comment on table public.embajadores_recompensas is
  'Embajadores de Escena: escalones alcanzados, una fila por embajador/a y escalón (nunca se otorga dos veces). correo_enviado_at: aviso al embajador. Solo service_role.';

alter table public.embajadores_recompensas enable row level security;
revoke all on public.embajadores_recompensas from anon, authenticated;
grant select, insert, update, delete on public.embajadores_recompensas to service_role;

/**
 * Revisa la escalera de un/a embajador/a con sus puntos actuales y otorga los
 * escalones nuevos (cada uno una sola vez, por la clave única):
 *   5:  +6 meses a su membresía.
 *   10: +12 meses.
 *   25: Embajador/a de Honor: su membresía Destacado, para siempre.
 * El tiempo se suma al que le quede (o desde hoy, si ya había terminado);
 * nunca lo sustituye ni lo recorta. Una membresía a la que renunció no se
 * renueva. Devuelve cuántos escalones nuevos ha otorgado.
 */
create or replace function public.embajadores_revisar(p_embajador uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  m        public.membresias_cortesia%rowtype;
  v_puntos integer;
  v_esc    integer;
  v_id     uuid;
  n        integer := 0;
begin
  select * into m from public.membresias_cortesia
  where profile_id = p_embajador and tipo = 'embajador' and renunciada_at is null
  for update;
  if m.profile_id is null then return 0; end if;

  v_puntos := public.embajadores_puntos(p_embajador);

  foreach v_esc in array array[5, 10, 25] loop
    exit when v_puntos < v_esc;
    v_id := null;
    insert into public.embajadores_recompensas (embajador_id, escalon, puntos)
    values (p_embajador, v_esc, v_puntos)
    on conflict (embajador_id, escalon) do nothing
    returning id into v_id;
    continue when v_id is null;
    n := n + 1;

    if v_esc = 25 then
      update public.membresias_cortesia
      set hasta = 'infinity', honor_at = now(), procesada = false
      where profile_id = p_embajador;
    else
      update public.membresias_cortesia
      set hasta = greatest(hasta, now()) + case v_esc when 5 then interval '6 months' else interval '12 months' end,
          procesada = false
      where profile_id = p_embajador;
    end if;
    perform public.subir_plan(p_embajador, m.plan);
  end loop;
  return n;
end;
$$;

/** Tarea diaria: revisa la escalera de todos los embajadores (antes de expirar_cortesias). */
create or replace function public.embajadores_revisar_todos()
returns integer
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  r record;
  n integer := 0;
begin
  for r in select profile_id from public.membresias_cortesia
           where tipo = 'embajador' and renunciada_at is null loop
    n := n + public.embajadores_revisar(r.profile_id);
  end loop;
  return n;
end;
$$;

/** Comprobación inmediata cuando cambia algo que puede activar a un colega. Nunca bloquea el cambio. */
create or replace function public.embajadores_revisar_colega()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_perfil    uuid;
  v_embajador uuid;
begin
  -- Cada rama solo lee el campo de su tabla (profiles.id / *.profile_id).
  if tg_table_name = 'profiles' then v_perfil := new.id; else v_perfil := new.profile_id; end if;
  select embajador_id into v_embajador from public.embajadores_referidos where profile_id = v_perfil;
  if v_embajador is not null then
    perform public.embajadores_revisar(v_embajador);
  end if;
  return null;
exception when others then
  raise warning 'embajadores_revisar_colega: %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists profiles_embajadores_colega on public.profiles;
create trigger profiles_embajadores_colega
  after update of avatar_url, bio, ciudad, verificado, tipo_perfil, deleted_at on public.profiles
  for each row execute function public.embajadores_revisar_colega();

drop trigger if exists profile_specialties_embajadores_colega on public.profile_specialties;
create trigger profile_specialties_embajadores_colega
  after insert on public.profile_specialties
  for each row execute function public.embajadores_revisar_colega();

drop trigger if exists espacios_reclamaciones_embajadores_colega on public.espacios_reclamaciones;
create trigger espacios_reclamaciones_embajadores_colega
  after insert or update of estado on public.espacios_reclamaciones
  for each row when (new.estado = 'aprobada')
  execute function public.embajadores_revisar_colega();

-- 6 ─────────────────────────────────────────────────────────────────────────

/** El embajador que llama: su enlace, cifras, escalón y membresía (solo las suyas). */
create or replace function public.mi_embajador()
returns table (codigo_referido text, genero text, plan text, hasta timestamptz, honor boolean, activa boolean,
               registrados integer, activos integer, puntos integer, escalon integer)
language sql
stable
security definer
set search_path = 'public'
as $$
  select m.codigo_referido, m.genero, m.plan, m.hasta, m.honor_at is not null,
         (m.hasta > now() and m.renunciada_at is null),
         (select count(*)::int from public.embajadores_colegas c where c.embajador_id = m.profile_id),
         (select count(*)::int from public.embajadores_colegas c where c.embajador_id = m.profile_id and c.activo),
         public.embajadores_puntos(m.profile_id),
         coalesce((select max(r.escalon)::int from public.embajadores_recompensas r where r.embajador_id = m.profile_id), 0)
  from public.membresias_cortesia m
  where m.profile_id = auth.uid() and m.tipo = 'embajador';
$$;

/** Distintivo público: de una lista de perfiles, los Embajadores de Escena activos, su género y si son de Honor. */
create or replace function public.embajadores_distintivos(p_perfiles uuid[])
returns table (profile_id uuid, genero text, honor boolean)
language sql
stable
security definer
set search_path = 'public'
as $$
  select m.profile_id, m.genero, m.honor_at is not null
  from public.membresias_cortesia m
  where m.profile_id = any (p_perfiles) and m.tipo = 'embajador'
    and m.hasta > now() and m.renunciada_at is null;
$$;

revoke all on function public.colega_estado(uuid) from public, anon, authenticated;
revoke all on function public.embajadores_puntos(uuid) from public, anon, authenticated;
revoke all on function public.embajadores_plan_colega(text) from public, anon, authenticated;
revoke all on function public.embajadores_revisar(uuid) from public, anon, authenticated;
revoke all on function public.embajadores_revisar_todos() from public, anon, authenticated;
revoke all on function public.embajadores_revisar_colega() from public, anon, authenticated;
revoke all on function public.canjear_referido(text) from public;
revoke all on function public.mi_embajador() from public;
revoke all on function public.embajadores_distintivos(uuid[]) from public;

grant execute on function public.colega_estado(uuid) to service_role;
grant execute on function public.embajadores_puntos(uuid) to service_role;
grant execute on function public.embajadores_revisar(uuid) to service_role;
grant execute on function public.embajadores_revisar_todos() to service_role;
grant execute on function public.canjear_referido(text) to authenticated;
grant execute on function public.mi_embajador() to authenticated;
grant execute on function public.embajadores_distintivos(uuid[]) to anon, authenticated;

select cron.schedule(
  'embajadores-revisar',
  '30 3 * * *',
  $job$select public.embajadores_revisar_todos();$job$
);
