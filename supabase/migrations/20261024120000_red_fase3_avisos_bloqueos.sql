-- Red profesional · Fase 3 (B): avisos por correo y bloqueos.
--
-- 1. profiles.avisos_mensajes_email (por defecto true): el titular puede
--    desactivar los avisos de mensajes nuevos. Grant select por columnas.
-- 2. public.bloqueos: quien bloquea deja de recibir mensajes de esa persona.
--    A la persona bloqueada no se le avisa: para ella, el perfil simplemente
--    «no admite mensajes ahora mismo». Solo quien bloquea lee su fila;
--    escribir, solo con bloquear() / desbloquear().
-- 3. puede_escribir() comprueba los bloqueos antes que nada (también en
--    conversaciones ya abiertas). enviar_mensaje() la usa, así que el
--    bloqueo vale también para él sin tocarla.
-- 4. Avisos por correo: como mucho uno cada 6 horas por conversación y
--    destinatario. reclamar_aviso_mensaje() decide si toca avisar y lo anota
--    en la misma operación (sin carreras); el servidor envía el correo.
-- 5. mis_conversaciones() añade «bloqueado» (lo he bloqueado yo).

-- 1 ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists avisos_mensajes_email boolean not null default true;

grant select (avisos_mensajes_email) on public.profiles to anon, authenticated;

-- 2 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.bloqueos (
  bloqueador uuid not null references public.profiles (id) on delete cascade,
  bloqueado  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bloqueador, bloqueado),
  constraint bloqueos_no_a_si_mismo check (bloqueador <> bloqueado)
);

create index if not exists bloqueos_bloqueado_idx on public.bloqueos (bloqueado);

comment on table public.bloqueos is
  'Mensajería: quién ha bloqueado a quién. Solo lo lee quien bloquea; la persona bloqueada no lo sabe.';

alter table public.bloqueos enable row level security;
drop policy if exists "Quien bloquea ve sus bloqueos" on public.bloqueos;
create policy "Quien bloquea ve sus bloqueos" on public.bloqueos
  for select to authenticated
  using (bloqueador = (select auth.uid()));

revoke all on public.bloqueos from anon, authenticated;
grant select on public.bloqueos to authenticated;

create or replace function public.bloquear(p_perfil uuid)
returns boolean
language sql
volatile
security definer
set search_path = 'public'
as $$
  insert into public.bloqueos (bloqueador, bloqueado)
  select auth.uid(), p_perfil
  where auth.uid() is not null and auth.uid() <> p_perfil
    and exists (select 1 from public.profiles where id = p_perfil)
  on conflict do nothing
  returning true;
$$;

create or replace function public.desbloquear(p_perfil uuid)
returns boolean
language sql
volatile
security definer
set search_path = 'public'
as $$
  delete from public.bloqueos where bloqueador = auth.uid() and bloqueado = p_perfil
  returning true;
$$;

-- 3 ─────────────────────────────────────────────────────────────────────────

/**
 * ¿Puede quien llama escribir a este perfil? Devuelve:
 * 'si' | 'anonimo' | 'propio' | 'bloqueado' (lo he bloqueado yo) | 'plan' |
 * 'solo_contactos' | 'no_disponible' (incluye que esa persona me haya
 * bloqueado: no se le revela).
 */
create or replace function public.puede_escribir(p_perfil uuid)
returns text
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_plan text;
begin
  if v_yo is null then return 'anonimo'; end if;
  if v_yo = p_perfil then return 'propio'; end if;
  if not exists (select 1 from public.profiles where id = v_yo and activo and deleted_at is null and extincion_solicitada_at is null) then
    return 'no_disponible';
  end if;

  if exists (select 1 from public.bloqueos where bloqueador = v_yo and bloqueado = p_perfil) then
    return 'bloqueado';
  end if;
  if exists (select 1 from public.bloqueos where bloqueador = p_perfil and bloqueado = v_yo) then
    return 'no_disponible';
  end if;

  -- Conversación ya abierta: las dos partes responden siempre.
  if exists (select 1 from public.conversaciones
             where perfil_a = least(v_yo, p_perfil) and perfil_b = greatest(v_yo, p_perfil)) then
    if exists (select 1 from public.profiles where id = p_perfil and activo and deleted_at is null) then
      return 'si';
    end if;
    return 'no_disponible';
  end if;

  if not public.perfil_contactable(p_perfil) then return 'no_disponible'; end if;

  -- Contactos conectados: gratis.
  if exists (select 1 from public.conexiones c
             where c.estado = 'aceptada'
               and least(c.solicitante, c.destinatario) = least(v_yo, p_perfil)
               and greatest(c.solicitante, c.destinatario) = greatest(v_yo, p_perfil)) then
    return 'si';
  end if;

  if (select mensajes_solo_contactos from public.profiles where id = p_perfil) then
    return 'solo_contactos';
  end if;

  select plan::text into v_plan from public.profiles where id = v_yo;
  if v_plan in ('premium', 'destacado', 'empresas') then return 'si'; end if;
  return 'plan';
end;
$$;

-- 4 ─────────────────────────────────────────────────────────────────────────
alter table public.conversaciones
  add column if not exists aviso_a_at timestamptz,
  add column if not exists aviso_b_at timestamptz;

/**
 * Tras enviar un mensaje: ¿hay que avisar por correo a la otra parte?
 * Devuelve su id (y anota el aviso) si quiere avisos y no se le ha avisado
 * de esta conversación en las últimas 6 horas; si no, null.
 */
create or replace function public.reclamar_aviso_mensaje(p_conversacion uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_c public.conversaciones%rowtype;
  v_destino uuid;
begin
  select * into v_c from public.conversaciones where id = p_conversacion;
  if v_c.id is null or v_yo is null or v_yo not in (v_c.perfil_a, v_c.perfil_b) then return null; end if;

  v_destino := case when v_c.perfil_a = v_yo then v_c.perfil_b else v_c.perfil_a end;
  if not exists (select 1 from public.profiles where id = v_destino and avisos_mensajes_email and activo and deleted_at is null) then
    return null;
  end if;

  if v_destino = v_c.perfil_a then
    update public.conversaciones set aviso_a_at = now()
    where id = p_conversacion and (aviso_a_at is null or aviso_a_at < now() - interval '6 hours');
  else
    update public.conversaciones set aviso_b_at = now()
    where id = p_conversacion and (aviso_b_at is null or aviso_b_at < now() - interval '6 hours');
  end if;

  return case when found then v_destino end;
end;
$$;

-- 5 ─────────────────────────────────────────────────────────────────────────
drop function if exists public.mis_conversaciones();

/** Bandeja: mis conversaciones con la otra parte, el último mensaje, no leídos y si la he bloqueado. */
create function public.mis_conversaciones()
returns table (
  id uuid, otro_id uuid, otro_nombre text, otro_slug text, otro_avatar text, otro_publico boolean,
  ultimo_texto text, ultimo_mio boolean, ultimo_at timestamptz, sin_leer integer, bloqueado boolean
)
language sql
stable
security definer
set search_path = 'public'
as $$
  select c.id, p.id,
         coalesce(nullif(trim(p.nombre_artistico), ''), nullif(trim(concat_ws(' ', p.nombre, p.apellidos)), ''), 'Perfil'),
         p.slug, p.avatar_url,
         (p.perfil_publico and p.verificado and p.activo and p.deleted_at is null and p.extincion_solicitada_at is null),
         left(u.texto, 140), u.autor = auth.uid(), c.ultimo_mensaje_at,
         (select count(*)::int from public.mensajes m
          where m.conversacion_id = c.id and m.autor <> auth.uid() and m.leido_at is null),
         exists (select 1 from public.bloqueos b where b.bloqueador = auth.uid() and b.bloqueado = p.id)
  from public.conversaciones c
  join public.profiles p on p.id = case when c.perfil_a = auth.uid() then c.perfil_b else c.perfil_a end
  left join lateral (
    select m.texto, m.autor from public.mensajes m
    where m.conversacion_id = c.id order by m.created_at desc limit 1
  ) u on true
  where auth.uid() is not null
    and auth.uid() in (c.perfil_a, c.perfil_b)
    and p.deleted_at is null and p.identidad_extinguida_at is null
  order by c.ultimo_mensaje_at desc
  limit 500;
$$;

revoke all on function public.bloquear(uuid) from public;
revoke all on function public.desbloquear(uuid) from public;
revoke all on function public.reclamar_aviso_mensaje(uuid) from public;
revoke all on function public.mis_conversaciones() from public;

grant execute on function public.bloquear(uuid) to authenticated;
grant execute on function public.desbloquear(uuid) to authenticated;
grant execute on function public.reclamar_aviso_mensaje(uuid) to authenticated;
grant execute on function public.mis_conversaciones() to authenticated;
