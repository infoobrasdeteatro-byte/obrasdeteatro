-- Embajadores de Escena: membresías de cortesía sin pasar por Stripe.
--
-- · Dirección crea invitaciones personales (enlace secreto, un solo uso,
--   caduca a los 30 días, se puede anular). Al aceptarla, la persona recibe
--   12 meses de plan Destacado: sin tarjeta, sin compromiso.
-- · Cada embajador/a tiene un código personal. Una cuenta NUEVA que se
--   registra con él recibe 1 mes de Premium (una vez por persona, sin tarjeta).
-- · El plan lo pone esta base, no Stripe. Al terminar (o al renunciar), el
--   plan vuelve al de su suscripción de pago si la tiene, o a «gratuito». Una
--   tarea diaria (pg_cron) cierra las membresías vencidas.
-- · Nunca se baja un plan: si alguien ya paga uno superior, lo conserva.
--
-- 1. embajadores_invitaciones (solo service_role).
-- 2. membresias_cortesia: una fila por perfil; el titular lee la suya.
-- 3. Funciones: invitacion_publica, aceptar_invitacion_embajador,
--    canjear_referido, renunciar_cortesia, mi_cortesia, embajadores_activos,
--    plan_tras_cortesia, expirar_cortesias.

-- 1 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.embajadores_invitaciones (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique default replace(gen_random_uuid()::text, '-', ''),
  nombre       text not null check (length(btrim(nombre)) between 1 and 120),
  genero       text not null check (genero in ('f', 'm')),
  oficio       text not null check (oficio in ('interpretacion', 'dramaturgia', 'direccion', 'otros')),
  telefono     text check (telefono is null or telefono ~ '^\+?[0-9 ().-]{6,24}$'),
  email        text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nota         text check (nota is null or length(nota) <= 500),
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'anulada')),
  creada_at    timestamptz not null default now(),
  caduca_at    timestamptz not null default now() + interval '30 days',
  aceptada_por uuid references public.profiles (id) on delete set null,
  aceptada_at  timestamptz
);

comment on table public.embajadores_invitaciones is
  'Embajadores de Escena: invitaciones personales (enlace secreto de un solo uso). Solo service_role.';

alter table public.embajadores_invitaciones enable row level security;
revoke all on public.embajadores_invitaciones from anon, authenticated;
grant select, insert, update, delete on public.embajadores_invitaciones to service_role;

-- 2 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.membresias_cortesia (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  tipo            text not null check (tipo in ('embajador', 'referido')),
  plan            text not null check (plan in ('premium', 'destacado')),
  desde           timestamptz not null default now(),
  hasta           timestamptz not null,
  genero          text check (genero in ('f', 'm')),
  oficio          text,
  invitacion_id   uuid references public.embajadores_invitaciones (id) on delete set null,
  codigo_referido text unique,
  referido_por    uuid references public.profiles (id) on delete set null,
  renunciada_at   timestamptz,
  procesada       boolean not null default false
);

create index if not exists membresias_cortesia_referido_por_idx on public.membresias_cortesia (referido_por);
create index if not exists membresias_cortesia_hasta_idx on public.membresias_cortesia (hasta) where not procesada;

comment on table public.membresias_cortesia is
  'Membresías de cortesía (Embajadores de Escena y referidos). El plan lo pone esta base, no Stripe.';

alter table public.membresias_cortesia enable row level security;
drop policy if exists "Titular ve su membresía de cortesía" on public.membresias_cortesia;
create policy "Titular ve su membresía de cortesía" on public.membresias_cortesia
  for select to authenticated using (profile_id = (select auth.uid()));
revoke all on public.membresias_cortesia from anon, authenticated;
grant select on public.membresias_cortesia to authenticated;
grant select, insert, update, delete on public.membresias_cortesia to service_role;

-- 3 ─────────────────────────────────────────────────────────────────────────

/** Orden de los planes, para no bajar nunca a nadie. */
create or replace function public.plan_rango(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan when 'empresas' then 3 when 'destacado' then 2 when 'premium' then 1 else 0 end;
$$;

/** Plan que corresponde a un perfil sin cortesía: el de su suscripción de pago activa, o «gratuito». */
create or replace function public.plan_tras_cortesia(p_perfil uuid)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select coalesce(
    (select s.plan from public.subscriptions s
     where s.profile_id = p_perfil and s.status in ('active', 'trialing', 'past_due')
     limit 1),
    'gratuito');
$$;

/** Aplica un plan de cortesía sin bajar nunca el que ya tenga. */
create or replace function public.subir_plan(p_perfil uuid, p_plan text)
returns void
language sql
volatile
security definer
set search_path = 'public'
as $$
  update public.profiles
  set plan = p_plan::public.plan_suscripcion, is_premium = true, updated_at = now()
  where id = p_perfil and public.plan_rango(plan::text) < public.plan_rango(p_plan);
$$;

/** Devuelve el plan al que le toca tras terminar la cortesía. */
create or replace function public.bajar_plan_tras_cortesia(p_perfil uuid)
returns void
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare v_plan text := public.plan_tras_cortesia(p_perfil);
begin
  update public.profiles
  set plan = v_plan::public.plan_suscripcion, is_premium = (v_plan <> 'gratuito'), updated_at = now()
  where id = p_perfil;
end;
$$;

/**
 * Lo que enseña la página de una invitación (el token es el secreto):
 * nombre, género, oficio y estado efectivo ('pendiente' | 'aceptada' |
 * 'anulada' | 'caducada'). Nada si el token no existe.
 */
create or replace function public.invitacion_publica(p_token text)
returns table (nombre text, genero text, oficio text, estado text)
language sql
stable
security definer
set search_path = 'public'
as $$
  select i.nombre, i.genero, i.oficio,
         case when i.estado = 'pendiente' and i.caduca_at < now() then 'caducada' else i.estado end
  from public.embajadores_invitaciones i
  where i.token = p_token;
$$;

/**
 * Acepta una invitación con la sesión de quien llama. Devuelve:
 * 'ok' | 'no_valida' | 'caducada' | 'usada' | 'ya_embajador'.
 */
create or replace function public.aceptar_invitacion_embajador(p_token text)
returns text
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_inv public.embajadores_invitaciones%rowtype;
  v_codigo text;
begin
  if v_yo is null then return 'no_valida'; end if;

  select * into v_inv from public.embajadores_invitaciones where token = p_token for update;
  if v_inv.id is null or v_inv.estado = 'anulada' then return 'no_valida'; end if;
  if v_inv.estado = 'aceptada' then
    return case when v_inv.aceptada_por = v_yo then 'ok' else 'usada' end;
  end if;
  if v_inv.caduca_at < now() then return 'caducada'; end if;

  if exists (select 1 from public.membresias_cortesia
             where profile_id = v_yo and tipo = 'embajador' and hasta > now() and renunciada_at is null) then
    return 'ya_embajador';
  end if;

  -- Código personal para invitar a colegas (8 caracteres, sin ambigüedad).
  loop
    v_codigo := upper(translate(substr(md5(gen_random_uuid()::text), 1, 8), '01', 'XY'));
    exit when not exists (select 1 from public.membresias_cortesia where codigo_referido = v_codigo);
  end loop;

  insert into public.membresias_cortesia
    (profile_id, tipo, plan, desde, hasta, genero, oficio, invitacion_id, codigo_referido, referido_por, renunciada_at, procesada)
  values
    (v_yo, 'embajador', 'destacado', now(), now() + interval '12 months', v_inv.genero, v_inv.oficio, v_inv.id, v_codigo, null, null, false)
  on conflict (profile_id) do update set
    tipo = excluded.tipo, plan = excluded.plan, desde = excluded.desde, hasta = excluded.hasta,
    genero = excluded.genero, oficio = excluded.oficio, invitacion_id = excluded.invitacion_id,
    codigo_referido = excluded.codigo_referido, referido_por = null, renunciada_at = null, procesada = false;

  update public.embajadores_invitaciones
  set estado = 'aceptada', aceptada_por = v_yo, aceptada_at = now()
  where id = v_inv.id;

  perform public.subir_plan(v_yo, 'destacado');
  return 'ok';
end;
$$;

/**
 * Una cuenta nueva (menos de 14 días) canjea el código de un/a embajador/a
 * activo/a: 1 mes de Premium, una sola vez por persona y nunca si ya tuvo
 * cortesía o suscripción. Devuelve 'ok' | 'no_valido' | 'no_aplica'.
 */
create or replace function public.canjear_referido(p_codigo text)
returns text
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_emb uuid;
begin
  if v_yo is null or p_codigo is null then return 'no_valido'; end if;

  select profile_id into v_emb from public.membresias_cortesia
  where codigo_referido = upper(btrim(p_codigo)) and tipo = 'embajador'
    and hasta > now() and renunciada_at is null;
  if v_emb is null or v_emb = v_yo then return 'no_valido'; end if;

  if not exists (select 1 from public.profiles where id = v_yo and created_at > now() - interval '14 days')
     or exists (select 1 from public.membresias_cortesia where profile_id = v_yo)
     or exists (select 1 from public.subscriptions where profile_id = v_yo) then
    return 'no_aplica';
  end if;

  insert into public.membresias_cortesia (profile_id, tipo, plan, desde, hasta, referido_por)
  values (v_yo, 'referido', 'premium', now(), now() + interval '30 days', v_emb);

  perform public.subir_plan(v_yo, 'premium');
  return 'ok';
end;
$$;

/** Quien llama renuncia a su cortesía: termina hoy y su plan vuelve al que le corresponda. */
create or replace function public.renunciar_cortesia()
returns boolean
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare v_yo uuid := auth.uid();
begin
  update public.membresias_cortesia
  set hasta = now(), renunciada_at = now(), procesada = true
  where profile_id = v_yo and hasta > now() and renunciada_at is null;
  if not found then return false; end if;
  perform public.bajar_plan_tras_cortesia(v_yo);
  return true;
end;
$$;

/** La cortesía de quien llama, con el número de colegas que han entrado con su código. */
create or replace function public.mi_cortesia()
returns table (tipo text, plan text, hasta timestamptz, genero text, codigo_referido text, activa boolean, referidos integer)
language sql
stable
security definer
set search_path = 'public'
as $$
  select m.tipo, m.plan, m.hasta, m.genero, m.codigo_referido,
         (m.hasta > now() and m.renunciada_at is null),
         (select count(*)::int from public.membresias_cortesia r where r.referido_por = m.profile_id)
  from public.membresias_cortesia m
  where m.profile_id = auth.uid();
$$;

/** Distintivo público: de una lista de perfiles, los que son Embajadores de Escena activos (y su género). */
create or replace function public.embajadores_activos(p_perfiles uuid[])
returns table (profile_id uuid, genero text)
language sql
stable
security definer
set search_path = 'public'
as $$
  select m.profile_id, m.genero
  from public.membresias_cortesia m
  where m.profile_id = any (p_perfiles) and m.tipo = 'embajador'
    and m.hasta > now() and m.renunciada_at is null;
$$;

/** Tarea diaria: cierra las cortesías vencidas y devuelve cada plan al que le toca. */
create or replace function public.expirar_cortesias()
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
  for r in select profile_id from public.membresias_cortesia where not procesada and hasta <= now() for update loop
    perform public.bajar_plan_tras_cortesia(r.profile_id);
    update public.membresias_cortesia set procesada = true where profile_id = r.profile_id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.plan_tras_cortesia(uuid) from public, anon, authenticated;
revoke all on function public.subir_plan(uuid, text) from public, anon, authenticated;
revoke all on function public.bajar_plan_tras_cortesia(uuid) from public, anon, authenticated;
revoke all on function public.expirar_cortesias() from public, anon, authenticated;
revoke all on function public.invitacion_publica(text) from public;
revoke all on function public.aceptar_invitacion_embajador(text) from public;
revoke all on function public.canjear_referido(text) from public;
revoke all on function public.renunciar_cortesia() from public;
revoke all on function public.mi_cortesia() from public;
revoke all on function public.embajadores_activos(uuid[]) from public;

grant execute on function public.plan_tras_cortesia(uuid) to service_role;
grant execute on function public.expirar_cortesias() to service_role;
grant execute on function public.invitacion_publica(text) to anon, authenticated;
grant execute on function public.aceptar_invitacion_embajador(text) to authenticated;
grant execute on function public.canjear_referido(text) to authenticated;
grant execute on function public.renunciar_cortesia() to authenticated;
grant execute on function public.mi_cortesia() to authenticated;
grant execute on function public.embajadores_activos(uuid[]) to anon, authenticated;

select cron.schedule(
  'expirar-cortesias',
  '40 3 * * *',
  $job$select public.expirar_cortesias();$job$
);
