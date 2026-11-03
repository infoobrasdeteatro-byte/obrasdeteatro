/**
 * Lo mínimo de Supabase que necesitan las migraciones de Embajadores y del
 * Elenco Fundador en PGlite (copia del PREVIO de lib/elenco/__tests__/migracion.test.ts).
 */
export const PREVIO = `
  create type public.plan_suscripcion as enum ('gratuito', 'premium', 'destacado', 'empresas');
  create type public.tipo_perfil as enum ('actor', 'director', 'dramaturgo', 'compania', 'productora', 'teatro', 'festival', 'escuela', 'institucion', 'profesional', 'publico');
  alter table public.profiles
    add column plan public.plan_suscripcion not null default 'gratuito',
    add column is_premium boolean not null default false,
    add column created_at timestamptz not null default now(),
    add column updated_at timestamptz not null default now(),
    add column nombre_artistico text,
    add column avatar_url text,
    add column bio text,
    add column ciudad text,
    add column verificado boolean not null default false,
    add column tipo_perfil public.tipo_perfil not null default 'profesional',
    add column deleted_at timestamptz,
    add column slug text,
    add column perfil_publico boolean not null default true,
    add column email text;
  create table public.subscriptions (profile_id uuid unique, plan text not null, status text not null);
  create table public.espacios_reclamaciones (id uuid primary key default gen_random_uuid(), profile_id uuid not null, estado text not null default 'pendiente');
  create table public.cartelera_destacados (id uuid primary key default gen_random_uuid(), espectaculo_id uuid, desde date, hasta date);
  create table public.profile_specialties (id uuid primary key default gen_random_uuid(), profile_id uuid not null, specialty text not null, is_primary boolean not null default false);
  create role service_role nologin;
  grant usage on schema public to service_role;
  -- Sello «✓ Verificado» que sigue al plan (copia de 20261023140000_perfiles_verificacion_profesional).
  alter table public.profiles add column verificado_profesional boolean not null default false;
  create table public.verificaciones_profesionales (profile_id uuid, estado text);
  create function public.profiles_sello_sigue_plan() returns trigger language plpgsql set search_path = 'public' as $$
  begin
    if new.plan is distinct from old.plan then
      if new.plan::text = 'gratuito' then
        new.verificado_profesional := false;
      elsif old.plan::text = 'gratuito' and exists (
        select 1 from public.verificaciones_profesionales v where v.profile_id = new.id and v.estado = 'aprobada') then
        new.verificado_profesional := true;
      end if;
    end if;
    return new;
  end $$;
  create trigger profiles_sello_sigue_plan before update of plan on public.profiles
    for each row execute function public.profiles_sello_sigue_plan();
`
