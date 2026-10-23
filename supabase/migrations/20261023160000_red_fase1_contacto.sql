-- Red profesional · Fase 1: contacto y permisos.
--
-- 1. Cierre de fuga: profiles.email y profiles.phone dejan de poder leerse con
--    la clave pública (anon) o con cualquier sesión (authenticated). Hasta hoy
--    la política «perfil público» devolvía TODAS las columnas, correo incluido.
--    Se retira el SELECT de tabla y se concede SELECT por columnas, todas salvo
--    esas dos. El servidor (service_role) y las funciones SECURITY DEFINER las
--    siguen leyendo.
--    OJO: con permisos por columnas, una columna NUEVA en profiles no será
--    legible para anon/authenticated hasta que se añada aquí con un
--    «grant select (columna) on public.profiles to anon, authenticated».
-- 2. public.perfil_contacto: correo de contacto (público si el titular lo
--    elige), teléfono y WhatsApp. Solo el titular lee y escribe su fila.
-- 3. public.solicitudes_contacto: el teléfono y el WhatsApp nunca se ven
--    directamente; otro usuario los pide y el titular acepta o rechaza.
--    La solicitud aceptada da acceso a quien la pidió (en un sentido).
-- 4. Funciones SECURITY DEFINER: contacto_de, solicitar_contacto,
--    responder_solicitud_contacto, cancelar_solicitud_contacto,
--    mis_solicitudes_contacto.

-- 1 ─────────────────────────────────────────────────────────────────────────
revoke select on public.profiles from anon, authenticated;
grant select (
  id, nombre, apellidos, nombre_artistico, tipo_perfil, pais, ciudad, idioma, plan,
  acepta_terminos, acepta_privacidad, mayor_de_edad, info_veraz,
  marketing_general, marketing_comercial, verificado, perfil_publico, activo,
  scenaia_analisis, scenaia_recomendaciones, created_at, updated_at, slug, bio,
  avatar_url, cover_url, is_premium, deleted_at, country_code, region, postal_code,
  website_url, social_links, welcome_email_sent_at, extincion_solicitada_at,
  identidad_extinguida_at, verificado_profesional
) on public.profiles to anon, authenticated;

-- 2 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.perfil_contacto (
  profile_id    uuid primary key references public.profiles (id) on delete cascade,
  email         text check (email is null or (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  email_publico boolean not null default false,
  telefono      text check (telefono is null or telefono ~ '^\+?[0-9 ().-]{6,24}$'),
  whatsapp      text check (whatsapp is null or whatsapp ~ '^\+?[0-9 ().-]{6,24}$'),
  updated_at    timestamptz not null default now()
);

comment on table public.perfil_contacto is
  'Datos de contacto del perfil. Solo el titular los lee directamente; el resto, vía contacto_de().';

alter table public.perfil_contacto enable row level security;
drop policy if exists "Titular gestiona su contacto" on public.perfil_contacto;
create policy "Titular gestiona su contacto" on public.perfil_contacto
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

revoke all on public.perfil_contacto from anon;
grant select, insert, update, delete on public.perfil_contacto to authenticated;

-- Nadie tenía teléfono en profiles (0 de 46 al escribir esto); por si acaso.
insert into public.perfil_contacto (profile_id, telefono)
select id, trim(phone) from public.profiles
where phone is not null and trim(phone) ~ '^\+?[0-9 ().-]{6,24}$'
on conflict (profile_id) do nothing;

-- 3 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.solicitudes_contacto (
  id           uuid primary key default gen_random_uuid(),
  solicitante  uuid not null references public.profiles (id) on delete cascade,
  destinatario uuid not null references public.profiles (id) on delete cascade,
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  mensaje      text check (mensaje is null or length(mensaje) <= 300),
  created_at   timestamptz not null default now(),
  resuelta_at  timestamptz,
  constraint solicitudes_contacto_par_uniq unique (solicitante, destinatario),
  constraint solicitudes_contacto_no_a_si_mismo check (solicitante <> destinatario)
);

create index if not exists solicitudes_contacto_destinatario_idx
  on public.solicitudes_contacto (destinatario, estado);

alter table public.solicitudes_contacto enable row level security;
-- Solo lectura para las dos partes; escribir, solo con las funciones.
-- Quien pidió nunca ve «rechazada»: contacto_de() se la muestra como pendiente.
drop policy if exists "Destinatario ve sus solicitudes" on public.solicitudes_contacto;
create policy "Destinatario ve sus solicitudes" on public.solicitudes_contacto
  for select to authenticated
  using (destinatario = (select auth.uid()));

revoke all on public.solicitudes_contacto from anon, authenticated;
grant select on public.solicitudes_contacto to authenticated;

-- 4 ─────────────────────────────────────────────────────────────────────────
create or replace function public.perfil_contactable(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1 from public.profiles
    where id = p_perfil and perfil_publico and verificado and activo
      and deleted_at is null and extincion_solicitada_at is null
  );
$$;

/**
 * Lo que quien mira puede ver del contacto de un perfil.
 * estado: 'propio' | 'aceptada' | 'pendiente' | 'ninguna' | 'anonimo'
 * (una solicitud rechazada se le muestra a quien la pidió como 'pendiente').
 * tiene_privado: el perfil tiene teléfono o WhatsApp que se pueden pedir.
 */
create or replace function public.contacto_de(p_perfil uuid)
returns table (email text, telefono text, whatsapp text, estado text, tiene_privado boolean)
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_c public.perfil_contacto%rowtype;
  v_sol text;
  v_estado text;
  v_ve boolean;
begin
  if v_yo is distinct from p_perfil and not public.perfil_contactable(p_perfil) then
    return;
  end if;

  select * into v_c from public.perfil_contacto c where c.profile_id = p_perfil;

  if v_yo is null then
    v_estado := 'anonimo';
  elsif v_yo = p_perfil then
    v_estado := 'propio';
  else
    select s.estado into v_sol from public.solicitudes_contacto s
    where s.solicitante = v_yo and s.destinatario = p_perfil;
    v_estado := case v_sol when 'aceptada' then 'aceptada'
                           when 'pendiente' then 'pendiente'
                           when 'rechazada' then 'pendiente'
                           else 'ninguna' end;
  end if;

  v_ve := v_estado in ('propio', 'aceptada');

  return query select
    case when v_c.email_publico or v_ve then v_c.email end,
    case when v_ve then v_c.telefono end,
    case when v_ve then v_c.whatsapp end,
    v_estado,
    coalesce(nullif(trim(v_c.telefono), ''), nullif(trim(v_c.whatsapp), '')) is not null;
end;
$$;

/**
 * Pide el contacto privado de un perfil. Devuelve:
 * 'nueva' (se ha creado y hay que avisar), 'existente', 'limite', 'no_disponible'.
 */
create or replace function public.solicitar_contacto(p_perfil uuid, p_mensaje text default null)
returns text
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_id uuid;
begin
  if v_yo is null or v_yo = p_perfil or not public.perfil_contactable(p_perfil) then
    return 'no_disponible';
  end if;
  if not exists (select 1 from public.profiles where id = v_yo and activo and deleted_at is null and extincion_solicitada_at is null) then
    return 'no_disponible';
  end if;

  if exists (select 1 from public.solicitudes_contacto where solicitante = v_yo and destinatario = p_perfil) then
    return 'existente';
  end if;

  -- Antispam: 20 solicitudes nuevas al día por usuario.
  if (select count(*) from public.solicitudes_contacto
      where solicitante = v_yo and created_at > now() - interval '1 day') >= 20 then
    return 'limite';
  end if;

  insert into public.solicitudes_contacto (solicitante, destinatario, mensaje)
  values (v_yo, p_perfil, nullif(left(trim(coalesce(p_mensaje, '')), 300), ''))
  on conflict (solicitante, destinatario) do nothing
  returning id into v_id;

  return case when v_id is null then 'existente' else 'nueva' end;
end;
$$;

/** El destinatario acepta o rechaza (también sirve para retirar un acceso ya dado). */
create or replace function public.responder_solicitud_contacto(p_id uuid, p_aceptar boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
begin
  update public.solicitudes_contacto
  set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
      resuelta_at = now()
  where id = p_id and destinatario = auth.uid();
  return found;
end;
$$;

/** Quien pidió retira su solicitud mientras sigue pendiente. */
create or replace function public.cancelar_solicitud_contacto(p_perfil uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
begin
  delete from public.solicitudes_contacto
  where solicitante = auth.uid() and destinatario = p_perfil and estado = 'pendiente';
  return found;
end;
$$;

/**
 * «Mi red»: solicitudes recibidas y enviadas, con nombre y foto de la otra
 * parte (aunque su perfil no sea público, porque te ha escrito o le escribiste).
 * En las enviadas, una rechazada se muestra como pendiente; en las aceptadas
 * se incluye el contacto que te han dado.
 */
create or replace function public.mis_solicitudes_contacto()
returns table (
  id uuid, direccion text, estado text, mensaje text, created_at timestamptz,
  otro_id uuid, otro_nombre text, otro_slug text, otro_avatar text, otro_publico boolean,
  email text, telefono text, whatsapp text
)
language sql
stable
security definer
set search_path = 'public'
as $$
  select s.id,
         case when s.destinatario = auth.uid() then 'recibida' else 'enviada' end,
         case when s.solicitante = auth.uid() and s.estado = 'rechazada' then 'pendiente' else s.estado end,
         case when s.destinatario = auth.uid() then s.mensaje end,
         s.created_at,
         p.id,
         coalesce(nullif(trim(p.nombre_artistico), ''), nullif(trim(concat_ws(' ', p.nombre, p.apellidos)), ''), 'Perfil'),
         p.slug, p.avatar_url,
         (p.perfil_publico and p.verificado and p.activo and p.deleted_at is null and p.extincion_solicitada_at is null),
         case when s.solicitante = auth.uid() and s.estado = 'aceptada' then c.email end,
         case when s.solicitante = auth.uid() and s.estado = 'aceptada' then c.telefono end,
         case when s.solicitante = auth.uid() and s.estado = 'aceptada' then c.whatsapp end
  from public.solicitudes_contacto s
  join public.profiles p on p.id = case when s.destinatario = auth.uid() then s.solicitante else s.destinatario end
  left join public.perfil_contacto c on c.profile_id = s.destinatario
  where auth.uid() is not null
    and (s.destinatario = auth.uid() or s.solicitante = auth.uid())
    and p.deleted_at is null and p.identidad_extinguida_at is null
  order by (s.estado = 'pendiente' and s.destinatario = auth.uid()) desc, s.created_at desc
  limit 500;
$$;

revoke all on function public.perfil_contactable(uuid) from public;
revoke all on function public.contacto_de(uuid) from public;
revoke all on function public.solicitar_contacto(uuid, text) from public;
revoke all on function public.responder_solicitud_contacto(uuid, boolean) from public;
revoke all on function public.cancelar_solicitud_contacto(uuid) from public;
revoke all on function public.mis_solicitudes_contacto() from public;

grant execute on function public.contacto_de(uuid) to anon, authenticated;
grant execute on function public.solicitar_contacto(uuid, text) to authenticated;
grant execute on function public.responder_solicitud_contacto(uuid, boolean) to authenticated;
grant execute on function public.cancelar_solicitud_contacto(uuid) to authenticated;
grant execute on function public.mis_solicitudes_contacto() to authenticated;
