-- Espacios escénicos: catálogo propio de teatros, auditorios, salas, centros
-- culturales y espacios al aire libre, SEPARADO de los perfiles.
--
-- Hasta ahora «Espacios Escénicos» del menú apuntaba a /directorio?tipo=teatro
-- (perfiles). Este catálogo no son perfiles: las fichas las carga la Redacción
-- (o vienen de OpenStreetMap / Wikidata) y el responsable de cada espacio
-- puede reclamarla. Al aprobarse la reclamación, gestionado_por apunta a su
-- perfil; en esta fase el responsable solo lee su ficha (también en borrador),
-- la edición llegará después.
--
-- PREPARADO PARA CRECER. Por países (pais_code de los 20 del ámbito, región de
-- lib/geo/countries.ts), y para enlazarse más adelante con la cartelera y la
-- venta de entradas: esas tablas apuntarán a espacios_escenicos.id; aquí no
-- hace falta nada más.
--
-- Contenido:
--   1. Tabla espacios_escenicos (+ slug, municipio_slug y nombre_normalizado
--      calculados por trigger con public.slugificar).
--   2. Tabla espacios_reclamaciones (+ trigger que rellena gestionado_por al
--      aprobar).
--   3. RLS de las dos tablas.
--   4. Primer lote: 40 espacios de Canarias, publicados.

-- 1. Espacios ----------------------------------------------------------------

create table public.espacios_escenicos (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  nombre text not null,
  tipo text not null,
  pais_code text not null,
  region text not null,
  provincia text,
  isla text,
  municipio text not null,
  -- Calculados por el trigger: no se escriben a mano.
  municipio_slug text not null default '',
  nombre_normalizado text not null default '',
  direccion text,
  lat double precision not null,
  lon double precision not null,
  web text,
  aforo integer,
  num_salas integer,
  descripcion text,
  fuente text not null default 'redaccion',
  fuente_ref text,
  estado text not null default 'borrador',
  gestionado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint espacios_escenicos_slug_unico unique (slug),
  constraint espacios_escenicos_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint espacios_escenicos_nombre_longitud check (char_length(btrim(nombre)) between 1 and 160),
  constraint espacios_escenicos_tipo_check check (tipo in ('teatro', 'auditorio', 'sala', 'centro_cultural', 'aire_libre')),
  -- Los 20 países del ámbito, la misma lista que lib/geo/countries.ts.
  constraint espacios_escenicos_pais_check check (pais_code in (
    'ES','AR','MX','CO','CL','PE','UY','PY','BO','EC',
    'VE','CR','PA','GT','HN','NI','SV','DO','CU','PR'
  )),
  constraint espacios_escenicos_region_longitud check (char_length(btrim(region)) between 1 and 80),
  constraint espacios_escenicos_municipio_longitud check (char_length(btrim(municipio)) between 1 and 120),
  constraint espacios_escenicos_direccion_longitud check (direccion is null or char_length(direccion) <= 200),
  constraint espacios_escenicos_lat_rango check (lat between -90 and 90),
  constraint espacios_escenicos_lon_rango check (lon between -180 and 180),
  -- https para todo lo nuevo (lo exige el formulario de admin). La base
  -- admite también http:// porque dos webs del primer lote no responden por
  -- https y se cargan tal cual vienen de la fuente.
  constraint espacios_escenicos_web_formato check (web is null or web ~* '^https?://[^\s/?#]+[^\s]*$'),
  constraint espacios_escenicos_aforo_positivo check (aforo is null or aforo > 0),
  constraint espacios_escenicos_num_salas_positivo check (num_salas is null or num_salas > 0),
  constraint espacios_escenicos_descripcion_longitud check (descripcion is null or char_length(descripcion) <= 600),
  constraint espacios_escenicos_fuente_check check (fuente in ('osm', 'wikidata', 'redaccion', 'responsable')),
  constraint espacios_escenicos_fuente_ref_longitud check (fuente_ref is null or char_length(fuente_ref) <= 120),
  constraint espacios_escenicos_estado_check check (estado in ('publicado', 'borrador', 'retirado'))
);

comment on table public.espacios_escenicos is
  'Catálogo de espacios escénicos, separado de los perfiles. Lectura pública solo de los publicados; escritura solo moderación. El responsable (gestionado_por) lee su ficha; la edición llegará en una fase posterior.';
comment on column public.espacios_escenicos.fuente_ref is
  'Identificador en la fuente: «node/123», «way/123» o «relation/123» de OpenStreetMap, o «Q123» de Wikidata.';
comment on column public.espacios_escenicos.gestionado_por is
  'Perfil responsable del espacio. Null hasta que se aprueba una reclamación (trigger espacios_reclamaciones_aprobar).';
comment on column public.espacios_escenicos.municipio_slug is
  'slugificar(municipio), para las páginas /espacios/<pais>/<municipio>. Lo calcula el trigger.';
comment on column public.espacios_escenicos.nombre_normalizado is
  'Nombre en minúsculas y sin tildes, para la búsqueda por nombre. Lo calcula el trigger.';

-- Buscador y páginas por municipio: siempre sobre los publicados.
create index espacios_escenicos_publicados_geo_idx
  on public.espacios_escenicos (pais_code, region, municipio_slug)
  where estado = 'publicado';
create index espacios_escenicos_gestionado_por_idx
  on public.espacios_escenicos (gestionado_por)
  where gestionado_por is not null;

-- Slug, municipio_slug y nombre_normalizado.
--
-- El slug se calcula al insertar si llega nulo o vacío, y no cambia después
-- (es la URL de la ficha). Ante colisión: primero «nombre-municipio» (dos
-- «Teatro Municipal» en sitios distintos), luego sufijo numérico.
create or replace function public.espacios_escenicos_calcular()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  counter   int := 1;
begin
  new.municipio_slug := public.slugificar(new.municipio);
  new.nombre_normalizado := lower(extensions.unaccent('extensions.unaccent'::regdictionary, new.nombre));

  if tg_op = 'INSERT' and (new.slug is null or btrim(new.slug) = '') then
    base_slug := public.slugificar(trim(new.nombre));
    if base_slug = '' then base_slug := 'espacio'; end if;

    candidate := base_slug;
    if exists (select 1 from public.espacios_escenicos where slug = candidate) then
      base_slug := base_slug || '-' || new.municipio_slug;
      candidate := base_slug;
      loop
        exit when not exists (select 1 from public.espacios_escenicos where slug = candidate);
        counter   := counter + 1;
        candidate := base_slug || '-' || counter;
      end loop;
    end if;
    new.slug := candidate;
  end if;

  return new;
end;
$$;

create trigger espacios_escenicos_calcular
  before insert or update of nombre, municipio, slug on public.espacios_escenicos
  for each row execute function public.espacios_escenicos_calcular();

create trigger espacios_escenicos_updated_at
  before update on public.espacios_escenicos
  for each row execute function public.update_updated_at();

-- 2. Reclamaciones -----------------------------------------------------------

create table public.espacios_reclamaciones (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references public.espacios_escenicos (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mensaje text not null,
  estado text not null default 'pendiente',
  created_at timestamptz not null default now(),
  resuelta_at timestamptz,

  constraint espacios_reclamaciones_mensaje_longitud check (char_length(btrim(mensaje)) between 10 and 500),
  constraint espacios_reclamaciones_estado_check check (estado in ('pendiente', 'aprobada', 'rechazada'))
);

comment on table public.espacios_reclamaciones is
  'Solicitudes para gestionar la ficha de un espacio. El usuario crea y ve las suyas; moderación las gestiona. Al aprobar, el trigger rellena espacios_escenicos.gestionado_por.';
comment on column public.espacios_reclamaciones.mensaje is
  'Cargo de quien reclama y forma de contacto (10–500 caracteres).';

-- Una sola reclamación pendiente por persona y espacio.
create unique index espacios_reclamaciones_una_pendiente
  on public.espacios_reclamaciones (espacio_id, profile_id)
  where estado = 'pendiente';
create index espacios_reclamaciones_bandeja_idx
  on public.espacios_reclamaciones (created_at desc)
  where estado = 'pendiente';
create index espacios_reclamaciones_profile_idx
  on public.espacios_reclamaciones (profile_id);

-- Al resolver: sella resuelta_at y, si se aprueba, el espacio pasa a estar
-- gestionado por quien reclamó. SECURITY DEFINER para que el efecto no
-- dependa de las políticas de quien aprueba (hoy siempre moderación).
create or replace function public.espacios_reclamaciones_resolver()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    new.resuelta_at := case when new.estado = 'pendiente' then null else now() end;
  end if;
  return new;
end;
$$;

create or replace function public.espacios_reclamaciones_aprobar()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if new.estado = 'aprobada' and old.estado is distinct from 'aprobada' then
    update public.espacios_escenicos
       set gestionado_por = new.profile_id
     where id = new.espacio_id;
  end if;
  return null;
end;
$$;

revoke execute on function public.espacios_reclamaciones_resolver() from public, anon, authenticated;
revoke execute on function public.espacios_reclamaciones_aprobar() from public, anon, authenticated;

create trigger espacios_reclamaciones_resolver
  before update of estado on public.espacios_reclamaciones
  for each row execute function public.espacios_reclamaciones_resolver();

create trigger espacios_reclamaciones_aprobar
  after update of estado on public.espacios_reclamaciones
  for each row execute function public.espacios_reclamaciones_aprobar();

-- 3. RLS ---------------------------------------------------------------------

alter table public.espacios_escenicos enable row level security;

create policy "Espacios publicados visibles"
  on public.espacios_escenicos for select
  using (estado = 'publicado');

create policy "Responsable lee su espacio"
  on public.espacios_escenicos for select to authenticated
  using (gestionado_por = auth.uid());

create policy "Moderación gestiona espacios"
  on public.espacios_escenicos for all
  using (public.es_moderador())
  with check (public.es_moderador());

revoke insert, update, delete, truncate on public.espacios_escenicos from anon;
revoke truncate on public.espacios_escenicos from authenticated;

alter table public.espacios_reclamaciones enable row level security;

create policy "Usuario crea su reclamación"
  on public.espacios_reclamaciones for insert to authenticated
  with check (
    profile_id = auth.uid()
    and estado = 'pendiente'
    and resuelta_at is null
    and exists (
      select 1 from public.espacios_escenicos e
      where e.id = espacio_id and e.estado = 'publicado'
    )
  );

create policy "Usuario ve sus reclamaciones"
  on public.espacios_reclamaciones for select to authenticated
  using (profile_id = auth.uid());

create policy "Moderación gestiona reclamaciones"
  on public.espacios_reclamaciones for all
  using (public.es_moderador())
  with check (public.es_moderador());

revoke all on public.espacios_reclamaciones from anon;
revoke truncate on public.espacios_reclamaciones from authenticated;

-- 4. Primer lote: 40 espacios de Canarias ------------------------------------
--
-- Fuente: OpenStreetMap (© colaboradores de OpenStreetMap, ODbL) y Wikidata.
-- Webs: las dos que venían en http:// y responden por https se cargan en
-- https (Teatro Guimerá, Teatro Cuyás). Orfeón La Paz (certificado no válido
-- para su dominio) y Teatro Guiniguada (404 en http y https) se dejan como
-- vienen. Comprobado el 2026-10-09.

insert into public.espacios_escenicos
  (nombre, tipo, pais_code, region, provincia, isla, municipio, web, lat, lon, fuente, fuente_ref, estado)
values
  ('Centro Cultural y Teatro Asabanos', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'El Hierro', 'Valverde', null, 27.81335, -17.91098, 'osm', 'node/4754224223', 'publicado'),
  ('Teatro Circo de Marte', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'La Palma', 'Santa Cruz de La Palma', 'https://www.santacruzdelapalma.es/circodemarte/', 28.68292, -17.76566, 'wikidata', 'Q6139658', 'publicado'),
  ('Teatro Chico', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'La Palma', 'Santa Cruz de La Palma', 'https://www.cineteatrochico.com/', 28.68424, -17.76436, 'wikidata', 'Q9082133', 'publicado'),
  ('Teatro Monterrey', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'La Palma', 'El Paso', null, 28.65159, -17.88168, 'osm', 'way/248867706', 'publicado'),
  ('Teatro Guimerá', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'Santa Cruz de Tenerife', 'https://www.teatroguimera.es/', 28.46595, -16.25066, 'wikidata', 'Q4891034', 'publicado'),
  ('Auditorio de Tenerife Adán Martín', 'auditorio', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'Santa Cruz de Tenerife', 'https://auditoriodetenerife.com/', 28.45608, -16.25130, 'wikidata', 'Q28964', 'publicado'),
  ('Teatro Victoria', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'Santa Cruz de Tenerife', null, 28.47003, -16.25405, 'osm', 'node/3876473125', 'publicado'),
  ('Teatro Leal', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'San Cristóbal de La Laguna', 'https://www.teatroleal.es/', 28.48968, -16.31812, 'wikidata', 'Q950052', 'publicado'),
  ('Paraninfo de la Universidad de La Laguna', 'auditorio', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'San Cristóbal de La Laguna', null, 28.48165, -16.31707, 'osm', 'node/919596734', 'publicado'),
  ('Orfeón La Paz', 'sala', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'San Cristóbal de La Laguna', 'http://orfeonlapaz.com/', 28.48964, -16.31658, 'osm', 'node/919596733', 'publicado'),
  ('Teatro Unión Tejina', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'San Cristóbal de La Laguna', 'https://www.teatrouniontejina.com/', 28.53374, -16.36259, 'wikidata', 'Q136100837', 'publicado'),
  ('Teatro El Sauzal', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'El Sauzal', null, 28.47887, -16.43656, 'osm', 'node/6832626766', 'publicado'),
  ('Auditorio Municipal Capitol', 'auditorio', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'Tacoronte', null, 28.47767, -16.41482, 'osm', 'way/757709118', 'publicado'),
  ('Auditorio Municipal de La Matanza de Acentejo', 'auditorio', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'La Matanza de Acentejo', null, 28.45023, -16.45235, 'osm', 'way/468354650', 'publicado'),
  ('Auditorio Teobaldo Power', 'auditorio', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'La Orotava', null, 28.39146, -16.52232, 'osm', 'node/2566164296', 'publicado'),
  ('Teatro Cine Los Realejos', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'Los Realejos', null, 28.38790, -16.58577, 'osm', 'relation/2632952', 'publicado'),
  ('Teatro-Cine Fajardo', 'teatro', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'Icod de los Vinos', null, 28.36892, -16.71821, 'osm', 'node/6983352695', 'publicado'),
  ('Auditorio Municipal Alfonso García Ramos', 'auditorio', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'Los Silos', null, 28.36638, -16.81980, 'osm', 'node/4868080630', 'publicado'),
  ('Auditorio de Adeje', 'auditorio', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'Adeje', 'https://www.auditoriodeadeje.es', 28.12259, -16.72500, 'osm', 'node/11702256508', 'publicado'),
  ('Pirámide de Arona', 'auditorio', 'ES', 'Canarias', 'Santa Cruz de Tenerife', 'Tenerife', 'Arona', null, 28.05454, -16.73123, 'osm', 'way/28530730', 'publicado'),
  ('Teatro Pérez Galdós', 'teatro', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Las Palmas de Gran Canaria', 'https://www.teatroperezgaldos.es/', 28.10364, -15.41407, 'wikidata', 'Q206404', 'publicado'),
  ('Auditorio Alfredo Kraus', 'auditorio', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Las Palmas de Gran Canaria', 'https://auditorioalfredokraus.es', 28.13022, -15.44901, 'wikidata', 'Q3629501', 'publicado'),
  ('Teatro Cuyás', 'teatro', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Las Palmas de Gran Canaria', 'https://www.teatrocuyas.com', 28.10647, -15.41830, 'wikidata', 'Q11951073', 'publicado'),
  ('Teatro Guiniguada', 'teatro', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Las Palmas de Gran Canaria', 'http://www.gobiernodecanarias.org/cultura/teatroguiniguada/index.html', 28.10192, -15.41493, 'wikidata', 'Q5946189', 'publicado'),
  ('Sala Insular de Teatro', 'sala', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Las Palmas de Gran Canaria', 'https://salainsulardeteatro.com/', 28.10734, -15.42087, 'osm', 'node/10269622609', 'publicado'),
  ('Auditorio José Antonio Ramos', 'auditorio', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Las Palmas de Gran Canaria', null, 28.12037, -15.42896, 'osm', 'way/1121010497', 'publicado'),
  ('Centro Cultural CICCA', 'centro_cultural', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Las Palmas de Gran Canaria', 'https://www.fundacionlacajadecanarias.es/centro-cultural-cicca/', 28.10226, -15.41637, 'osm', 'node/13102906711', 'publicado'),
  ('Teatro Consistorial de Gáldar', 'teatro', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Gáldar', null, 28.14443, -15.65539, 'wikidata', 'Q46836306', 'publicado'),
  ('Centro Cultural Guaires', 'centro_cultural', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Gáldar', null, 28.14481, -15.65759, 'osm', 'relation/10783289', 'publicado'),
  ('Auditorio de Teror', 'auditorio', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Teror', null, 28.05859, -15.54741, 'osm', 'node/5527811311', 'publicado'),
  ('Teatro Juan Ramón Jiménez', 'teatro', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Telde', null, 27.99855, -15.41371, 'osm', 'way/1238836445', 'publicado'),
  ('Auditorio José Vélez', 'auditorio', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Telde', null, 28.00069, -15.41083, 'osm', 'way/142600750', 'publicado'),
  ('Teatro Municipal de Agüimes', 'teatro', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Agüimes', null, 27.90737, -15.44695, 'osm', 'node/13570168597', 'publicado'),
  ('Teatro Víctor Jara', 'teatro', 'ES', 'Canarias', 'Las Palmas', 'Gran Canaria', 'Santa Lucía de Tirajana', null, 27.84496, -15.44377, 'osm', 'way/440241383', 'publicado'),
  ('Auditorio Insular de Fuerteventura', 'auditorio', 'ES', 'Canarias', 'Las Palmas', 'Fuerteventura', 'Puerto del Rosario', null, 28.50179, -13.85890, 'osm', 'way/624227238', 'publicado'),
  ('Auditorio de Gran Tarajal', 'auditorio', 'ES', 'Canarias', 'Las Palmas', 'Fuerteventura', 'Tuineje', null, 28.21230, -14.01884, 'osm', 'node/6782579340', 'publicado'),
  ('Auditorio Municipal de Corralejo', 'auditorio', 'ES', 'Canarias', 'Las Palmas', 'Fuerteventura', 'La Oliva', null, 28.72428, -13.87031, 'osm', 'node/331897104', 'publicado'),
  ('Teatro Víctor Fernández Gopar «El Salinero»', 'teatro', 'ES', 'Canarias', 'Las Palmas', 'Lanzarote', 'Arrecife', null, 28.96552, -13.55470, 'osm', 'way/194621707', 'publicado'),
  ('Teatro Municipal de San Bartolomé', 'teatro', 'ES', 'Canarias', 'Las Palmas', 'Lanzarote', 'San Bartolomé', 'https://culturalanzarote.com/centros-culturales/teatro-municipal-de-san-bartolome/', 29.00156, -13.61388, 'wikidata', 'Q129412124', 'publicado'),
  ('Teatro Municipal de Tías', 'teatro', 'ES', 'Canarias', 'Las Palmas', 'Lanzarote', 'Tías', null, 28.95380, -13.65323, 'osm', 'way/406112369', 'publicado');
