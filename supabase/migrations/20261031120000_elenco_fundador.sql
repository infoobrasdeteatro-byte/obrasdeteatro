-- Elenco Fundador: programa de invitación personal (máx. 100 plazas, 001–100).
--
-- · Dirección crea invitaciones (enlace secreto de un solo uso). Al aceptarla,
--   la cuenta pasa a ser fundadora con su número. Plan de base: gratuito.
-- · Bono de bienvenida: 3 meses de Premium (persona) o Empresas (organización)
--   que el fundador activa cuando quiera dentro de los 12 meses siguientes a
--   aceptar. Si no lo activa, caduca.
-- · Enlace público /elenco/<nº>: quien se registra con él queda atribuido a
--   ese fundador (primer enlace, una vez por cuenta). Sin mes de Premium.
-- · Colegas activos y puntos se calculan siempre en SQL (vista
--   elenco_colegas), nunca con contadores: se pueden auditar.
-- · Escalera automática (5, 10, 25, 50 puntos) con registro de recompensas
--   (una por escalón y fundador, garantizado por clave única).
--
-- Reutiliza el patrón de Embajadores de Escena (plan_rango, subir_plan,
-- plan_tras_cortesia) SIN modificar ninguna de sus tablas ni funciones:
--
-- · Tablas propias: membresias_cortesia tiene una fila por perfil (clave
--   profile_id) y un solo plan/fecha; el Elenco necesita varios tramos que se
--   suman (bono, recompensas, Miembro de Honor para siempre) y que conviven
--   con una membresía de Embajador. Ampliarla obligaría a cambiar su clave y
--   sus funciones (expirar_cortesias, mi_cortesia, planConCortesia).
-- · Suelo de plan: un trigger en profiles impide que el plan baje por debajo
--   del tramo del Elenco vigente. Así, ni el webhook de Stripe ni el fin de
--   una cortesía de Embajador pueden retirar un plan del Elenco, sin tocar su
--   código. Solo actúa sobre perfiles con un tramo del Elenco vigente.
--
-- ScenaIA: los planes Empresas obtenidos aquí son ilimitados, como fija la
-- Tabla Definitiva v2 (§9.2). Nada de esta migración toca el circuito
-- económico.
--
-- 1. Tablas: elenco_fundadores, elenco_referidos, elenco_cortesias,
--    elenco_recompensas, elenco_cartelera_usos (todas solo service_role).
-- 2. Vista elenco_colegas (colega activo y puntos).
-- 3. Tramos de cortesía y plan.
-- 4. Escalera de recompensas y revisión (pg_cron diario + triggers).
-- 5. Funciones para la web.

-- 1 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.elenco_fundadores (
  id               uuid primary key default gen_random_uuid(),
  numero           smallint not null check (numero between 1 and 100),
  token            text not null unique default replace(gen_random_uuid()::text, '-', ''),
  nombre           text not null check (length(btrim(nombre)) between 1 and 120),
  tipo             text not null check (tipo in ('persona', 'organizacion')),
  oficio           text not null check (length(btrim(oficio)) between 1 and 80),
  telefono         text check (telefono is null or telefono ~ '^\+?[0-9 ().-]{6,24}$'),
  email            text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nota             text check (nota is null or length(nota) <= 500),
  estado           text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'anulada')),
  creada_at        timestamptz not null default now(),
  aceptada_por     uuid unique references public.profiles (id) on delete set null,
  aceptada_at      timestamptz,
  bono_activado_at timestamptz,
  constraint elenco_fundadores_contacto check (telefono is not null or email is not null)
);

-- Un número por plaza viva; una invitación anulada libera el suyo.
create unique index if not exists elenco_fundadores_numero_vivo_idx
  on public.elenco_fundadores (numero) where estado <> 'anulada';

comment on table public.elenco_fundadores is
  'Elenco Fundador: invitaciones (enlace secreto de un solo uso) y plazas 001–100. Solo service_role.';

create table if not exists public.elenco_referidos (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  fundador_id uuid not null references public.elenco_fundadores (id) on delete cascade,
  creado_at   timestamptz not null default now()
);
create index if not exists elenco_referidos_fundador_idx on public.elenco_referidos (fundador_id);

comment on table public.elenco_referidos is
  'Fundador que trajo a cada cuenta (primer enlace /elenco/<nº> con el que se registró; una vez por cuenta). Solo service_role.';

-- Tramos de cortesía. No se solapan dentro de un mismo perfil: cada tramo nuevo
-- se coloca tras el tiempo de igual o mayor plan que ya tenga, y el tiempo de
-- plan inferior se aplaza (nunca se recorta). hasta = infinity: para siempre.
create table if not exists public.elenco_cortesias (
  id              uuid primary key default gen_random_uuid(),
  fundador_id     uuid not null references public.elenco_fundadores (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  motivo          text not null check (motivo in ('bono', 'escalon_5', 'escalon_10', 'escalon_25', 'escalon_50')),
  plan            text not null check (plan in ('premium', 'destacado', 'empresas')),
  desde           timestamptz not null,
  hasta           timestamptz not null,
  inicio_aplicado boolean not null default false,
  fin_aplicado    boolean not null default false,
  creado_at       timestamptz not null default now(),
  constraint elenco_cortesias_fechas check (hasta > desde)
);
create index if not exists elenco_cortesias_perfil_idx on public.elenco_cortesias (profile_id, hasta);
create index if not exists elenco_cortesias_pendientes_idx on public.elenco_cortesias (profile_id) where not fin_aplicado;

comment on table public.elenco_cortesias is
  'Elenco Fundador: tramos de plan por cortesía (bono y recompensas). El plan lo pone esta base, no Stripe. Solo service_role.';

create table if not exists public.elenco_recompensas (
  id                uuid primary key default gen_random_uuid(),
  fundador_id       uuid not null references public.elenco_fundadores (id) on delete cascade,
  escalon           smallint not null check (escalon in (5, 10, 25, 50)),
  puntos            integer not null,
  semanas_cartelera smallint not null default 0 check (semanas_cartelera >= 0),
  otorgada_at       timestamptz not null default now(),
  correo_enviado_at timestamptz,
  constraint elenco_recompensas_una_vez unique (fundador_id, escalon)
);

comment on table public.elenco_recompensas is
  'Escalones alcanzados: una fila por fundador y escalón (nunca se otorga dos veces). correo_enviado_at: aviso al fundador. Solo service_role.';

create table if not exists public.elenco_cartelera_usos (
  id           uuid primary key default gen_random_uuid(),
  fundador_id  uuid not null references public.elenco_fundadores (id) on delete cascade,
  destacado_id uuid not null unique references public.cartelera_destacados (id) on delete cascade,
  creado_at    timestamptz not null default now()
);

comment on table public.elenco_cartelera_usos is
  'Semanas de destacado en Cartelera aplicadas desde la recompensa de 25 puntos (cada fila, una semana). Solo service_role.';

alter table public.elenco_fundadores enable row level security;
alter table public.elenco_referidos enable row level security;
alter table public.elenco_cortesias enable row level security;
alter table public.elenco_recompensas enable row level security;
alter table public.elenco_cartelera_usos enable row level security;
revoke all on public.elenco_fundadores, public.elenco_referidos, public.elenco_cortesias,
  public.elenco_recompensas, public.elenco_cartelera_usos from anon, authenticated;
grant select, insert, update, delete on public.elenco_fundadores, public.elenco_referidos, public.elenco_cortesias,
  public.elenco_recompensas, public.elenco_cartelera_usos to service_role;

-- 2 ─────────────────────────────────────────────────────────────────────────

/** Tipos de perfil que son organización (la sala, 'teatro', tiene su propia regla). */
create or replace function public.elenco_es_organizacion(p_tipo text)
returns boolean
language sql
immutable
as $$
  select p_tipo in ('compania', 'productora', 'teatro', 'festival', 'escuela', 'institucion');
$$;

/**
 * Colegas de cada fundador, con su clase, si están activos y sus puntos.
 *   persona:      correo confirmado (verificado) + foto. 1 punto.
 *   organización: perfil completo (logo, presentación y ciudad). 3 puntos.
 *   sala:         reclamación de su ficha en Espacios Escénicos aprobada. 3 puntos.
 * Una cuenta borrada no cuenta.
 */
create or replace view public.elenco_colegas
with (security_invoker = true)
as
select r.fundador_id,
       r.profile_id,
       r.creado_at,
       p.created_at as alta,
       coalesce(nullif(btrim(p.nombre_artistico), ''), p.nombre) as nombre,
       p.tipo_perfil::text as tipo_perfil,
       c.clase,
       a.activo,
       case when a.activo then (case c.clase when 'persona' then 1 else 3 end) else 0 end as puntos
from public.elenco_referidos r
join public.profiles p on p.id = r.profile_id
cross join lateral (
  select case when p.tipo_perfil::text = 'teatro' then 'sala'
              when public.elenco_es_organizacion(p.tipo_perfil::text) then 'organizacion'
              else 'persona' end as clase
) c
cross join lateral (
  select p.deleted_at is null and case c.clase
    when 'persona' then p.verificado and coalesce(btrim(p.avatar_url), '') <> ''
    when 'organizacion' then coalesce(btrim(p.avatar_url), '') <> '' and coalesce(btrim(p.bio), '') <> '' and coalesce(btrim(p.ciudad), '') <> ''
    else exists (select 1 from public.espacios_reclamaciones er where er.profile_id = p.id and er.estado = 'aprobada')
  end as activo
) a;

comment on view public.elenco_colegas is
  'Elenco Fundador: colegas referidos, si están activos y sus puntos. Calculado siempre a partir de los datos reales. Solo service_role.';

revoke all on public.elenco_colegas from anon, authenticated;
grant select on public.elenco_colegas to service_role;

/** Puntos de un fundador: suma de los de sus colegas activos. */
create or replace function public.elenco_puntos(p_fundador uuid)
returns integer
language sql
stable
security definer
set search_path = 'public'
as $$
  select coalesce(sum(puntos), 0)::int from public.elenco_colegas where fundador_id = p_fundador;
$$;

-- 3 ─────────────────────────────────────────────────────────────────────────

/** Plan de base del programa según el tipo de fundador. */
create or replace function public.elenco_plan_base(p_tipo text)
returns text
language sql
immutable
as $$
  select case p_tipo when 'organizacion' then 'empresas' else 'premium' end;
$$;

/** Plan del Elenco vigente ahora para un perfil, o null. */
create or replace function public.plan_elenco_vigente(p_perfil uuid)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select c.plan from public.elenco_cortesias c
  where c.profile_id = p_perfil and c.desde <= now() and c.hasta > now()
  order by public.plan_rango(c.plan) desc
  limit 1;
$$;

/**
 * Plan que le corresponde ahora a un perfil: el mayor entre su suscripción de
 * pago (plan_tras_cortesia), su cortesía de Embajador vigente y su tramo del
 * Elenco vigente.
 */
create or replace function public.elenco_plan_objetivo(p_perfil uuid)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select x.plan from (
    select public.plan_tras_cortesia(p_perfil) as plan
    union all
    select m.plan from public.membresias_cortesia m
      where m.profile_id = p_perfil and m.hasta > now() and m.renunciada_at is null
    union all
    select public.plan_elenco_vigente(p_perfil)
  ) x
  where x.plan is not null
  order by public.plan_rango(x.plan) desc
  limit 1;
$$;

/**
 * Suelo del Elenco: el plan de un perfil no baja nunca por debajo de su tramo
 * vigente del Elenco, lo cambie quien lo cambie (webhook de Stripe, fin de una
 * cortesía de Embajador…). Sin tramo vigente no hace nada.
 */
create or replace function public.profiles_suelo_elenco()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare v_plan text := public.plan_elenco_vigente(new.id);
begin
  if v_plan is not null and public.plan_rango(new.plan::text) < public.plan_rango(v_plan) then
    new.plan := v_plan::public.plan_suscripcion;
    new.is_premium := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_suelo_elenco on public.profiles;
create trigger profiles_suelo_elenco
  before update of plan on public.profiles
  for each row when (new.plan is distinct from old.plan)
  execute function public.profiles_suelo_elenco();

/**
 * Aplica al perfil los tramos que han empezado o terminado: al empezar, sube el
 * plan (subir_plan, nunca baja); al terminar, lo deja en el que le corresponda
 * (elenco_plan_objetivo). Mismo esquema que expirar_cortesias de Embajadores.
 */
create or replace function public.elenco_aplicar(p_perfil uuid)
returns void
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare r record;
begin
  if exists (select 1 from public.elenco_cortesias
             where profile_id = p_perfil and not fin_aplicado and hasta <= now()) then
    update public.elenco_cortesias set fin_aplicado = true, inicio_aplicado = true
    where profile_id = p_perfil and not fin_aplicado and hasta <= now();
    update public.profiles p
    set plan = o.plan::public.plan_suscripcion, is_premium = (o.plan <> 'gratuito'), updated_at = now()
    from (select public.elenco_plan_objetivo(p_perfil) as plan) o
    where p.id = p_perfil and p.plan::text <> o.plan;
  end if;

  for r in select id, plan from public.elenco_cortesias
           where profile_id = p_perfil and not inicio_aplicado and desde <= now() and hasta > now()
           for update loop
    perform public.subir_plan(p_perfil, r.plan);
    update public.elenco_cortesias set inicio_aplicado = true where id = r.id;
  end loop;
end;
$$;

/**
 * Añade un tramo de cortesía sin recortar ni sustituir el tiempo que ya tenga:
 * empieza cuando termina su tiempo de igual o mayor plan (o ahora), y el
 * tiempo de plan inferior posterior se aplaza esa misma duración.
 * p_duracion null: para siempre.
 */
create or replace function public.elenco_insertar_tramo(p_fundador uuid, p_perfil uuid, p_motivo text, p_plan text, p_duracion interval)
returns void
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_ahora  timestamptz := now();
  v_inicio timestamptz;
  r        record;
begin
  perform 1 from public.profiles where id = p_perfil for update;

  select greatest(v_ahora, coalesce(max(hasta), v_ahora)) into v_inicio
  from public.elenco_cortesias
  where profile_id = p_perfil and hasta > v_ahora and public.plan_rango(plan) >= public.plan_rango(p_plan);

  -- Ya tiene ese plan (o uno mayor) para siempre: no hay tiempo que añadir.
  if v_inicio = 'infinity'::timestamptz then return; end if;

  if p_duracion is not null then
    for r in select * from public.elenco_cortesias
             where profile_id = p_perfil and hasta > v_inicio and public.plan_rango(plan) < public.plan_rango(p_plan)
             order by desde desc for update loop
      if r.desde < v_inicio then
        update public.elenco_cortesias set hasta = v_inicio where id = r.id;
        insert into public.elenco_cortesias (fundador_id, profile_id, motivo, plan, desde, hasta)
        values (r.fundador_id, r.profile_id, r.motivo, r.plan, v_inicio + p_duracion, r.hasta + p_duracion);
      else
        update public.elenco_cortesias
        set desde = desde + p_duracion, hasta = hasta + p_duracion, inicio_aplicado = false
        where id = r.id;
      end if;
    end loop;
  end if;

  insert into public.elenco_cortesias (fundador_id, profile_id, motivo, plan, desde, hasta)
  values (p_fundador, p_perfil, p_motivo, p_plan,
          v_inicio, case when p_duracion is null then 'infinity'::timestamptz else v_inicio + p_duracion end);

  perform public.elenco_aplicar(p_perfil);
end;
$$;

-- 4 ─────────────────────────────────────────────────────────────────────────

/**
 * Revisa la escalera de un fundador con sus puntos actuales y otorga los
 * escalones nuevos (cada uno una sola vez, por la clave única):
 *   5:  +3 meses del plan de base.
 *   10: +1 año del plan de base (y aparece en /elenco-fundador).
 *   25: +1 año de Destacado (persona) o Empresas (organización), marca
 *       «destacado»; las organizaciones, 4 semanas de destacado en Cartelera.
 *   50: Miembro de Honor: plan de base para siempre.
 * Devuelve cuántos escalones nuevos ha otorgado.
 */
create or replace function public.elenco_revisar(p_fundador uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  f        public.elenco_fundadores%rowtype;
  v_puntos integer;
  v_esc    integer;
  v_id     uuid;
  v_base   text;
  n        integer := 0;
begin
  select * into f from public.elenco_fundadores
  where id = p_fundador and estado = 'aceptada' and aceptada_por is not null
  for update;
  if f.id is null then return 0; end if;

  v_puntos := public.elenco_puntos(f.id);
  v_base := public.elenco_plan_base(f.tipo);

  foreach v_esc in array array[5, 10, 25, 50] loop
    exit when v_puntos < v_esc;
    v_id := null;
    insert into public.elenco_recompensas (fundador_id, escalon, puntos, semanas_cartelera)
    values (f.id, v_esc, v_puntos, case when v_esc = 25 and f.tipo = 'organizacion' then 4 else 0 end)
    on conflict (fundador_id, escalon) do nothing
    returning id into v_id;
    continue when v_id is null;
    n := n + 1;
    perform public.elenco_insertar_tramo(f.id, f.aceptada_por, 'escalon_' || v_esc,
      case when v_esc = 25 and f.tipo = 'persona' then 'destacado' else v_base end,
      case v_esc when 5 then interval '3 months' when 50 then null else interval '12 months' end);
  end loop;
  return n;
end;
$$;

/** Tarea diaria: revisa la escalera de todos los fundadores y aplica los tramos que empiezan o terminan. */
create or replace function public.elenco_revisar_todos()
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
  for r in select id from public.elenco_fundadores where estado = 'aceptada' and aceptada_por is not null loop
    n := n + public.elenco_revisar(r.id);
  end loop;
  for r in select distinct profile_id from public.elenco_cortesias
           where (not fin_aplicado and hasta <= now()) or (not inicio_aplicado and desde <= now()) loop
    perform public.elenco_aplicar(r.profile_id);
  end loop;
  return n;
end;
$$;

/** Comprobación inmediata cuando cambia algo que puede activar a un colega. Nunca bloquea el cambio. */
create or replace function public.elenco_revisar_colega()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_perfil   uuid;
  v_fundador uuid;
begin
  -- Cada rama solo lee el campo de su tabla (profiles.id / espacios_reclamaciones.profile_id).
  if tg_table_name = 'profiles' then v_perfil := new.id; else v_perfil := new.profile_id; end if;
  select fundador_id into v_fundador from public.elenco_referidos where profile_id = v_perfil;
  if v_fundador is not null then
    perform public.elenco_revisar(v_fundador);
  end if;
  return null;
exception when others then
  raise warning 'elenco_revisar_colega: %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists profiles_elenco_colega on public.profiles;
create trigger profiles_elenco_colega
  after update of avatar_url, bio, ciudad, verificado, tipo_perfil, deleted_at on public.profiles
  for each row execute function public.elenco_revisar_colega();

drop trigger if exists espacios_reclamaciones_elenco_colega on public.espacios_reclamaciones;
create trigger espacios_reclamaciones_elenco_colega
  after insert or update of estado on public.espacios_reclamaciones
  for each row when (new.estado = 'aprobada')
  execute function public.elenco_revisar_colega();

-- 5 ─────────────────────────────────────────────────────────────────────────

/** Siguiente número libre (001–100) y alta de la invitación. Error 'sin_plazas' si están las 100. */
create or replace function public.elenco_crear_invitacion(
  p_nombre text, p_tipo text, p_oficio text, p_telefono text, p_email text, p_nota text)
returns table (id uuid, numero smallint, token text)
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_numero smallint;
  v_id     uuid;
  v_token  text;
begin
  lock table public.elenco_fundadores in share row exclusive mode;
  select g::smallint into v_numero
  from generate_series(1, 100) g
  where not exists (select 1 from public.elenco_fundadores f where f.numero = g and f.estado <> 'anulada')
  order by g limit 1;
  if v_numero is null then raise exception 'sin_plazas'; end if;

  insert into public.elenco_fundadores as f (numero, nombre, tipo, oficio, telefono, email, nota)
  values (v_numero, btrim(p_nombre), p_tipo, btrim(p_oficio), nullif(btrim(p_telefono), ''), nullif(btrim(p_email), ''), nullif(btrim(p_nota), ''))
  returning f.id, f.token into v_id, v_token;

  id := v_id; numero := v_numero; token := v_token;
  return next;
end;
$$;

/** Lo que enseña la página de una invitación (el token es el secreto). */
create or replace function public.elenco_invitacion_publica(p_token text)
returns table (nombre text, tipo text, oficio text, numero smallint, estado text)
language sql
stable
security definer
set search_path = 'public'
as $$
  select f.nombre, f.tipo, f.oficio, f.numero, f.estado
  from public.elenco_fundadores f
  where f.token = p_token;
$$;

/**
 * Acepta una invitación con la sesión de quien llama: su cuenta (nueva o ya
 * existente) pasa a ser fundadora. Si llegó por el enlace de otro fundador,
 * esa atribución no cambia. Devuelve 'ok' | 'no_valida' | 'usada' | 'ya_fundador'.
 */
create or replace function public.aceptar_invitacion_elenco(p_token text)
returns text
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_inv public.elenco_fundadores%rowtype;
begin
  if v_yo is null then return 'no_valida'; end if;
  select * into v_inv from public.elenco_fundadores where token = p_token for update;
  if v_inv.id is null or v_inv.estado = 'anulada' then return 'no_valida'; end if;
  if v_inv.estado = 'aceptada' then
    return case when v_inv.aceptada_por = v_yo then 'ok' else 'usada' end;
  end if;
  if exists (select 1 from public.elenco_fundadores where aceptada_por = v_yo) then return 'ya_fundador'; end if;

  update public.elenco_fundadores
  set estado = 'aceptada', aceptada_por = v_yo, aceptada_at = now()
  where id = v_inv.id;
  return 'ok';
end;
$$;

/**
 * Atribuye una cuenta recién creada al fundador de un enlace /elenco/<nº>.
 * Solo al registrarse (cuenta de menos de un día), una vez por cuenta y nunca
 * a sí mismo. Devuelve 'ok' | 'no_valido' | 'no_aplica' | 'ya_atribuida'.
 */
create or replace function public.elenco_atribuir(p_perfil uuid, p_numero integer)
returns text
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare v_f public.elenco_fundadores%rowtype;
begin
  select * into v_f from public.elenco_fundadores
  where numero = p_numero and estado = 'aceptada' and aceptada_por is not null;
  if v_f.id is null then return 'no_valido'; end if;
  if v_f.aceptada_por = p_perfil
     or not exists (select 1 from public.profiles where id = p_perfil and created_at > now() - interval '1 day') then
    return 'no_aplica';
  end if;
  insert into public.elenco_referidos (profile_id, fundador_id) values (p_perfil, v_f.id)
  on conflict (profile_id) do nothing;
  return case when found then 'ok' else 'ya_atribuida' end;
end;
$$;

/** El fundador activa su bono de bienvenida. 'ok' | 'no_fundador' | 'ya_activado' | 'caducado'. */
create or replace function public.elenco_activar_bono()
returns text
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  f public.elenco_fundadores%rowtype;
begin
  select * into f from public.elenco_fundadores where aceptada_por = v_yo and estado = 'aceptada' for update;
  if f.id is null then return 'no_fundador'; end if;
  if f.bono_activado_at is not null then return 'ya_activado'; end if;
  if now() > f.aceptada_at + interval '12 months' then return 'caducado'; end if;
  update public.elenco_fundadores set bono_activado_at = now() where id = f.id;
  perform public.elenco_insertar_tramo(f.id, v_yo, 'bono', public.elenco_plan_base(f.tipo), interval '3 months');
  return 'ok';
end;
$$;

/** El bloque «Tu elenco» de quien llama. Vacío si no es fundador. */
create or replace function public.mi_elenco()
returns table (
  numero smallint, tipo text, aceptada_at timestamptz,
  bono_estado text, bono_limite timestamptz, bono_desde timestamptz, bono_hasta timestamptz,
  registrados integer, activos integer, puntos integer, escalon integer, semanas_cartelera integer,
  plan_vigente text, cortesia_hasta timestamptz)
language sql
stable
security definer
set search_path = 'public'
as $$
  select f.numero, f.tipo, f.aceptada_at,
         case
           when f.bono_activado_at is null and now() > f.aceptada_at + interval '12 months' then 'caducado'
           when f.bono_activado_at is null then 'disponible'
           when b.hasta > now() then 'activo'
           else 'usado'
         end,
         f.aceptada_at + interval '12 months', b.desde, b.hasta,
         (select count(*)::int from public.elenco_colegas c where c.fundador_id = f.id),
         (select count(*)::int from public.elenco_colegas c where c.fundador_id = f.id and c.activo),
         public.elenco_puntos(f.id),
         coalesce((select max(escalon)::int from public.elenco_recompensas r where r.fundador_id = f.id), 0),
         coalesce((select sum(semanas_cartelera)::int from public.elenco_recompensas r where r.fundador_id = f.id), 0)
           - (select count(*)::int from public.elenco_cartelera_usos u where u.fundador_id = f.id),
         public.plan_elenco_vigente(f.aceptada_por),
         (select max(c.hasta) from public.elenco_cortesias c where c.profile_id = f.aceptada_por and c.hasta > now())
  from public.elenco_fundadores f
  left join lateral (
    select min(c.desde) as desde, max(c.hasta) as hasta
    from public.elenco_cortesias c where c.fundador_id = f.id and c.motivo = 'bono'
  ) b on true
  where f.aceptada_por = auth.uid() and f.estado = 'aceptada';
$$;

/** Distintivo público «Elenco Fundador nº 007»: de una lista de perfiles, los fundadores y su número. */
create or replace function public.elenco_distintivos(p_perfiles uuid[])
returns table (profile_id uuid, numero smallint)
language sql
stable
security definer
set search_path = 'public'
as $$
  select f.aceptada_por, f.numero from public.elenco_fundadores f
  where f.aceptada_por = any (p_perfiles) and f.estado = 'aceptada';
$$;

/** Página pública /elenco/<nº>: quién invita. Nada si la plaza no tiene fundador. */
create or replace function public.elenco_fundador_publico(p_numero integer)
returns table (numero smallint, nombre text, slug text)
language sql
stable
security definer
set search_path = 'public'
as $$
  select f.numero, coalesce(nullif(btrim(p.nombre_artistico), ''), p.nombre),
         case when p.perfil_publico and p.deleted_at is null then p.slug end
  from public.elenco_fundadores f
  join public.profiles p on p.id = f.aceptada_por
  where f.numero = p_numero and f.estado = 'aceptada';
$$;

/** Página pública /elenco-fundador: fundadores con escalón 10 o más (destacados: 25 o más). */
create or replace function public.elenco_publico()
returns table (numero smallint, nombre text, slug text, avatar_url text, tipo text, escalon integer)
language sql
stable
security definer
set search_path = 'public'
as $$
  select f.numero, coalesce(nullif(btrim(p.nombre_artistico), ''), p.nombre), p.slug, p.avatar_url, f.tipo, r.escalon
  from public.elenco_fundadores f
  join public.profiles p on p.id = f.aceptada_por
  join lateral (select max(escalon)::int as escalon from public.elenco_recompensas where fundador_id = f.id) r on true
  where f.estado = 'aceptada' and r.escalon >= 10 and p.perfil_publico and p.deleted_at is null
  order by r.escalon desc, f.numero;
$$;

revoke all on function public.elenco_puntos(uuid) from public, anon, authenticated;
revoke all on function public.plan_elenco_vigente(uuid) from public, anon, authenticated;
revoke all on function public.elenco_plan_objetivo(uuid) from public, anon, authenticated;
revoke all on function public.elenco_aplicar(uuid) from public, anon, authenticated;
revoke all on function public.elenco_insertar_tramo(uuid, uuid, text, text, interval) from public, anon, authenticated;
revoke all on function public.elenco_revisar(uuid) from public, anon, authenticated;
revoke all on function public.elenco_revisar_todos() from public, anon, authenticated;
revoke all on function public.elenco_crear_invitacion(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.elenco_atribuir(uuid, integer) from public, anon, authenticated;
revoke all on function public.elenco_invitacion_publica(text) from public;
revoke all on function public.aceptar_invitacion_elenco(text) from public;
revoke all on function public.elenco_activar_bono() from public;
revoke all on function public.mi_elenco() from public;
revoke all on function public.elenco_distintivos(uuid[]) from public;
revoke all on function public.elenco_fundador_publico(integer) from public;
revoke all on function public.elenco_publico() from public;

grant execute on function public.elenco_puntos(uuid) to service_role;
grant execute on function public.plan_elenco_vigente(uuid) to service_role;
grant execute on function public.elenco_revisar(uuid) to service_role;
grant execute on function public.elenco_revisar_todos() to service_role;
grant execute on function public.elenco_crear_invitacion(text, text, text, text, text, text) to service_role;
grant execute on function public.elenco_atribuir(uuid, integer) to service_role;
grant execute on function public.elenco_invitacion_publica(text) to anon, authenticated;
grant execute on function public.aceptar_invitacion_elenco(text) to authenticated;
grant execute on function public.elenco_activar_bono() to authenticated;
grant execute on function public.mi_elenco() to authenticated;
grant execute on function public.elenco_distintivos(uuid[]) to anon, authenticated;
grant execute on function public.elenco_fundador_publico(integer) to anon, authenticated;
grant execute on function public.elenco_publico() to anon, authenticated;

select cron.schedule(
  'elenco-revisar',
  '20 3 * * *',
  $job$select public.elenco_revisar_todos();$job$
);
