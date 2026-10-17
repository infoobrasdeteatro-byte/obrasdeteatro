-- Cartelera (parte 6): quien publica destaca sus espectáculos con las semanas
-- que incluye su plan (cartelera_limites_plan.semanas_destacado_mes).
--
-- Decisiones de Dirección (17/10/2026):
--   · En todos los planes se destaca a mano, con el botón «Destacar».
--   · Una semana = 7 días seguidos desde el día elegido. El cupo es por
--     cuenta y por mes natural (el mes del primer día de la semana): Premium 1,
--     Destacado y Empresas 5 (lo que da para tener uno destacado todo el mes).
--   · La semana tiene que incluir alguna función del espectáculo.
--   · Una semana que aún no ha empezado se puede quitar y vuelve al cupo.
--
-- La tabla cartelera_destacados solo la escribe moderación (RLS); estas dos
-- funciones son la única puerta para quien publica y comprueban todo.

create or replace function public.cartelera_destacar(p_espectaculo uuid, p_desde date)
  returns public.cartelera_destacados
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  esp public.espectaculos%rowtype;
  plan_usuario text;
  cupo smallint;
  usadas integer;
  fila public.cartelera_destacados%rowtype;
begin
  if uid is null then raise exception 'Inicia sesión para destacar tu espectáculo.'; end if;

  select * into esp from public.espectaculos e where e.id = p_espectaculo;
  if not found or esp.user_id <> uid then raise exception 'Este espectáculo no es tuyo.'; end if;
  if esp.estado <> 'publicado' then raise exception 'Solo se pueden destacar espectáculos publicados.'; end if;

  if p_desde is null or p_desde < hoy then raise exception 'La semana de destacado no puede empezar en el pasado.'; end if;
  if p_desde > hoy + 60 then raise exception 'Solo se puede destacar con hasta 60 días de antelación.'; end if;

  if not exists (
    select 1 from public.funciones f
     where f.espectaculo_id = p_espectaculo and f.estado <> 'cancelada'
       and (f.inicio at time zone f.zona_horaria)::date between p_desde and p_desde + 6
  ) then
    raise exception 'Esa semana no tiene funciones de este espectáculo: elige una semana en la que actúes.';
  end if;

  if exists (
    select 1 from public.cartelera_destacados d
     where d.espectaculo_id = p_espectaculo and d.desde <= p_desde + 6 and d.hasta >= p_desde
  ) then
    raise exception 'Este espectáculo ya está destacado alguno de esos días.';
  end if;

  -- Una petición a la vez por cuenta: dos clics seguidos no se saltan el cupo.
  perform pg_advisory_xact_lock(hashtext('cartelera_destacar:' || uid::text));

  select p.plan::text into plan_usuario from public.profiles p where p.id = uid;
  select l.semanas_destacado_mes into cupo from public.cartelera_limites_plan l where l.plan = coalesce(plan_usuario, 'gratuito');
  if coalesce(cupo, 0) = 0 then
    raise exception 'Tu plan no incluye semanas de destacado. Con Premium tienes una semana al mes.';
  end if;

  select count(*) into usadas
    from public.cartelera_destacados d
    join public.espectaculos e on e.id = d.espectaculo_id
   where e.user_id = uid and d.origen = 'plan'
     and date_trunc('month', d.desde) = date_trunc('month', p_desde);
  if usadas >= cupo then
    raise exception 'Tu plan incluye % semana(s) de destacado al mes y ya las has usado en %.', cupo,
      to_char(p_desde, 'MM/YYYY');
  end if;

  insert into public.cartelera_destacados (espectaculo_id, desde, hasta, ambito, origen)
  values (p_espectaculo, p_desde, p_desde + 6, 'ciudad', 'plan')
  returning * into fila;
  return fila;
end;
$$;

create or replace function public.cartelera_quitar_destacado(p_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  d public.cartelera_destacados%rowtype;
begin
  select x.* into d from public.cartelera_destacados x
    join public.espectaculos e on e.id = x.espectaculo_id
   where x.id = p_id and e.user_id = uid;
  if not found then raise exception 'Ese destacado no es tuyo.'; end if;
  if d.origen <> 'plan' then raise exception 'Este destacado lo ha puesto el equipo de ObrasDeTeatro.'; end if;
  if d.desde <= hoy then raise exception 'Una semana de destacado que ya ha empezado no se puede quitar.'; end if;
  delete from public.cartelera_destacados where id = p_id;
end;
$$;

revoke execute on function public.cartelera_destacar(uuid, date) from public, anon;
revoke execute on function public.cartelera_quitar_destacado(uuid) from public, anon;
grant execute on function public.cartelera_destacar(uuid, date) to authenticated;
grant execute on function public.cartelera_quitar_destacado(uuid) to authenticated;

comment on function public.cartelera_destacar(uuid, date) is
  'Quien publica destaca una semana (7 días) de un espectáculo suyo publicado, con el cupo mensual de su plan.';
comment on function public.cartelera_quitar_destacado(uuid) is
  'Quien publica quita una semana de destacado de su plan que aún no ha empezado (vuelve al cupo).';
