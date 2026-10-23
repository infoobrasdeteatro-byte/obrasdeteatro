-- Verificación profesional: el sello «✓ Verificado» (profiles.verificado_profesional).
--
-- Se concede cuando se cumplen las tres condiciones a la vez:
--   1. Plan de pago activo (premium, destacado o empresas).
--   2. Ficha completa: foto, biografía (30+ caracteres), ciudad y, si es una
--      persona, al menos una profesión.
--   3. Presencia profesional comprobada: el usuario pone su código
--      (ODT-XXXXXX) en la biografía de una red o en su web, envía el enlace y
--      moderación lo revisa. No se piden ni guardan documentos de identidad.
-- Si el plan pasa a gratuito, el sello se retira; si vuelve a uno de pago y la
-- verificación estaba aprobada, se repone solo.

-- Código de cada perfil: estable, no secreto (lo importante es que solo el
-- dueño de la red puede ponerlo en ella).
create or replace function public.codigo_verificacion(p_profile uuid)
returns text
language sql
immutable
as $$
  select 'ODT-' || upper(substr(md5(p_profile::text || ':obrasdeteatro:verificacion'), 1, 6))
$$;

create table if not exists public.verificaciones_profesionales (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  tipo_enlace      text not null check (tipo_enlace in ('web','instagram','facebook','linkedin','x','tiktok','youtube','otra')),
  enlace           text not null check (enlace ~ '^https://' and char_length(enlace) <= 500),
  codigo           text not null,
  codigo_detectado boolean,
  estado           text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada')),
  motivo           text check (char_length(motivo) <= 500),
  created_at       timestamptz not null default now(),
  resuelta_at      timestamptz,
  resuelta_por     uuid references public.profiles(id)
);

create unique index if not exists verificaciones_una_pendiente
  on public.verificaciones_profesionales (profile_id) where estado = 'pendiente';
create index if not exists verificaciones_por_estado
  on public.verificaciones_profesionales (estado, created_at);

alter table public.verificaciones_profesionales enable row level security;

drop policy if exists "Verificación propia" on public.verificaciones_profesionales;
create policy "Verificación propia" on public.verificaciones_profesionales
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "Verificaciones para moderación" on public.verificaciones_profesionales;
create policy "Verificaciones para moderación" on public.verificaciones_profesionales
  for select to authenticated using (
    exists (select 1 from public.profile_roles r where r.profile_id = auth.uid() and r.role in ('admin','moderator'))
  );
-- Sin INSERT/UPDATE/DELETE para clientes: todo pasa por las funciones de abajo.

-- Requisitos 1 y 2 de un perfil.
create or replace function public.requisitos_verificacion(p_profile uuid)
returns jsonb
language sql
stable
security definer
set search_path = 'public'
as $$
  select jsonb_build_object(
    'plan',        p.plan::text <> 'gratuito',
    'foto',        coalesce(nullif(trim(p.avatar_url), ''), '') <> '',
    'biografia',   char_length(coalesce(trim(p.bio), '')) >= 30,
    'ciudad',      coalesce(nullif(trim(p.ciudad), ''), '') <> '',
    'profesiones', p.tipo_perfil::text not in ('profesional','actor','director','dramaturgo')
                   or exists (select 1 from public.profile_specialties s where s.profile_id = p.id)
  )
  from public.profiles p
  where p.id = p_profile
$$;

create or replace function public.solicitar_verificacion(p_tipo text, p_enlace text)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_req jsonb;
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para solicitar la verificación' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and verificado_profesional) then
    raise exception 'Tu perfil ya está verificado' using errcode = 'P0001';
  end if;
  v_req := public.requisitos_verificacion(v_uid);
  if v_req is null or exists (select 1 from jsonb_each(v_req) where value = 'false'::jsonb) then
    raise exception 'Tu perfil todavía no cumple los requisitos de verificación' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.verificaciones_profesionales where profile_id = v_uid and estado = 'pendiente') then
    raise exception 'Ya tienes una solicitud en revisión' using errcode = 'P0001';
  end if;

  insert into public.verificaciones_profesionales (profile_id, tipo_enlace, enlace, codigo)
  values (v_uid, p_tipo, trim(p_enlace), public.codigo_verificacion(v_uid))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.resolver_verificacion(p_id uuid, p_aprobar boolean, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_profile uuid;
begin
  if not exists (select 1 from public.profile_roles where profile_id = v_uid and role in ('admin','moderator')) then
    raise exception 'Solo el equipo de moderación resuelve verificaciones' using errcode = '42501';
  end if;
  if not p_aprobar and coalesce(trim(p_motivo), '') = '' then
    raise exception 'Indica el motivo del rechazo' using errcode = 'P0001';
  end if;

  update public.verificaciones_profesionales
  set estado = case when p_aprobar then 'aprobada' else 'rechazada' end,
      motivo = nullif(trim(p_motivo), ''),
      resuelta_at = now(),
      resuelta_por = v_uid
  where id = p_id and estado = 'pendiente'
  returning profile_id into v_profile;

  if v_profile is null then
    raise exception 'La solicitud no existe o ya está resuelta' using errcode = 'P0001';
  end if;

  if p_aprobar then
    update public.profiles set verificado_profesional = (plan::text <> 'gratuito') where id = v_profile;
  end if;
end;
$$;

revoke all on function public.solicitar_verificacion(text, text) from public, anon;
grant execute on function public.solicitar_verificacion(text, text) to authenticated;
revoke all on function public.resolver_verificacion(uuid, boolean, text) from public, anon;
grant execute on function public.resolver_verificacion(uuid, boolean, text) to authenticated;
grant execute on function public.requisitos_verificacion(uuid) to authenticated;
grant execute on function public.codigo_verificacion(uuid) to authenticated;

-- El sello sigue al plan.
create or replace function public.profiles_sello_sigue_plan()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  if new.plan is distinct from old.plan then
    if new.plan::text = 'gratuito' then
      new.verificado_profesional := false;
    elsif old.plan::text = 'gratuito' and exists (
      select 1 from public.verificaciones_profesionales v
      where v.profile_id = new.id and v.estado = 'aprobada'
    ) then
      new.verificado_profesional := true;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sello_sigue_plan on public.profiles;
create trigger profiles_sello_sigue_plan
  before update of plan on public.profiles
  for each row execute function public.profiles_sello_sigue_plan();

-- El sello que ya existe (fundador) queda respaldado por una verificación
-- aprobada, para que también se reponga si cambia de plan.
insert into public.verificaciones_profesionales (profile_id, tipo_enlace, enlace, codigo, codigo_detectado, estado, motivo, resuelta_at)
select p.id, 'web', 'https://www.obrasdeteatro.com', public.codigo_verificacion(p.id), true, 'aprobada', 'Fundador de la plataforma', now()
from public.profiles p
where p.verificado_profesional
  and not exists (select 1 from public.verificaciones_profesionales v where v.profile_id = p.id and v.estado = 'aprobada');
