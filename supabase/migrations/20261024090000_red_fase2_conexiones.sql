-- Red profesional · Fase 2 (A): conexiones y Mi red.
--
-- 1. public.conexiones: relación profesional mutua. Una persona la solicita
--    (con mensaje opcional) y la otra acepta o rechaza. Es distinta de
--    «Seguir» (profile_follows, en un solo sentido y sin aceptación) y de la
--    solicitud de teléfono y WhatsApp (solicitudes_contacto): conectar NO
--    comparte el teléfono; se sigue pidiendo aparte.
--    Un par de perfiles tiene como mucho una fila, en cualquiera de los dos
--    sentidos (índice único sobre el par ordenado).
-- 2. Funciones SECURITY DEFINER, mismo modelo que la Fase 1: la tabla solo se
--    lee directamente por sus dos partes y solo se escribe con las funciones.
--    estado_conexion, solicitar_conexion, responder_conexion,
--    cancelar_conexion, eliminar_conexion, mis_conexiones y
--    mis_seguimientos (seguidores y seguidos con nombre y foto, para Mi red).
--    Quien solicitó nunca ve «rechazada»: se le sigue mostrando como enviada.

-- 1 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.conexiones (
  id           uuid primary key default gen_random_uuid(),
  solicitante  uuid not null references public.profiles (id) on delete cascade,
  destinatario uuid not null references public.profiles (id) on delete cascade,
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  mensaje      text check (mensaje is null or length(mensaje) <= 300),
  created_at   timestamptz not null default now(),
  resuelta_at  timestamptz,
  constraint conexiones_no_a_si_mismo check (solicitante <> destinatario)
);

create unique index if not exists conexiones_par_uniq
  on public.conexiones (least(solicitante, destinatario), greatest(solicitante, destinatario));
create index if not exists conexiones_destinatario_idx on public.conexiones (destinatario, estado);
create index if not exists conexiones_solicitante_idx on public.conexiones (solicitante, estado);

comment on table public.conexiones is
  'Conexiones profesionales (solicitud y aceptación). No comparten el teléfono: eso va por solicitudes_contacto.';

alter table public.conexiones enable row level security;
drop policy if exists "Las dos partes ven su conexión" on public.conexiones;
create policy "Las dos partes ven su conexión" on public.conexiones
  for select to authenticated
  using (
    destinatario = (select auth.uid())
    or (solicitante = (select auth.uid()) and estado <> 'rechazada')
  );

revoke all on public.conexiones from anon, authenticated;
grant select on public.conexiones to authenticated;

-- 2 ─────────────────────────────────────────────────────────────────────────

/**
 * Estado de la conexión entre quien mira y un perfil:
 * 'anonimo' | 'propio' | 'conectados' | 'enviada' | 'recibida' | 'ninguna'.
 * solicitud: id de la solicitud recibida (para aceptarla desde la ficha).
 */
create or replace function public.estado_conexion(p_perfil uuid)
returns table (estado text, solicitud uuid)
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_c public.conexiones%rowtype;
begin
  if v_yo is null then
    return query select 'anonimo'::text, null::uuid; return;
  end if;
  if v_yo = p_perfil then
    return query select 'propio'::text, null::uuid; return;
  end if;

  select * into v_c from public.conexiones c
  where least(c.solicitante, c.destinatario) = least(v_yo, p_perfil)
    and greatest(c.solicitante, c.destinatario) = greatest(v_yo, p_perfil);

  if v_c.id is null then
    return query select 'ninguna'::text, null::uuid;
  elsif v_c.estado = 'aceptada' then
    return query select 'conectados'::text, null::uuid;
  elsif v_c.solicitante = v_yo then
    -- Pendiente o rechazada: para quien la pidió, siempre «enviada».
    return query select 'enviada'::text, null::uuid;
  elsif v_c.estado = 'pendiente' then
    return query select 'recibida'::text, v_c.id;
  else
    -- La rechacé yo: puedo volver a conectar si cambio de opinión.
    return query select 'ninguna'::text, null::uuid;
  end if;
end;
$$;

/**
 * Solicita conectar con un perfil. Devuelve:
 * 'nueva' (creada; hay que avisar), 'aceptada' (esa persona ya me lo había
 * pedido: queda aceptada y hay que avisarla), 'existente', 'limite' o
 * 'no_disponible'.
 */
create or replace function public.solicitar_conexion(p_perfil uuid, p_mensaje text default null)
returns text
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_c public.conexiones%rowtype;
  v_id uuid;
begin
  if v_yo is null or v_yo = p_perfil or not public.perfil_contactable(p_perfil) then
    return 'no_disponible';
  end if;
  if not exists (select 1 from public.profiles where id = v_yo and activo and deleted_at is null and extincion_solicitada_at is null) then
    return 'no_disponible';
  end if;

  select * into v_c from public.conexiones c
  where least(c.solicitante, c.destinatario) = least(v_yo, p_perfil)
    and greatest(c.solicitante, c.destinatario) = greatest(v_yo, p_perfil);

  if v_c.id is not null then
    -- Me lo había pedido (o se lo rechacé antes): conectar ahora lo acepta.
    if v_c.destinatario = v_yo and v_c.estado <> 'aceptada' then
      update public.conexiones set estado = 'aceptada', resuelta_at = now() where id = v_c.id;
      return 'aceptada';
    end if;
    return 'existente';
  end if;

  -- Antispam: 20 solicitudes nuevas al día por usuario.
  if (select count(*) from public.conexiones
      where solicitante = v_yo and created_at > now() - interval '1 day') >= 20 then
    return 'limite';
  end if;

  insert into public.conexiones (solicitante, destinatario, mensaje)
  values (v_yo, p_perfil, nullif(left(trim(coalesce(p_mensaje, '')), 300), ''))
  on conflict do nothing
  returning id into v_id;

  return case when v_id is null then 'existente' else 'nueva' end;
end;
$$;

/** El destinatario acepta o rechaza una solicitud pendiente. */
create or replace function public.responder_conexion(p_id uuid, p_aceptar boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
begin
  update public.conexiones
  set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
      resuelta_at = now()
  where id = p_id and destinatario = auth.uid() and estado = 'pendiente';
  return found;
end;
$$;

/** Quien pidió retira su solicitud mientras sigue pendiente. */
create or replace function public.cancelar_conexion(p_perfil uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
begin
  delete from public.conexiones
  where solicitante = auth.uid() and destinatario = p_perfil and estado = 'pendiente';
  return found;
end;
$$;

/** Cualquiera de las dos partes deshace una conexión aceptada. */
create or replace function public.eliminar_conexion(p_perfil uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
begin
  delete from public.conexiones
  where estado = 'aceptada'
    and ((solicitante = auth.uid() and destinatario = p_perfil)
      or (destinatario = auth.uid() and solicitante = p_perfil));
  return found;
end;
$$;

/**
 * Mi red: mis conexiones (aceptadas y solicitudes recibidas y enviadas), con
 * nombre y foto de la otra parte. Las rechazadas no salen: a quien las pidió
 * se le muestran como enviadas; a quien las rechazó, no se le vuelven a mostrar.
 */
create or replace function public.mis_conexiones()
returns table (
  id uuid, direccion text, estado text, mensaje text, created_at timestamptz,
  otro_id uuid, otro_nombre text, otro_slug text, otro_avatar text, otro_publico boolean
)
language sql
stable
security definer
set search_path = 'public'
as $$
  select c.id,
         case when c.destinatario = auth.uid() then 'recibida' else 'enviada' end,
         case when c.solicitante = auth.uid() and c.estado = 'rechazada' then 'pendiente' else c.estado end,
         case when c.destinatario = auth.uid() and c.estado = 'pendiente' then c.mensaje end,
         coalesce(c.resuelta_at, c.created_at),
         p.id,
         coalesce(nullif(trim(p.nombre_artistico), ''), nullif(trim(concat_ws(' ', p.nombre, p.apellidos)), ''), 'Perfil'),
         p.slug, p.avatar_url,
         (p.perfil_publico and p.verificado and p.activo and p.deleted_at is null and p.extincion_solicitada_at is null)
  from public.conexiones c
  join public.profiles p on p.id = case when c.destinatario = auth.uid() then c.solicitante else c.destinatario end
  where auth.uid() is not null
    and (c.destinatario = auth.uid() or c.solicitante = auth.uid())
    and not (c.destinatario = auth.uid() and c.estado = 'rechazada')
    and p.deleted_at is null and p.identidad_extinguida_at is null
  order by (c.estado = 'pendiente' and c.destinatario = auth.uid()) desc, coalesce(c.resuelta_at, c.created_at) desc
  limit 1000;
$$;

/** Mi red: quién me sigue y a quién sigo, con nombre y foto. Solo para el titular. */
create or replace function public.mis_seguimientos()
returns table (
  direccion text, created_at timestamptz,
  otro_id uuid, otro_nombre text, otro_slug text, otro_avatar text, otro_publico boolean
)
language sql
stable
security definer
set search_path = 'public'
as $$
  select case when f.following_id = auth.uid() then 'seguidor' else 'siguiendo' end,
         f.created_at,
         p.id,
         coalesce(nullif(trim(p.nombre_artistico), ''), nullif(trim(concat_ws(' ', p.nombre, p.apellidos)), ''), 'Perfil'),
         p.slug, p.avatar_url,
         (p.perfil_publico and p.verificado and p.activo and p.deleted_at is null and p.extincion_solicitada_at is null)
  from public.profile_follows f
  join public.profiles p on p.id = case when f.following_id = auth.uid() then f.follower_id else f.following_id end
  where auth.uid() is not null
    and (f.following_id = auth.uid() or f.follower_id = auth.uid())
    and p.deleted_at is null and p.identidad_extinguida_at is null
  order by f.created_at desc
  limit 2000;
$$;

revoke all on function public.estado_conexion(uuid) from public;
revoke all on function public.solicitar_conexion(uuid, text) from public;
revoke all on function public.responder_conexion(uuid, boolean) from public;
revoke all on function public.cancelar_conexion(uuid) from public;
revoke all on function public.eliminar_conexion(uuid) from public;
revoke all on function public.mis_conexiones() from public;
revoke all on function public.mis_seguimientos() from public;

grant execute on function public.estado_conexion(uuid) to anon, authenticated;
grant execute on function public.solicitar_conexion(uuid, text) to authenticated;
grant execute on function public.responder_conexion(uuid, boolean) to authenticated;
grant execute on function public.cancelar_conexion(uuid) to authenticated;
grant execute on function public.eliminar_conexion(uuid) to authenticated;
grant execute on function public.mis_conexiones() to authenticated;
grant execute on function public.mis_seguimientos() to authenticated;
