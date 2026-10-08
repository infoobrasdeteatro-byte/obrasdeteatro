-- Perfil completo (planes de pago): portada, galería de fotos, vídeos y
-- portfolio de proyectos y espectáculos.
--
-- Reglas comunes a las tres tablas nuevas:
--   - escribir (crear o cambiar): solo el dueño y con plan de pago
--     (public.plan_de_pago());
--   - borrar lo suyo: siempre, aunque ya no pague;
--   - lectura pública: solo si el perfil es público y su dueño tiene plan de
--     pago (public.perfil_premium_visible). Si deja de pagar, todo queda
--     oculto pero NO se borra; si vuelve a un plan de pago, reaparece tal cual;
--   - el dueño ve siempre lo suyo y moderación lo ve todo y puede retirarlo;
--   - los límites (12 fotos, 6 vídeos, 10 proyectos) los comprueba la base,
--     no solo el formulario.

-- 1. ¿Se muestra el material Premium de este perfil al público?
create function public.perfil_premium_visible(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_profile
      and perfil_publico
      and activo
      and verificado
      and extincion_solicitada_at is null
      and deleted_at is null
      and plan <> 'gratuito'
  )
$$;

comment on function public.perfil_premium_visible(uuid) is
  'Perfil público, activo, verificado y con plan de pago: condición para mostrar su portada, galería, vídeos y portfolio.';

-- 2. Límite por perfil, comprobado en la base. El argumento del trigger es el
--    máximo. Un bloqueo por perfil y tabla evita que dos inserciones
--    simultáneas se cuelen las dos por debajo del límite.
create function public.perfil_limite_multimedia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max int := tg_argv[0]::int;
  v_actual int;
begin
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':' || new.profile_id::text, 0));
  execute format('select count(*) from %I.%I where profile_id = $1', tg_table_schema, tg_table_name)
    into v_actual using new.profile_id;
  if v_actual >= v_max then
    raise exception 'Has alcanzado el máximo de % elementos en esta sección.', v_max
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- 3. Galería de fotos (máx. 12). La ruta debe estar en la carpeta del dueño.
create table public.perfil_galeria_fotos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  ruta text not null,
  pie text,
  credito text,
  orden integer not null default 0,
  created_at timestamptz not null default now(),

  constraint perfil_galeria_fotos_ruta_propia check (ruta like profile_id::text || '/%'),
  constraint perfil_galeria_fotos_pie_longitud check (pie is null or char_length(pie) <= 140),
  constraint perfil_galeria_fotos_credito_longitud check (credito is null or char_length(credito) <= 80)
);

create index perfil_galeria_fotos_perfil_idx on public.perfil_galeria_fotos (profile_id, orden);
create index perfil_galeria_fotos_recientes_idx on public.perfil_galeria_fotos (created_at desc);

create trigger perfil_galeria_fotos_limite
  before insert on public.perfil_galeria_fotos
  for each row execute function public.perfil_limite_multimedia('12');

-- 4. Vídeos (máx. 6). Solo enlaces de YouTube o Vimeo, y la plataforma
--    tiene que coincidir con el enlace.
create table public.perfil_galeria_videos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  url text not null,
  plataforma text not null,
  titulo text,
  orden integer not null default 0,
  created_at timestamptz not null default now(),

  constraint perfil_galeria_videos_plataforma_check check (plataforma in ('youtube', 'vimeo')),
  constraint perfil_galeria_videos_url_check check (
    (plataforma = 'youtube' and url ~ '^https://(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11}([?&#][^\s]*)?$')
    or
    (plataforma = 'vimeo' and url ~ '^https://(www\.|player\.)?vimeo\.com/(video/)?[0-9]{6,12}([/?#][^\s]*)?$')
  ),
  constraint perfil_galeria_videos_titulo_longitud check (titulo is null or char_length(titulo) <= 100)
);

create index perfil_galeria_videos_perfil_idx on public.perfil_galeria_videos (profile_id, orden);
create index perfil_galeria_videos_recientes_idx on public.perfil_galeria_videos (created_at desc);

create trigger perfil_galeria_videos_limite
  before insert on public.perfil_galeria_videos
  for each row execute function public.perfil_limite_multimedia('6');

-- 5. Portfolio de proyectos y espectáculos (máx. 10). Su imagen va al bucket
--    «galeria», en la carpeta del dueño, y no cuenta para las 12 fotos.
create table public.perfil_portfolio (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  titulo text not null,
  anio integer,
  rol text,
  compania text,
  descripcion text,
  imagen_ruta text,
  enlace text,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint perfil_portfolio_titulo_longitud check (char_length(btrim(titulo)) between 1 and 120),
  constraint perfil_portfolio_anio_check check (anio is null or anio between 1900 and 2100),
  constraint perfil_portfolio_rol_longitud check (rol is null or char_length(rol) <= 120),
  constraint perfil_portfolio_compania_longitud check (compania is null or char_length(compania) <= 120),
  constraint perfil_portfolio_descripcion_longitud check (descripcion is null or char_length(descripcion) <= 500),
  constraint perfil_portfolio_imagen_propia check (imagen_ruta is null or imagen_ruta like profile_id::text || '/%'),
  constraint perfil_portfolio_enlace_https check (enlace is null or enlace ~* '^https://[^\s/?#]+[^\s]*$')
);

create index perfil_portfolio_perfil_idx on public.perfil_portfolio (profile_id, orden);
create index perfil_portfolio_recientes_idx on public.perfil_portfolio (created_at desc);

create trigger perfil_portfolio_limite
  before insert on public.perfil_portfolio
  for each row execute function public.perfil_limite_multimedia('10');

create trigger perfil_portfolio_updated_at
  before update on public.perfil_portfolio
  for each row execute function public.update_updated_at();

-- 6. RLS de las tres tablas (mismas políticas en cada una).
do $$
declare
  t text;
begin
  foreach t in array array['perfil_galeria_fotos', 'perfil_galeria_videos', 'perfil_portfolio'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format($p$create policy "Público: perfiles públicos con plan de pago" on public.%I
      for select using (public.perfil_premium_visible(profile_id))$p$, t);
    execute format($p$create policy "Dueño: lectura" on public.%I
      for select using (profile_id = auth.uid())$p$, t);
    execute format($p$create policy "Moderación: lectura" on public.%I
      for select using (public.es_moderador())$p$, t);

    execute format($p$create policy "Dueño con plan de pago: creación" on public.%I
      for insert with check (profile_id = auth.uid() and public.plan_de_pago())$p$, t);
    execute format($p$create policy "Dueño con plan de pago: edición" on public.%I
      for update using (profile_id = auth.uid())
      with check (profile_id = auth.uid() and public.plan_de_pago())$p$, t);

    execute format($p$create policy "Dueño: borrado (aunque ya no pague)" on public.%I
      for delete using (profile_id = auth.uid())$p$, t);
    execute format($p$create policy "Moderación: retirada" on public.%I
      for delete using (public.es_moderador())$p$, t);

    execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
    execute format('revoke truncate on public.%I from authenticated', t);
  end loop;
end;
$$;

-- 7. Bucket público «galeria»: JPEG, PNG o WebP de hasta 5 MB, en
--    {profile_id}/... Subir o sustituir: solo en la carpeta propia y con plan
--    de pago. Borrar lo propio: siempre. Moderación puede retirar cualquiera.
--    Público para leer por URL (las rutas llevan un nombre aleatorio); lo que
--    decide qué se ENSEÑA en el perfil son las tablas de arriba.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galeria', 'galeria', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Galería: el dueño lee su carpeta"
  on storage.objects for select to authenticated
  using (bucket_id = 'galeria' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Galería: el dueño con plan de pago sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'galeria' and (storage.foldername(name))[1] = auth.uid()::text and public.plan_de_pago());

create policy "Galería: el dueño con plan de pago sustituye"
  on storage.objects for update to authenticated
  using (bucket_id = 'galeria' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'galeria' and (storage.foldername(name))[1] = auth.uid()::text and public.plan_de_pago());

create policy "Galería: el dueño borra lo suyo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'galeria' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Galería: moderación lee"
  on storage.objects for select to authenticated
  using (bucket_id = 'galeria' and public.es_moderador());

create policy "Galería: moderación retira"
  on storage.objects for delete to authenticated
  using (bucket_id = 'galeria' and public.es_moderador());

-- 8. Portada (bucket «covers», ya existente): subir o sustituir pasa a exigir
--    plan de pago. Hasta ahora solo se comprobaba la carpeta, y la política de
--    UPDATE no tenía WITH CHECK. Borrar la propia sigue siempre permitido y la
--    lectura pública no cambia. A 08-10-2026 el bucket no tiene ningún objeto.
drop policy if exists covers_owner_insert on storage.objects;
drop policy if exists covers_owner_update on storage.objects;

create policy covers_owner_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text and public.plan_de_pago());

create policy covers_owner_update
  on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text and public.plan_de_pago());
