-- Red profesional · Fase 3 (A): mensajería.
--
-- Reglas (todas comprobadas aquí, no solo en la pantalla):
--   · Entre contactos conectados (conexiones aceptada): gratis.
--   · A quien no es contacto: solo con plan de pago (premium, destacado,
--     empresas), y solo si esa persona no ha limitado sus mensajes a sus
--     contactos (profiles.mensajes_solo_contactos).
--   · Una vez abierta la conversación, las dos partes pueden responder,
--     aunque quien responde tenga plan gratuito.
--   · Antispam: 10 conversaciones nuevas al día con personas que no son
--     contactos, y 60 mensajes por hora.
--
-- 1. profiles.mensajes_solo_contactos (por defecto false). La casilla para
--    cambiarlo llega en la Fase 3 (B). Grant select por columnas (Fase 1).
-- 2. conversaciones (una por par de perfiles) y mensajes. Solo las dos
--    partes las leen; escribir, solo con las funciones.
-- 3. puede_escribir, enviar_mensaje, mis_conversaciones, mensajes_de,
--    marcar_conversacion_leida y mensajes_sin_leer.

-- 1 ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists mensajes_solo_contactos boolean not null default false;

grant select (mensajes_solo_contactos) on public.profiles to anon, authenticated;

-- 2 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.conversaciones (
  id                uuid primary key default gen_random_uuid(),
  perfil_a          uuid not null references public.profiles (id) on delete cascade,
  perfil_b          uuid not null references public.profiles (id) on delete cascade,
  iniciada_por      uuid not null references public.profiles (id) on delete cascade,
  created_at        timestamptz not null default now(),
  ultimo_mensaje_at timestamptz not null default now(),
  constraint conversaciones_orden check (perfil_a < perfil_b),
  constraint conversaciones_par_uniq unique (perfil_a, perfil_b)
);

create index if not exists conversaciones_b_idx on public.conversaciones (perfil_b);

create table if not exists public.mensajes (
  id              uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones (id) on delete cascade,
  autor           uuid not null references public.profiles (id) on delete cascade,
  texto           text not null check (length(btrim(texto)) between 1 and 2000),
  created_at      timestamptz not null default now(),
  leido_at        timestamptz
);

create index if not exists mensajes_conversacion_idx on public.mensajes (conversacion_id, created_at desc);
create index if not exists mensajes_autor_idx on public.mensajes (autor, created_at desc);

comment on table public.conversaciones is 'Mensajería de la red: una conversación por par de perfiles (perfil_a < perfil_b).';
comment on table public.mensajes is 'Mensajes de una conversación. Solo los leen las dos partes; se escriben con enviar_mensaje().';

alter table public.conversaciones enable row level security;
alter table public.mensajes enable row level security;

drop policy if exists "Las dos partes ven su conversación" on public.conversaciones;
create policy "Las dos partes ven su conversación" on public.conversaciones
  for select to authenticated
  using ((select auth.uid()) in (perfil_a, perfil_b));

drop policy if exists "Las dos partes ven sus mensajes" on public.mensajes;
create policy "Las dos partes ven sus mensajes" on public.mensajes
  for select to authenticated
  using (exists (
    select 1 from public.conversaciones c
    where c.id = conversacion_id and (select auth.uid()) in (c.perfil_a, c.perfil_b)
  ));

revoke all on public.conversaciones from anon, authenticated;
revoke all on public.mensajes from anon, authenticated;
grant select on public.conversaciones, public.mensajes to authenticated;

-- 3 ─────────────────────────────────────────────────────────────────────────

/**
 * ¿Puede quien llama escribir a este perfil? Devuelve:
 * 'si' | 'anonimo' | 'propio' | 'plan' (no es contacto y no tiene plan de
 * pago) | 'solo_contactos' (esa persona solo recibe de sus contactos) |
 * 'no_disponible'.
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

/**
 * Envía un mensaje. Devuelve la conversación y el resultado:
 * 'ok' | 'nueva' (se ha abierto la conversación) | 'limite' | 'vacio' |
 * o el motivo de puede_escribir si no se puede ('plan', 'solo_contactos'…).
 */
create or replace function public.enviar_mensaje(p_perfil uuid, p_texto text)
returns table (conversacion uuid, resultado text)
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare
  v_yo uuid := auth.uid();
  v_texto text := left(btrim(coalesce(p_texto, '')), 2000);
  v_puede text := public.puede_escribir(p_perfil);
  v_conv uuid;
  v_nueva boolean := false;
  v_contacto boolean;
begin
  if v_puede <> 'si' then
    return query select null::uuid, v_puede; return;
  end if;
  if v_texto = '' then
    return query select null::uuid, 'vacio'::text; return;
  end if;

  -- Antispam: 60 mensajes por hora.
  if (select count(*) from public.mensajes where autor = v_yo and created_at > now() - interval '1 hour') >= 60 then
    return query select null::uuid, 'limite'::text; return;
  end if;

  select id into v_conv from public.conversaciones
  where perfil_a = least(v_yo, p_perfil) and perfil_b = greatest(v_yo, p_perfil);

  if v_conv is null then
    v_contacto := exists (select 1 from public.conexiones c
      where c.estado = 'aceptada'
        and least(c.solicitante, c.destinatario) = least(v_yo, p_perfil)
        and greatest(c.solicitante, c.destinatario) = greatest(v_yo, p_perfil));
    -- Antispam: 10 conversaciones nuevas al día con quien no es contacto.
    if not v_contacto and (
      select count(*) from public.conversaciones c
      where c.iniciada_por = v_yo and c.created_at > now() - interval '1 day'
        and not exists (select 1 from public.conexiones x
          where x.estado = 'aceptada'
            and least(x.solicitante, x.destinatario) = c.perfil_a
            and greatest(x.solicitante, x.destinatario) = c.perfil_b)
    ) >= 10 then
      return query select null::uuid, 'limite'::text; return;
    end if;

    insert into public.conversaciones (perfil_a, perfil_b, iniciada_por)
    values (least(v_yo, p_perfil), greatest(v_yo, p_perfil), v_yo)
    on conflict (perfil_a, perfil_b) do nothing
    returning id into v_conv;
    if v_conv is null then
      select id into v_conv from public.conversaciones
      where perfil_a = least(v_yo, p_perfil) and perfil_b = greatest(v_yo, p_perfil);
    else
      v_nueva := true;
    end if;
  end if;

  insert into public.mensajes (conversacion_id, autor, texto) values (v_conv, v_yo, v_texto);
  update public.conversaciones set ultimo_mensaje_at = now() where id = v_conv;

  return query select v_conv, case when v_nueva then 'nueva' else 'ok' end;
end;
$$;

/** Bandeja: mis conversaciones con la otra parte, el último mensaje y los no leídos. */
create or replace function public.mis_conversaciones()
returns table (
  id uuid, otro_id uuid, otro_nombre text, otro_slug text, otro_avatar text, otro_publico boolean,
  ultimo_texto text, ultimo_mio boolean, ultimo_at timestamptz, sin_leer integer
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
          where m.conversacion_id = c.id and m.autor <> auth.uid() and m.leido_at is null)
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

/** Mensajes de una conversación propia (los últimos p_limite, en orden). */
create or replace function public.mensajes_de(p_conversacion uuid, p_limite integer default 200)
returns table (id uuid, mio boolean, texto text, created_at timestamptz, leido boolean)
language sql
stable
security definer
set search_path = 'public'
as $$
  select * from (
    select m.id, m.autor = auth.uid(), m.texto, m.created_at, m.leido_at is not null
    from public.mensajes m
    join public.conversaciones c on c.id = m.conversacion_id
    where m.conversacion_id = p_conversacion
      and auth.uid() in (c.perfil_a, c.perfil_b)
    order by m.created_at desc
    limit least(greatest(coalesce(p_limite, 200), 1), 500)
  ) t order by t.created_at asc;
$$;

/** Marca como leídos los mensajes recibidos en una conversación propia. */
create or replace function public.marcar_conversacion_leida(p_conversacion uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = 'public'
as $$
declare v_n integer;
begin
  update public.mensajes m set leido_at = now()
  from public.conversaciones c
  where c.id = m.conversacion_id and m.conversacion_id = p_conversacion
    and auth.uid() in (c.perfil_a, c.perfil_b)
    and m.autor <> auth.uid() and m.leido_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

/** Total de mensajes sin leer de quien llama (para el menú). */
create or replace function public.mensajes_sin_leer()
returns integer
language sql
stable
security definer
set search_path = 'public'
as $$
  select count(*)::int from public.mensajes m
  join public.conversaciones c on c.id = m.conversacion_id
  where auth.uid() in (c.perfil_a, c.perfil_b)
    and m.autor <> auth.uid() and m.leido_at is null;
$$;

revoke all on function public.puede_escribir(uuid) from public;
revoke all on function public.enviar_mensaje(uuid, text) from public;
revoke all on function public.mis_conversaciones() from public;
revoke all on function public.mensajes_de(uuid, integer) from public;
revoke all on function public.marcar_conversacion_leida(uuid) from public;
revoke all on function public.mensajes_sin_leer() from public;

grant execute on function public.puede_escribir(uuid) to anon, authenticated;
grant execute on function public.enviar_mensaje(uuid, text) to authenticated;
grant execute on function public.mis_conversaciones() to authenticated;
grant execute on function public.mensajes_de(uuid, integer) to authenticated;
grant execute on function public.marcar_conversacion_leida(uuid) to authenticated;
grant execute on function public.mensajes_sin_leer() to authenticated;
