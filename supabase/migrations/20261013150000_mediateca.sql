-- Mediateca: podcasts y vídeos de artes escénicas.
--
-- No se aloja audio ni vídeo: cada programa sigue en su plataforma (YouTube,
-- iVoox, Spotify…) y aquí se incrusta su reproductor. Los episodios llegan
-- solos: el cron diario /api/cron/mediateca lee el RSS de YouTube del canal y
-- el RSS del podcast de cada programa activo, con la clave de servicio.
--
-- Solo moderación da de alta programas (nacen inactivos). Los episodios se
-- publican al importarse; moderación solo los retira (con motivo) o restaura.

-- 1. Programas.
create table public.mediateca_programas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  descripcion text,
  pais_code text,
  imagen_url text,
  url_web text,
  colaborador_id uuid references public.colaboradores (id) on delete set null,
  youtube_channel_id text,
  rss_url text,
  spotify_url text,
  activo boolean not null default false,
  orden integer not null default 0,
  ultima_importacion_at timestamptz,
  ultimo_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mediateca_programas_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint mediateca_programas_nombre_longitud check (char_length(btrim(nombre)) between 1 and 120),
  constraint mediateca_programas_descripcion_longitud check (descripcion is null or char_length(descripcion) <= 600),
  constraint mediateca_programas_pais_check check (pais_code is null or pais_code in (
    'ES','AR','MX','CO','CL','PE','UY','PY','BO','EC',
    'VE','CR','PA','GT','HN','NI','SV','DO','CU','PR'
  )),
  constraint mediateca_programas_imagen_https check (imagen_url is null or imagen_url ~* '^https://[^\s/?#]+[^\s]*$'),
  constraint mediateca_programas_web_https check (url_web is null or url_web ~* '^https://[^\s/?#]+[^\s]*$'),
  constraint mediateca_programas_youtube_formato check (youtube_channel_id is null or youtube_channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
  constraint mediateca_programas_rss_https check (rss_url is null or rss_url ~* '^https://[^\s/?#]+[^\s]*$'),
  constraint mediateca_programas_spotify check (spotify_url is null or spotify_url ~* '^https://open\.spotify\.com/show/[A-Za-z0-9]+'),
  constraint mediateca_programas_error_longitud check (ultimo_error is null or char_length(ultimo_error) <= 500)
);

comment on table public.mediateca_programas is
  'Podcasts y canales de vídeo. Lectura pública solo de los activos; escritura solo moderación (y la importación, con la clave de servicio).';

-- 2. Episodios.
create table public.mediateca_episodios (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.mediateca_programas (id) on delete cascade,
  slug text not null,
  titulo text not null,
  descripcion text,
  fecha_publicacion timestamptz not null,
  duracion_segundos integer,
  imagen_url text,
  youtube_video_id text,
  audio_guid text,
  audio_url text,
  enlace_audio text,
  estado text not null default 'publicado',
  motivo_retirada text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mediateca_episodios_slug_unico unique (programa_id, slug),
  constraint mediateca_episodios_youtube_unico unique (programa_id, youtube_video_id),
  constraint mediateca_episodios_audio_unico unique (programa_id, audio_guid),
  constraint mediateca_episodios_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint mediateca_episodios_titulo_longitud check (char_length(btrim(titulo)) between 1 and 300),
  constraint mediateca_episodios_descripcion_longitud check (descripcion is null or char_length(descripcion) <= 5000),
  constraint mediateca_episodios_duracion check (duracion_segundos is null or duracion_segundos between 1 and 86400),
  constraint mediateca_episodios_imagen_https check (imagen_url is null or imagen_url ~* '^https://[^\s/?#]+[^\s]*$'),
  constraint mediateca_episodios_youtube_formato check (youtube_video_id is null or youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  constraint mediateca_episodios_audio_https check (audio_url is null or audio_url ~* '^https://[^\s/?#]+[^\s]*$'),
  constraint mediateca_episodios_enlace_https check (enlace_audio is null or enlace_audio ~* '^https://[^\s/?#]+[^\s]*$'),
  constraint mediateca_episodios_guid_longitud check (audio_guid is null or char_length(audio_guid) <= 500),
  -- Un episodio sin nada que reproducir no sirve.
  constraint mediateca_episodios_reproducible check (youtube_video_id is not null or audio_url is not null),
  constraint mediateca_episodios_estado_check check (estado in ('publicado', 'retirado')),
  constraint mediateca_episodios_motivo_longitud check (motivo_retirada is null or char_length(motivo_retirada) <= 500)
);

comment on table public.mediateca_episodios is
  'Episodios importados del RSS de cada programa. Se publican al importarse; moderación solo retira o restaura.';

create index mediateca_episodios_recientes_idx on public.mediateca_episodios (fecha_publicacion desc) where estado = 'publicado';
create index mediateca_episodios_programa_idx on public.mediateca_episodios (programa_id, fecha_publicacion desc);
create index mediateca_programas_colaborador_idx on public.mediateca_programas (colaborador_id);

-- 3. Slugs: se calculan al crear y no cambian (son la URL).
create or replace function public.mediateca_programas_preparar()
returns trigger
language plpgsql
set search_path = 'public'
as $$
declare
  base text;
  candidato text;
  n integer := 1;
begin
  if tg_op = 'INSERT' then
    base := left(public.slugificar(btrim(new.nombre)), 80);
    if base = '' then base := 'programa'; end if;
    candidato := base;
    while exists (select 1 from public.mediateca_programas where slug = candidato) loop
      n := n + 1;
      candidato := base || '-' || n;
    end loop;
    new.slug := candidato;
  else
    new.slug := old.slug;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger mediateca_programas_preparar
  before insert or update on public.mediateca_programas
  for each row execute function public.mediateca_programas_preparar();

create or replace function public.mediateca_episodios_preparar()
returns trigger
language plpgsql
set search_path = 'public'
as $$
declare
  base text;
  candidato text;
  n integer := 1;
begin
  if tg_op = 'INSERT' then
    base := left(public.slugificar(btrim(new.titulo)), 90);
    if base = '' then base := 'episodio'; end if;
    candidato := base;
    while exists (select 1 from public.mediateca_episodios where programa_id = new.programa_id and slug = candidato) loop
      n := n + 1;
      candidato := base || '-' || n;
    end loop;
    new.slug := candidato;
  else
    new.slug := old.slug;
    new.programa_id := old.programa_id;
    new.updated_at := now();
  end if;
  if new.estado = 'publicado' then new.motivo_retirada := null; end if;
  return new;
end;
$$;

create trigger mediateca_episodios_preparar
  before insert or update on public.mediateca_episodios
  for each row execute function public.mediateca_episodios_preparar();

revoke execute on function public.mediateca_programas_preparar() from public, anon, authenticated;
revoke execute on function public.mediateca_episodios_preparar() from public, anon, authenticated;

-- 4. RLS.
alter table public.mediateca_programas enable row level security;
alter table public.mediateca_episodios enable row level security;

create policy "Programas activos visibles"
  on public.mediateca_programas for select
  using (activo = true);

create policy "Moderación gestiona programas"
  on public.mediateca_programas for all to authenticated
  using (public.es_moderador())
  with check (public.es_moderador());

create policy "Episodios publicados visibles"
  on public.mediateca_episodios for select
  using (
    estado = 'publicado'
    and exists (select 1 from public.mediateca_programas p where p.id = programa_id and p.activo)
  );

create policy "Moderación gestiona episodios"
  on public.mediateca_episodios for all to authenticated
  using (public.es_moderador())
  with check (public.es_moderador());

revoke insert, update, delete, truncate on public.mediateca_programas from anon;
revoke insert, update, delete, truncate on public.mediateca_episodios from anon;
revoke truncate on public.mediateca_programas from authenticated;
revoke truncate on public.mediateca_episodios from authenticated;
