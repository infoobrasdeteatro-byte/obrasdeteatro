-- Correo entrante en el Master Control (fase 2).
--
-- Arsys (hola@ y las direcciones que redirigen a él) y Gmail
-- (info.obrasdeteatro@gmail.com) reenvían una COPIA de cada correo a
-- panel@buzon.obrasdeteatro.com. Resend la recibe y avisa por webhook a
-- /api/webhooks/resend-inbound, que la guarda aquí con la clave de servicio.
-- Los buzones originales no cambian.
--
-- · Solo administración: SELECT y UPDATE para el rol admin; moderator y el
--   resto de cuentas no ven nada. INSERT y DELETE solo con service_role (el
--   webhook y el cron de conservación de 12 meses).
-- · Desde el panel solo se cambian estado, categoría y nota interna; quién y
--   cuándo lo atendió lo pone el trigger.

-- 1. ¿La cuenta tiene el rol admin? (es_moderador() admite también moderator).
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (select 1 from public.profile_roles where profile_id = auth.uid() and role = 'admin')
$$;

comment on function public.es_admin() is
  'true si la cuenta de la sesión tiene el rol admin. SECURITY DEFINER para usarse en políticas sin recursión de RLS.';

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated, service_role;

-- 2. La tabla.
create table if not exists public.correos_entrantes (
  id                 uuid primary key default gen_random_uuid(),
  resend_email_id    text not null unique,
  recibido_at        timestamptz not null default now(),
  buzon              text not null check (buzon in ('hola', 'gmail', 'otro')),
  direccion_destino  text check (direccion_destino is null or length(direccion_destino) <= 320),
  remitente_nombre   text check (remitente_nombre is null or length(remitente_nombre) <= 200),
  remitente_email    text check (remitente_email is null or length(remitente_email) <= 320),
  asunto             text check (asunto is null or length(asunto) <= 500),
  texto              text,
  html               text,
  adjuntos           jsonb not null default '[]'::jsonb check (jsonb_typeof(adjuntos) = 'array'),
  categoria          text not null default 'persona' check (categoria in ('persona', 'servicio')),
  estado             text not null default 'nuevo' check (estado in ('nuevo', 'leido', 'atendido', 'archivado')),
  nota_interna       text check (nota_interna is null or length(nota_interna) <= 4000),
  atendido_por       uuid references public.profiles (id) on delete set null,
  atendido_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.correos_entrantes is
  'Copias de los correos de hola@ y del Gmail recibidas por Resend (webhook). Solo admin lee y actualiza; solo service_role inserta y borra. Se conservan 12 meses.';
comment on column public.correos_entrantes.resend_email_id is 'Id del correo en Resend: único, para no duplicar si el webhook llega dos veces.';
comment on column public.correos_entrantes.html is 'HTML tal cual llegó. Solo se muestra saneado y dentro de un iframe aislado (sandbox).';
comment on column public.correos_entrantes.adjuntos is 'Solo metadatos: [{nombre, tipo, tamano}]. Los archivos siguen en el buzón original.';

create index if not exists correos_entrantes_recibido_idx on public.correos_entrantes (recibido_at desc);
create index if not exists correos_entrantes_bandeja_idx on public.correos_entrantes (categoria, estado, recibido_at desc);

-- 3. Quién y cuándo lo atendió; updated_at.
create or replace function public.correos_entrantes_guarda()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  new.updated_at := now();
  if new.estado = 'atendido' and old.estado is distinct from 'atendido' then
    new.atendido_at := now();
    new.atendido_por := auth.uid();
  elsif new.estado <> 'atendido' and old.estado = 'atendido' then
    new.atendido_at := null;
    new.atendido_por := null;
  end if;
  return new;
end;
$$;

drop trigger if exists correos_entrantes_guarda on public.correos_entrantes;
create trigger correos_entrantes_guarda
  before update on public.correos_entrantes
  for each row execute function public.correos_entrantes_guarda();

-- 4. Permisos y RLS.
alter table public.correos_entrantes enable row level security;

revoke all on public.correos_entrantes from anon, authenticated;
grant select on public.correos_entrantes to authenticated;
grant update (estado, categoria, nota_interna) on public.correos_entrantes to authenticated;
grant select, insert, update, delete on public.correos_entrantes to service_role;

drop policy if exists "Administración lee el correo entrante" on public.correos_entrantes;
create policy "Administración lee el correo entrante"
  on public.correos_entrantes for select
  to authenticated
  using (public.es_admin());

drop policy if exists "Administración gestiona el correo entrante" on public.correos_entrantes;
create policy "Administración gestiona el correo entrante"
  on public.correos_entrantes for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());
