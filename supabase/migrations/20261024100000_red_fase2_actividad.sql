-- Red profesional · Fase 2 (B): «Última actividad» en la ficha.
--
-- 1. public.perfil_actividad guarda cuándo estuvo activo cada perfil. La
--    fecha exacta NUNCA se publica: RLS activada, sin políticas y sin
--    permisos para anon ni authenticated. Solo se escribe con
--    registrar_actividad() (como mucho una vez por hora) y solo se lee con
--    actividad_de(), que devuelve el tramo: 'hoy' (últimas 24 h), 'semana',
--    'mes' o 'antes'.
-- 2. profiles.mostrar_actividad: el titular puede ocultarla (bloque 6).
--    Visible por defecto. Con permisos por columnas en profiles (Fase 1), la
--    columna nueva necesita su grant select para anon y authenticated.

-- 1 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.perfil_actividad (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  ultima_at  timestamptz not null default now()
);

comment on table public.perfil_actividad is
  'Última actividad de cada perfil. Privada: solo se publica el tramo con actividad_de().';

alter table public.perfil_actividad enable row level security;
revoke all on public.perfil_actividad from anon, authenticated;

-- 2 ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists mostrar_actividad boolean not null default true;

grant select (mostrar_actividad) on public.profiles to anon, authenticated;

-- 3 ─────────────────────────────────────────────────────────────────────────

/** Anota la actividad de quien llama, como mucho una vez por hora. */
create or replace function public.registrar_actividad()
returns void
language sql
volatile
security definer
set search_path = 'public'
as $$
  insert into public.perfil_actividad (profile_id, ultima_at)
  select auth.uid(), now()
  where auth.uid() is not null
    and exists (select 1 from public.profiles where id = auth.uid())
  on conflict (profile_id) do update
    set ultima_at = excluded.ultima_at
    where public.perfil_actividad.ultima_at < now() - interval '1 hour';
$$;

/**
 * Tramo de la última actividad de un perfil público: 'hoy' | 'semana' |
 * 'mes' | 'antes', o null si el perfil no es público, la ha ocultado o no
 * hay registro. El propio titular la ve aunque la haya ocultado.
 */
create or replace function public.actividad_de(p_perfil uuid)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select case
           when a.ultima_at > now() - interval '1 day' then 'hoy'
           when a.ultima_at > now() - interval '7 days' then 'semana'
           when a.ultima_at > now() - interval '30 days' then 'mes'
           else 'antes'
         end
  from public.perfil_actividad a
  join public.profiles p on p.id = a.profile_id
  where a.profile_id = p_perfil
    and (
      auth.uid() = p_perfil
      or (p.mostrar_actividad and p.perfil_publico and p.verificado and p.activo
          and p.deleted_at is null and p.extincion_solicitada_at is null)
    );
$$;

revoke all on function public.registrar_actividad() from public;
revoke all on function public.actividad_de(uuid) from public;
grant execute on function public.registrar_actividad() to authenticated;
grant execute on function public.actividad_de(uuid) to anon, authenticated;
