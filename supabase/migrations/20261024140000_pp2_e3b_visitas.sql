-- PP2-E.3B · Visitas al perfil y apariciones en el directorio.
--
-- Solo totales por día: nunca quién visitó ni desde dónde.
--
-- 1. perfil_visitas_dia: visitas a la ficha pública por perfil y día (UTC).
--    Una visita por visitante y día: perfil_visitas_huellas guarda una huella
--    anónima (hash calculado en el servidor a partir de la sesión o de la IP
--    y el navegador, con la fecha mezclada: no se puede seguir a nadie de un
--    día a otro). Las huellas se borran a los 2 días.
-- 2. perfil_apariciones_dia: veces que la tarjeta del perfil sale en un
--    listado del Directorio, por día.
-- 3. registrar_visita() y registrar_apariciones() solo las ejecuta el
--    servidor (service_role): nadie puede inflar las cifras desde fuera.
--    El servidor ya descarta al propio titular y a los bots.
-- 4. mis_estadisticas_perfil() y mis_visitas_por_mes(): solo las cifras del
--    titular que llama.

-- 1 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.perfil_visitas_dia (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  dia        date not null,
  visitas    integer not null default 0 check (visitas >= 0),
  primary key (profile_id, dia)
);

create table if not exists public.perfil_visitas_huellas (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  dia        date not null,
  huella     text not null check (length(huella) between 16 and 128),
  primary key (profile_id, dia, huella)
);
create index if not exists perfil_visitas_huellas_dia_idx on public.perfil_visitas_huellas (dia);

-- 2 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.perfil_apariciones_dia (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  dia         date not null,
  apariciones integer not null default 0 check (apariciones >= 0),
  primary key (profile_id, dia)
);

comment on table public.perfil_visitas_dia is 'PP2-E.3B: visitas a la ficha por perfil y día (UTC). Solo totales.';
comment on table public.perfil_visitas_huellas is 'PP2-E.3B: huellas anónimas para contar una visita por visitante y día. Se borran a los 2 días.';
comment on table public.perfil_apariciones_dia is 'PP2-E.3B: apariciones de la tarjeta en el Directorio por perfil y día (UTC).';

alter table public.perfil_visitas_dia enable row level security;
alter table public.perfil_visitas_huellas enable row level security;
alter table public.perfil_apariciones_dia enable row level security;
revoke all on public.perfil_visitas_dia, public.perfil_visitas_huellas, public.perfil_apariciones_dia from anon, authenticated;

-- 3 ─────────────────────────────────────────────────────────────────────────

/** Anota una visita (si esa huella no ha visitado hoy el perfil). Devuelve si contó. */
create or replace function public.registrar_visita(p_perfil uuid, p_huella text)
returns boolean
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_dia date := (now() at time zone 'utc')::date;
begin
  if p_perfil is null or p_huella is null or length(p_huella) not between 16 and 128 then
    return false;
  end if;

  insert into public.perfil_visitas_huellas (profile_id, dia, huella)
  values (p_perfil, v_dia, p_huella)
  on conflict do nothing;
  if not found then return false; end if;

  insert into public.perfil_visitas_dia (profile_id, dia, visitas)
  values (p_perfil, v_dia, 1)
  on conflict (profile_id, dia) do update set visitas = public.perfil_visitas_dia.visitas + 1;

  -- Limpieza de huellas antiguas (de vez en cuando, es barato con el índice).
  if random() < 0.02 then
    delete from public.perfil_visitas_huellas where dia < v_dia - 1;
  end if;
  return true;
end;
$$;

/** Suma una aparición en el Directorio a cada perfil de la lista (sin repetidos). */
create or replace function public.registrar_apariciones(p_perfiles uuid[])
returns integer
language sql
volatile
security definer
set search_path = 'public'
as $$
  with ids as (
    select distinct unnest(p_perfiles) as id
  ), ins as (
    insert into public.perfil_apariciones_dia (profile_id, dia, apariciones)
    select ids.id, (now() at time zone 'utc')::date, 1
    from ids join public.profiles p on p.id = ids.id
    on conflict (profile_id, dia) do update set apariciones = public.perfil_apariciones_dia.apariciones + 1
    returning 1
  )
  select count(*)::int from ins;
$$;

-- 4 ─────────────────────────────────────────────────────────────────────────

/** Cifras del titular: visitas y apariciones de los últimos 30 días y de los 30 anteriores. */
create or replace function public.mis_estadisticas_perfil()
returns table (visitas_30 integer, visitas_prev integer, apariciones_30 integer, apariciones_prev integer, desde date)
language sql
stable
security definer
set search_path = 'public'
as $$
  with hoy as (select (now() at time zone 'utc')::date as d)
  select
    coalesce((select sum(visitas) from public.perfil_visitas_dia, hoy
              where profile_id = auth.uid() and dia > hoy.d - 30), 0)::int,
    coalesce((select sum(visitas) from public.perfil_visitas_dia, hoy
              where profile_id = auth.uid() and dia <= hoy.d - 30 and dia > hoy.d - 60), 0)::int,
    coalesce((select sum(apariciones) from public.perfil_apariciones_dia, hoy
              where profile_id = auth.uid() and dia > hoy.d - 30), 0)::int,
    coalesce((select sum(apariciones) from public.perfil_apariciones_dia, hoy
              where profile_id = auth.uid() and dia <= hoy.d - 30 and dia > hoy.d - 60), 0)::int,
    least(
      (select min(dia) from public.perfil_visitas_dia where profile_id = auth.uid()),
      (select min(dia) from public.perfil_apariciones_dia where profile_id = auth.uid())
    )
  where auth.uid() is not null;
$$;

/** Visitas del titular por mes (los últimos 6 meses, 'AAAA-MM'). */
create or replace function public.mis_visitas_por_mes()
returns table (mes text, visitas integer)
language sql
stable
security definer
set search_path = 'public'
as $$
  select to_char(dia, 'YYYY-MM'), sum(visitas)::int
  from public.perfil_visitas_dia
  where profile_id = auth.uid()
    and dia >= date_trunc('month', (now() at time zone 'utc') - interval '5 months')::date
  group by 1
  order by 1;
$$;

revoke all on function public.registrar_visita(uuid, text) from public, anon, authenticated;
revoke all on function public.registrar_apariciones(uuid[]) from public, anon, authenticated;
revoke all on function public.mis_estadisticas_perfil() from public;
revoke all on function public.mis_visitas_por_mes() from public;

grant execute on function public.registrar_visita(uuid, text) to service_role;
grant execute on function public.registrar_apariciones(uuid[]) to service_role;
grant execute on function public.mis_estadisticas_perfil() to authenticated;
grant execute on function public.mis_visitas_por_mes() to authenticated;
