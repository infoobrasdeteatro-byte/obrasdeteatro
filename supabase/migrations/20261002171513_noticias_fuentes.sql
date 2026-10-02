-- Noticias (2/5): fuentes.
--
-- Cada noticia cita una fuente. La fuente guarda con qué título se reutiliza
-- su contenido:
--   - tipo_fuente: medio_con_permiso (hace falta autorización expresa del
--     medio) o fuente_publica_reutilizable (organismos públicos cuyo aviso
--     legal permite reutilizar citando la fuente; url_licencia lo acredita).
--   - estado_permiso: pendiente | concedido | denegado | no_necesario.
--
-- Regla de base de datos: una fuente solo puede estar activa si su permiso
-- está concedido o no es necesario. Y solo se publican noticias de fuentes
-- activas (lo comprueba el trigger de guarda de noticias, migración 4/5).
--
-- La tabla no tiene lectura pública: notas, permisos y licencias son
-- internos. El público lee nombre, dominio, url_web y pais_code a través de la
-- vista noticias_fuentes_publicas (migración 3/5), que necesita la tabla
-- noticias para filtrar.
--
-- pais_code: los 20 países de lib/geo/countries.ts.

create table public.noticias_fuentes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  dominio text not null,
  url_web text,
  url_rss text,
  pais_code text not null,
  tipo_fuente text not null,
  estado_permiso text not null default 'pendiente',
  url_licencia text,
  notas text,
  activa boolean not null default false,
  created_at timestamptz not null default now(),

  constraint noticias_fuentes_nombre_no_vacio check (btrim(nombre) <> ''),
  constraint noticias_fuentes_dominio_unico unique (dominio),
  -- Solo el host, en minúsculas: sin esquema, ruta ni espacios.
  constraint noticias_fuentes_dominio_formato check (dominio ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  constraint noticias_fuentes_url_web_http check (url_web is null or url_web ~* '^https?://[^\s/?#]+[^\s]*$'),
  constraint noticias_fuentes_url_rss_http check (url_rss is null or url_rss ~* '^https?://[^\s/?#]+[^\s]*$'),
  constraint noticias_fuentes_url_licencia_http check (url_licencia is null or url_licencia ~* '^https?://[^\s/?#]+[^\s]*$'),
  constraint noticias_fuentes_pais_check check (pais_code in (
    'ES','AR','MX','CO','CL','PE','UY','PY','BO','EC',
    'VE','CR','PA','GT','HN','NI','SV','DO','CU','PR'
  )),
  constraint noticias_fuentes_tipo_check check (tipo_fuente in ('medio_con_permiso', 'fuente_publica_reutilizable')),
  constraint noticias_fuentes_permiso_check check (estado_permiso in ('pendiente', 'concedido', 'denegado', 'no_necesario')),
  constraint noticias_fuentes_activa_con_permiso check (
    not activa or estado_permiso in ('concedido', 'no_necesario')
  )
);

comment on table public.noticias_fuentes is
  'Fuentes de noticias y título de reutilización. Una fuente solo puede estar activa con permiso concedido o no necesario. Sin lectura pública: el público usa la vista noticias_fuentes_publicas.';

alter table public.noticias_fuentes enable row level security;

create policy "Moderación gestiona fuentes de noticias" on public.noticias_fuentes
  for all
  using (public.es_moderador())
  with check (public.es_moderador());

revoke insert, update, delete, truncate on public.noticias_fuentes from anon;
revoke truncate on public.noticias_fuentes from authenticated;

insert into public.noticias_fuentes
  (nombre, dominio, url_web, pais_code, tipo_fuente, estado_permiso, url_licencia, activa)
values
  ('Paso de Gato',                 'pasodegato.com',   'https://pasodegato.com',      'MX', 'medio_con_permiso',           'pendiente',    null, false),
  ('Revista SATCH',                'satch.cl',         'https://www.satch.cl',        'CL', 'medio_con_permiso',           'pendiente',    null, false),
  ('Revista Godot',                'revistagodot.com', 'https://revistagodot.com',    'ES', 'medio_con_permiso',           'pendiente',    null, false),
  ('Redescena',                    'redescena.net',    'https://www.redescena.net',   'ES', 'medio_con_permiso',           'pendiente',    null, false),
  ('Ministerio de Cultura / INAEM', 'cultura.gob.es',  'https://www.cultura.gob.es',  'ES', 'fuente_publica_reutilizable', 'no_necesario', 'https://www.cultura.gob.es/comunes/aviso-legal.html', true),
  ('argentina.gob.ar',             'argentina.gob.ar', 'https://www.argentina.gob.ar', 'AR', 'fuente_publica_reutilizable', 'no_necesario', 'https://www.argentina.gob.ar/terminos-y-condiciones', true);
