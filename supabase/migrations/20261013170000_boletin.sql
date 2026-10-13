-- Boletín semanal por correo.
--
-- Suscripción abierta (sin cuenta) con doble confirmación: el correo queda
-- «pendiente» hasta que la persona pulsa el enlace que le enviamos. Baja en un
-- clic en cada envío. Lo envía el cron /api/cron/boletin con la clave de
-- servicio.
--
-- PREPARADO PARA SER SOLO DE PAGO: boletin_config.acceso = 'pago' hace que el
-- envío solo vaya a suscriptores cuyo correo pertenece a un perfil con plan de
-- pago, y que la web lo anuncie como exclusivo. Se cambia desde /admin/boletin.

-- 1. Configuración (una sola fila).
create table public.boletin_config (
  id boolean primary key default true,
  nombre text not null default 'Proscenio',
  activo boolean not null default false,
  acceso text not null default 'todos',
  dia_envio smallint not null default 4,
  updated_at timestamptz not null default now(),

  constraint boletin_config_una_fila check (id),
  constraint boletin_config_nombre_longitud check (char_length(btrim(nombre)) between 2 and 80),
  constraint boletin_config_acceso_check check (acceso in ('todos', 'pago')),
  -- ISO: 1 = lunes … 7 = domingo (hora de Madrid).
  constraint boletin_config_dia_check check (dia_envio between 1 and 7)
);

insert into public.boletin_config (id) values (true);

comment on table public.boletin_config is
  'Ajustes del boletín (una fila): nombre, si se envía, si es para todos o solo planes de pago, y el día de la semana.';

create trigger boletin_config_updated_at
  before update on public.boletin_config
  for each row execute function public.update_updated_at();

-- 2. Suscriptores.
create table public.boletin_suscriptores (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  estado text not null default 'pendiente',
  origen text,
  -- Hash (sha256) del enlace de confirmación; el enlace en claro solo viaja en el correo.
  token_confirmacion_hash text,
  confirmacion_enviada_at timestamptz,
  consentimiento_at timestamptz not null default now(),
  confirmado_at timestamptz,
  baja_at timestamptz,
  ultimo_envio_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boletin_suscriptores_email_formato check (email = lower(btrim(email)) and email ~ '^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$' and char_length(email) <= 254),
  constraint boletin_suscriptores_estado_check check (estado in ('pendiente', 'confirmado', 'baja')),
  constraint boletin_suscriptores_origen_check check (origen is null or origen in ('portada', 'pie', 'otro'))
);

create unique index boletin_suscriptores_email_unico on public.boletin_suscriptores (email);
create index boletin_suscriptores_confirmados_idx on public.boletin_suscriptores (estado) where estado = 'confirmado';

comment on table public.boletin_suscriptores is
  'Suscriptores del boletín. Sin políticas públicas: alta, confirmación, baja y envío van por el servidor con la clave de servicio. Moderación solo lee.';

create trigger boletin_suscriptores_updated_at
  before update on public.boletin_suscriptores
  for each row execute function public.update_updated_at();

-- 3. Registro de envíos.
create table public.boletin_envios (
  id uuid primary key default gen_random_uuid(),
  enviado_at timestamptz not null default now(),
  destinatarios integer not null default 0,
  errores integer not null default 0,
  noticias integer not null default 0,
  convocatorias integer not null default 0,
  formaciones integer not null default 0,
  episodios integer not null default 0,
  es_prueba boolean not null default false
);

comment on table public.boletin_envios is 'Un registro por envío del boletín (o prueba), con cuántos destinatarios y qué contenía.';

-- 4. RLS.
alter table public.boletin_config enable row level security;
alter table public.boletin_suscriptores enable row level security;
alter table public.boletin_envios enable row level security;

-- La configuración no es sensible: la web la lee para saber el nombre y si el boletín es para todos.
create policy "Configuración del boletín visible"
  on public.boletin_config for select
  using (true);

create policy "Moderación cambia la configuración del boletín"
  on public.boletin_config for update to authenticated
  using (public.es_moderador())
  with check (public.es_moderador());

-- Los correos de los suscriptores nunca se leen con una sesión que no sea de moderación.
create policy "Moderación ve los suscriptores"
  on public.boletin_suscriptores for select to authenticated
  using (public.es_moderador());

create policy "Moderación ve los envíos"
  on public.boletin_envios for select to authenticated
  using (public.es_moderador());

revoke insert, update, delete, truncate on public.boletin_config from anon, authenticated;
grant update (nombre, activo, acceso, dia_envio) on public.boletin_config to authenticated;
revoke insert, update, delete, truncate on public.boletin_suscriptores from anon, authenticated;
revoke insert, update, delete, truncate on public.boletin_envios from anon, authenticated;
revoke select on public.boletin_suscriptores from anon;
revoke select on public.boletin_envios from anon;
