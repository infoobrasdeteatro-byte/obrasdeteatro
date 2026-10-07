-- Colaboradores: medios, instituciones y patrocinadores de obrasdeteatro.com.
--
-- Se muestran en la franja «Medios colaboradores» de la portada, en
-- /colaboradores y, si un medio está vinculado a una fuente de Noticias, como
-- distintivo «Medio colaborador» junto a sus noticias.
--
-- NADA SE MUESTRA HASTA ACTIVARLO: activo nace en false y la lectura pública
-- solo ve las filas activas. Solo moderación crea, edita, ordena y activa.

-- 1. Tabla.
create table public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null,
  descripcion text,
  pais_code text,
  url_web text,
  logo_url text,
  orden integer not null default 0,
  activo boolean not null default false,
  desde date,
  noticias_fuente_id uuid references public.noticias_fuentes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint colaboradores_nombre_longitud check (char_length(btrim(nombre)) between 1 and 120),
  constraint colaboradores_tipo_check check (tipo in ('medio', 'institucion', 'patrocinador')),
  constraint colaboradores_descripcion_longitud check (descripcion is null or char_length(descripcion) <= 200),
  -- Los 20 países del ámbito, la misma lista de noticias.pais_code.
  constraint colaboradores_pais_check check (pais_code is null or pais_code in (
    'ES','AR','MX','CO','CL','PE','UY','PY','BO','EC',
    'VE','CR','PA','GT','HN','NI','SV','DO','CU','PR'
  )),
  constraint colaboradores_url_web_https check (url_web is null or url_web ~* '^https://[^\s/?#]+[^\s]*$'),
  constraint colaboradores_logo_url_https check (logo_url is null or logo_url ~* '^https://[^\s/?#]+[^\s]*$')
);

comment on table public.colaboradores is
  'Medios, instituciones y patrocinadores. Lectura pública solo de los activos; escritura solo moderación. Nacen inactivos.';
comment on column public.colaboradores.noticias_fuente_id is
  'Fuente de Noticias de este colaborador (opcional): sus noticias llevan el distintivo «Medio colaborador» mientras esté activo.';

-- Listado público por tipo y orden.
create index colaboradores_activos_idx on public.colaboradores (tipo, orden) where activo;

create trigger colaboradores_updated_at
  before update on public.colaboradores
  for each row execute function public.update_updated_at();

-- 2. RLS.
alter table public.colaboradores enable row level security;

create policy "Colaboradores activos visibles"
  on public.colaboradores for select
  using (activo = true);

create policy "Moderación gestiona colaboradores"
  on public.colaboradores for all
  using (public.es_moderador())
  with check (public.es_moderador());

revoke insert, update, delete, truncate on public.colaboradores from anon;
revoke truncate on public.colaboradores from authenticated;

-- 3. Logos: bucket público «colaboradores».
--
--    Público para leer (las URLs van en <img>); subir, sustituir y borrar,
--    solo moderación. SVG, PNG o WebP de hasta 500 KB, comprobado por
--    Storage al subir. Un SVG puede llevar scripts: aquí solo se muestran con
--    <img>, donde no se ejecutan, y solo moderación puede subirlos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('colaboradores', 'colaboradores', true, 512000, array['image/svg+xml', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Leer los objetos por la API (no por la URL pública) lo necesita Storage para
-- borrar o sustituir un logo.
create policy "Logos de colaboradores: moderación lee"
  on storage.objects for select to authenticated
  using (bucket_id = 'colaboradores' and public.es_moderador());

create policy "Logos de colaboradores: moderación sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'colaboradores' and public.es_moderador());

create policy "Logos de colaboradores: moderación sustituye"
  on storage.objects for update to authenticated
  using (bucket_id = 'colaboradores' and public.es_moderador())
  with check (bucket_id = 'colaboradores' and public.es_moderador());

create policy "Logos de colaboradores: moderación borra"
  on storage.objects for delete to authenticated
  using (bucket_id = 'colaboradores' and public.es_moderador());
