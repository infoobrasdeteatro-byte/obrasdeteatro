-- =============================================================================
-- BASELINE SCHEMA — ObrasDeTeatro®
-- Exportado: 2026-07-08
-- Proyecto Supabase: pnsirwtiiurczjwrayza (eu-west-1)
-- Autor: Sprint INFRA-001 — exportación automática desde base de datos live
--
-- Este archivo representa el estado completo del schema en la fecha indicada.
-- Es un baseline consolidado equivalente a las 15 migraciones anteriores.
-- Para restaurar: ejecutar este archivo sobre un proyecto Supabase limpio,
-- luego el archivo de datos en supabase/backups/.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONES
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- -----------------------------------------------------------------------------
CREATE TYPE plan_suscripcion AS ENUM (
  'gratuito', 'premium', 'destacado', 'empresas'
);

CREATE TYPE tipo_perfil AS ENUM (
  'actor', 'director', 'dramaturgo', 'compania', 'productora',
  'teatro', 'festival', 'escuela', 'institucion', 'profesional', 'publico'
);

-- -----------------------------------------------------------------------------
-- TABLAS (en orden de dependencia)
-- -----------------------------------------------------------------------------

-- profiles depende de auth.users (FK añadida al final)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                       uuid          NOT NULL,
  nombre                   text          NOT NULL,
  apellidos                text,
  nombre_artistico         text,
  email                    text          NOT NULL,
  tipo_perfil              tipo_perfil   NOT NULL DEFAULT 'publico'::tipo_perfil,
  pais                     text          NOT NULL DEFAULT 'España'::text,
  ciudad                   text,
  idioma                   text          NOT NULL DEFAULT 'es'::text,
  plan                     plan_suscripcion NOT NULL DEFAULT 'gratuito'::plan_suscripcion,
  acepta_terminos          boolean       NOT NULL DEFAULT false,
  acepta_privacidad        boolean       NOT NULL DEFAULT false,
  mayor_de_edad            boolean       NOT NULL DEFAULT false,
  info_veraz               boolean       NOT NULL DEFAULT false,
  marketing_general        boolean       NOT NULL DEFAULT false,
  marketing_comercial      boolean       NOT NULL DEFAULT false,
  verificado               boolean       NOT NULL DEFAULT false,
  perfil_publico           boolean       NOT NULL DEFAULT true,
  activo                   boolean       NOT NULL DEFAULT true,
  scenaia_analisis         boolean       NOT NULL DEFAULT false,
  scenaia_recomendaciones  boolean       NOT NULL DEFAULT false,
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now(),
  slug                     text,
  bio                      text,
  avatar_url               text,
  cover_url                text,
  phone                    text,
  is_premium               boolean       NOT NULL DEFAULT false,
  deleted_at               timestamptz,
  country_code             varchar(2),
  region                   text,
  postal_code              text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.institutions (
  id           uuid        NOT NULL DEFAULT uuid_generate_v4(),
  name         text        NOT NULL,
  slug         text        NOT NULL,
  type         text        NOT NULL,
  country_code text,
  website      text,
  is_public    boolean     NOT NULL DEFAULT true,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institutions_pkey      PRIMARY KEY (id),
  CONSTRAINT institutions_slug_key  UNIQUE (slug),
  CONSTRAINT institutions_type_check CHECK (
    type = ANY (ARRAY['platform','editorial','university','cultural_org','foundation','festival','other'])
  )
);

CREATE TABLE IF NOT EXISTS public.works (
  id               uuid        NOT NULL DEFAULT uuid_generate_v4(),
  profile_id       uuid,
  institution_id   uuid,
  title            text        NOT NULL,
  subtitle         text,
  author           text,
  synopsis         text,
  synopsis_short   text,
  synopsis_full    text,
  genre            text,
  secondary_genres text[]      DEFAULT '{}'::text[],
  duration_minutes integer,
  min_age          integer,
  cast_size_min    integer,
  cast_size_max    integer,
  language         text        DEFAULT 'es'::text,
  country_code     text,
  year             integer,
  rights_status    text,
  rights_manager   text,
  access_type      text        DEFAULT 'private'::text,
  cover_image_url  text,
  source_name      text,
  source_url       text,
  is_library_work  boolean     NOT NULL DEFAULT false,
  is_published     boolean     DEFAULT false,
  is_featured      boolean     DEFAULT false,
  view_count       integer     DEFAULT 0,
  slug             text,
  deleted_at       timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT works_pkey          PRIMARY KEY (id),
  CONSTRAINT works_single_owner  CHECK (
    ((profile_id IS NOT NULL) AND (institution_id IS NULL)) OR
    ((profile_id IS NULL)     AND (institution_id IS NOT NULL))
  )
);

CREATE TABLE IF NOT EXISTS public.work_files (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  work_id     uuid        NOT NULL,
  file_type   text        NOT NULL,
  file_url    text        NOT NULL,
  file_name   text,
  file_size   integer,
  is_public   boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT work_files_pkey            PRIMARY KEY (id),
  CONSTRAINT work_files_file_type_check CHECK (
    file_type = ANY (ARRAY['script','image','video','audio','document'])
  )
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       uuid        NOT NULL DEFAULT uuid_generate_v4(),
  profile_id               uuid        NOT NULL,
  stripe_subscription_id   text,
  stripe_customer_id       text,
  stripe_price_id          text,
  plan                     text        NOT NULL,
  status                   text        NOT NULL,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean     DEFAULT false,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_pkey                       PRIMARY KEY (id),
  CONSTRAINT subscriptions_profile_id_key             UNIQUE (profile_id),
  CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id),
  CONSTRAINT subscriptions_plan_check   CHECK (plan   = ANY (ARRAY['premium','destacado','empresas'])),
  CONSTRAINT subscriptions_status_check CHECK (status = ANY (ARRAY['active','canceled','past_due','trialing']))
);

CREATE TABLE IF NOT EXISTS public.profile_roles (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  profile_id  uuid        NOT NULL,
  role        text        NOT NULL,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT profile_roles_pkey              PRIMARY KEY (id),
  CONSTRAINT profile_roles_profile_id_role_key UNIQUE (profile_id, role),
  CONSTRAINT profile_roles_role_check        CHECK (role = ANY (ARRAY['admin','moderator','editor']))
);

CREATE TABLE IF NOT EXISTS public.ai_requests (
  id           uuid        NOT NULL DEFAULT uuid_generate_v4(),
  profile_id   uuid        NOT NULL,
  request_type text        NOT NULL,
  prompt       text,
  response     text,
  tokens_used  integer,
  created_at   timestamptz DEFAULT now(),
  CONSTRAINT ai_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  profile_id  uuid,
  action      text        NOT NULL,
  table_name  text,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  text,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.calls (
  id           uuid        NOT NULL DEFAULT uuid_generate_v4(),
  profile_id   uuid        NOT NULL,
  title        text        NOT NULL,
  description  text,
  call_type    text,
  location     text,
  deadline     timestamptz,
  prize_amount numeric,
  is_published boolean     DEFAULT false,
  is_featured  boolean     DEFAULT false,
  view_count   integer     DEFAULT 0,
  slug         text,
  deleted_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  CONSTRAINT calls_pkey           PRIMARY KEY (id),
  CONSTRAINT calls_call_type_check CHECK (
    call_type = ANY (ARRAY['residencia','premio','subvencion','festival','otro'])
  )
);

CREATE TABLE IF NOT EXISTS public.castings (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL,
  titulo                text        NOT NULL,
  nombre_proyecto       text        NOT NULL,
  entidad_organizadora  text        NOT NULL,
  tipo_entidad          text,
  descripcion           text        NOT NULL,
  sinopsis              text,
  tipo_teatro           boolean     DEFAULT false,
  tipo_musical          boolean     DEFAULT false,
  tipo_audiovisual      boolean     DEFAULT false,
  tipo_danza            boolean     DEFAULT false,
  tipo_otro             text,
  perfil_nombre         text        NOT NULL,
  perfil_descripcion    text        NOT NULL,
  edad_min              integer,
  edad_max              integer,
  genero_escenico       text,
  idiomas_requeridos    text[],
  experiencia_requerida text,
  formacion_requerida   text,
  habilidades_especiales text,
  remunerado            boolean     DEFAULT false,
  importe               text,
  fechas_previstas      text,
  lugar_trabajo         text,
  pais                  text,
  ciudad                text,
  fecha_apertura        date        NOT NULL,
  fecha_cierre          date        NOT NULL,
  modalidad             text,
  descripcion_proceso   text,
  forma_candidatura     text,
  email_recepcion       text,
  url_externa           text,
  estado                text        NOT NULL DEFAULT 'pendiente'::text,
  publicado             boolean     DEFAULT false,
  destacado             boolean     DEFAULT false,
  scenaia_activo        boolean     DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT castings_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.casting_applications (
  id           uuid        NOT NULL DEFAULT uuid_generate_v4(),
  casting_id   uuid        NOT NULL,
  applicant_id uuid        NOT NULL,
  cover_letter text,
  portfolio_url text,
  status       text        DEFAULT 'pending'::text,
  applied_at   timestamptz DEFAULT now(),
  notes        text,
  reviewed_at  timestamptz,
  reviewer_id  uuid,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT casting_applications_pkey               PRIMARY KEY (id),
  CONSTRAINT unique_application                      UNIQUE (casting_id, applicant_id),
  CONSTRAINT casting_applications_status_check CHECK (
    status = ANY (ARRAY['pending','reviewed','selected','rejected'])
  )
);

CREATE TABLE IF NOT EXISTS public.events (
  id             uuid        NOT NULL DEFAULT uuid_generate_v4(),
  profile_id     uuid        NOT NULL,
  title          text        NOT NULL,
  description    text,
  venue          text,
  location       text,
  event_date     timestamptz,
  event_end_date timestamptz,
  ticket_url     text,
  price_from     numeric,
  is_free        boolean     DEFAULT false,
  is_published   boolean     DEFAULT false,
  is_featured    boolean     DEFAULT false,
  view_count     integer     DEFAULT 0,
  deleted_at     timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id                 uuid        NOT NULL DEFAULT uuid_generate_v4(),
  event_id           uuid        NOT NULL,
  ticket_type        text        NOT NULL,
  price              numeric     NOT NULL DEFAULT 0,
  total_quantity     integer,
  available_quantity integer,
  sale_start         timestamptz,
  sale_end           timestamptz,
  created_at         timestamptz DEFAULT now(),
  CONSTRAINT tickets_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.ticket_orders (
  id                      uuid        NOT NULL DEFAULT uuid_generate_v4(),
  ticket_id               uuid        NOT NULL,
  buyer_id                uuid        NOT NULL,
  quantity                integer     NOT NULL DEFAULT 1,
  total_amount            numeric     NOT NULL,
  status                  text        DEFAULT 'pending'::text,
  stripe_payment_intent_id text,
  purchased_at            timestamptz DEFAULT now(),
  CONSTRAINT ticket_orders_pkey         PRIMARY KEY (id),
  CONSTRAINT ticket_orders_status_check CHECK (
    status = ANY (ARRAY['pending','confirmed','cancelled','refunded'])
  )
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id              uuid        NOT NULL DEFAULT uuid_generate_v4(),
  participant_1   uuid        NOT NULL,
  participant_2   uuid        NOT NULL,
  last_message_at timestamptz,
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT conversations_pkey                           PRIMARY KEY (id),
  CONSTRAINT conversations_participant_1_participant_2_key UNIQUE (participant_1, participant_2)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid        NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid        NOT NULL,
  sender_id       uuid        NOT NULL,
  content         text        NOT NULL,
  is_read         boolean     DEFAULT false,
  sent_at         timestamptz DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  profile_id  uuid        NOT NULL,
  type        text        NOT NULL,
  title       text        NOT NULL,
  body        text,
  is_read     boolean     DEFAULT false,
  related_url text,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.reports (
  id                  uuid        NOT NULL DEFAULT uuid_generate_v4(),
  reporter_id         uuid        NOT NULL,
  reported_profile_id uuid,
  reported_work_id    uuid,
  reason              text        NOT NULL,
  description         text,
  status              text        DEFAULT 'open'::text,
  created_at          timestamptz DEFAULT now(),
  resolved_at         timestamptz,
  CONSTRAINT reports_pkey         PRIMARY KEY (id),
  CONSTRAINT reports_status_check CHECK (
    status = ANY (ARRAY['open','reviewing','resolved','dismissed'])
  )
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id           uuid        NOT NULL DEFAULT uuid_generate_v4(),
  profile_id   uuid        NOT NULL,
  document_url text,
  notes        text,
  status       text        DEFAULT 'pending'::text,
  reviewed_by  uuid,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at  timestamptz,
  CONSTRAINT verification_requests_pkey         PRIMARY KEY (id),
  CONSTRAINT verification_requests_status_check CHECK (
    status = ANY (ARRAY['pending','approved','rejected'])
  )
);

CREATE TABLE IF NOT EXISTS public.work_rights_requests (
  id               uuid        NOT NULL DEFAULT uuid_generate_v4(),
  work_id          uuid        NOT NULL,
  requester_id     uuid        NOT NULL,
  status           text        DEFAULT 'pending'::text,
  message          text,
  response_message text,
  requested_at     timestamptz DEFAULT now(),
  responded_at     timestamptz,
  CONSTRAINT work_rights_requests_pkey         PRIMARY KEY (id),
  CONSTRAINT work_rights_requests_status_check CHECK (
    status = ANY (ARRAY['pending','approved','rejected','negotiating'])
  )
);

-- Perfiles específicos por tipo (todos referencian profiles.id)
CREATE TABLE IF NOT EXISTS public.perfil_actor (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id                  uuid        NOT NULL,
  fecha_nacimiento         date,
  nacionalidad             text,
  foto_principal           text,
  biografia                text,
  experiencia              text,
  formacion                text,
  premios                  text,
  genero                   text,
  altura                   integer,
  idiomas                  text[],
  acentos                  text[],
  habilidad_canto          boolean DEFAULT false,
  habilidad_danza          boolean DEFAULT false,
  habilidad_improvisacion  boolean DEFAULT false,
  habilidad_esgrima        boolean DEFAULT false,
  habilidad_musical        boolean DEFAULT false,
  habilidad_doblaje        boolean DEFAULT false,
  habilidad_presentacion   boolean DEFAULT false,
  habilidad_magia          boolean DEFAULT false,
  habilidad_circo          boolean DEFAULT false,
  otras_habilidades        text,
  disp_castings            boolean DEFAULT false,
  disp_teatro              boolean DEFAULT false,
  disp_cine                boolean DEFAULT false,
  disp_television          boolean DEFAULT false,
  disp_publicidad          boolean DEFAULT false,
  disp_giras               boolean DEFAULT false,
  disp_internacional       boolean DEFAULT false,
  web                      text,
  email_profesional        text,
  telefono                 text,
  whatsapp                 text,
  instagram                text,
  facebook                 text,
  tiktok                   text,
  linkedin                 text,
  youtube                  text,
  mostrar_email            boolean DEFAULT false,
  mostrar_telefono         boolean DEFAULT false,
  mostrar_whatsapp         boolean DEFAULT false,
  mostrar_redes            boolean DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfil_actor_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.perfil_director (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL,
  fecha_nacimiento      date,
  nacionalidad          text,
  foto_principal        text,
  biografia             text,
  trayectoria           text,
  formacion             text,
  premios               text,
  esp_clasico           boolean DEFAULT false,
  esp_contemporaneo     boolean DEFAULT false,
  esp_musical           boolean DEFAULT false,
  esp_infantil          boolean DEFAULT false,
  esp_experimental      boolean DEFAULT false,
  esp_opera             boolean DEFAULT false,
  esp_zarzuela          boolean DEFAULT false,
  esp_performance       boolean DEFAULT false,
  esp_comunitario       boolean DEFAULT false,
  otras_especialidades  text,
  disp_proyectos        boolean DEFAULT false,
  disp_coproducciones   boolean DEFAULT false,
  disp_festivales       boolean DEFAULT false,
  disp_giras            boolean DEFAULT false,
  disp_internacional    boolean DEFAULT false,
  disp_formacion        boolean DEFAULT false,
  web                   text,
  email_profesional     text,
  telefono              text,
  whatsapp              text,
  instagram             text,
  facebook              text,
  tiktok                text,
  linkedin              text,
  youtube               text,
  mostrar_email         boolean DEFAULT false,
  mostrar_telefono      boolean DEFAULT false,
  mostrar_redes         boolean DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfil_director_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.perfil_dramaturgo (
  id                              uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id                         uuid        NOT NULL,
  fecha_nacimiento                date,
  nacionalidad                    text,
  foto_principal                  text,
  biografia                       text,
  trayectoria                     text,
  formacion                       text,
  premios                         text,
  esp_comedia                     boolean DEFAULT false,
  esp_drama                       boolean DEFAULT false,
  esp_tragedia                    boolean DEFAULT false,
  esp_musical                     boolean DEFAULT false,
  esp_infantil                    boolean DEFAULT false,
  esp_experimental                boolean DEFAULT false,
  esp_historico                   boolean DEFAULT false,
  esp_monologo                    boolean DEFAULT false,
  esp_microteatro                 boolean DEFAULT false,
  otras_especialidades            text,
  total_obras_escritas            integer DEFAULT 0,
  total_obras_estrenadas          integer DEFAULT 0,
  total_obras_publicadas          integer DEFAULT 0,
  acepta_solicitudes_representacion boolean DEFAULT false,
  acepta_licenciamiento           boolean DEFAULT false,
  acepta_publicacion_editorial    boolean DEFAULT false,
  acepta_traduccion               boolean DEFAULT false,
  acepta_adaptacion_audiovisual   boolean DEFAULT false,
  web                             text,
  email_profesional               text,
  telefono                        text,
  whatsapp                        text,
  instagram                       text,
  facebook                        text,
  tiktok                          text,
  linkedin                        text,
  youtube                         text,
  mostrar_email                   boolean DEFAULT false,
  mostrar_telefono                boolean DEFAULT false,
  mostrar_redes                   boolean DEFAULT true,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfil_dramaturgo_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.perfil_compania (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL,
  nombre_compania       text        NOT NULL,
  nombre_comercial      text,
  anio_fundacion        integer,
  direccion             text,
  nif_cif               text,
  logo                  text,
  descripcion           text,
  historia              text,
  mision                text,
  vision                text,
  valores               text,
  num_producciones      integer DEFAULT 0,
  num_integrantes       integer DEFAULT 0,
  tipo_clasico          boolean DEFAULT false,
  tipo_contemporaneo    boolean DEFAULT false,
  tipo_musical          boolean DEFAULT false,
  tipo_infantil         boolean DEFAULT false,
  tipo_experimental     boolean DEFAULT false,
  tipo_comunitario      boolean DEFAULT false,
  tipo_profesional      boolean DEFAULT false,
  tipo_amateur          boolean DEFAULT false,
  serv_contratacion     boolean DEFAULT false,
  serv_coproducciones   boolean DEFAULT false,
  serv_giras            boolean DEFAULT false,
  serv_formacion        boolean DEFAULT false,
  serv_internacional    boolean DEFAULT false,
  responsable_nombre    text,
  responsable_cargo     text,
  responsable_email     text,
  responsable_telefono  text,
  web                   text,
  email_corporativo     text,
  telefono              text,
  whatsapp              text,
  instagram             text,
  facebook              text,
  tiktok                text,
  linkedin              text,
  youtube               text,
  verificado_solicitado boolean DEFAULT false,
  mostrar_contacto      boolean DEFAULT true,
  mostrar_responsable   boolean DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfil_compania_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.perfil_productora (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id                  uuid        NOT NULL,
  nombre_productora        text        NOT NULL,
  nombre_comercial         text,
  anio_fundacion           integer,
  direccion                text,
  nif_cif                  text,
  logo                     text,
  descripcion              text,
  historia                 text,
  num_producciones         integer DEFAULT 0,
  num_proyectos_activos    integer DEFAULT 0,
  tipo_teatral             boolean DEFAULT false,
  tipo_audiovisual         boolean DEFAULT false,
  tipo_musical             boolean DEFAULT false,
  tipo_eventos             boolean DEFAULT false,
  tipo_festivales          boolean DEFAULT false,
  tipo_independiente       boolean DEFAULT false,
  tipo_distribucion        boolean DEFAULT false,
  tipo_gestion_cultural    boolean DEFAULT false,
  tipo_coproducciones_int  boolean DEFAULT false,
  responsable_nombre       text        NOT NULL,
  responsable_cargo        text        NOT NULL,
  responsable_email        text        NOT NULL,
  responsable_telefono     text,
  web                      text,
  email_corporativo        text,
  telefono                 text,
  whatsapp                 text,
  instagram                text,
  facebook                 text,
  tiktok                   text,
  linkedin                 text,
  youtube                  text,
  verificado_solicitado    boolean DEFAULT false,
  mostrar_contacto         boolean DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfil_productora_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.perfil_teatro (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id                  uuid        NOT NULL,
  nombre_teatro            text        NOT NULL,
  nombre_comercial         text,
  anio_fundacion           integer,
  direccion                text        NOT NULL,
  codigo_postal            text,
  logo                     text,
  descripcion              text,
  historia                 text,
  naturaleza_juridica      text,
  capacidad_total          integer,
  num_salas                integer DEFAULT 1,
  tipo_escenario           text,
  accesibilidad_pmr        boolean DEFAULT false,
  accesibilidad_ascensor   boolean DEFAULT false,
  accesibilidad_bucle      boolean DEFAULT false,
  descripcion_tecnica      text,
  usa_ticketing_obrasdeteatro boolean DEFAULT false,
  url_ticketing_externo    text,
  disponible_alquiler      boolean DEFAULT false,
  disponible_ensayos       boolean DEFAULT false,
  responsable_nombre       text        NOT NULL,
  responsable_cargo        text        NOT NULL,
  responsable_email        text        NOT NULL,
  responsable_telefono     text,
  web                      text,
  email_oficial            text,
  telefono                 text,
  whatsapp                 text,
  instagram                text,
  facebook                 text,
  tiktok                   text,
  linkedin                 text,
  youtube                  text,
  verificado_solicitado    boolean DEFAULT false,
  mostrar_contacto         boolean DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfil_teatro_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.perfil_festival (
  id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id                   uuid        NOT NULL,
  nombre_festival           text        NOT NULL,
  nombre_comercial          text,
  anio_fundacion            integer,
  direccion                 text,
  codigo_postal             text,
  logo                      text,
  descripcion               text,
  historia                  text,
  entidad_organizadora      text        NOT NULL,
  naturaleza_juridica       text,
  tipo_clasico              boolean DEFAULT false,
  tipo_contemporaneo        boolean DEFAULT false,
  tipo_musical              boolean DEFAULT false,
  tipo_infantil             boolean DEFAULT false,
  tipo_experimental         boolean DEFAULT false,
  tipo_multidisciplinar     boolean DEFAULT false,
  periodicidad              text,
  num_asistentes            integer,
  num_companias             integer,
  publica_convocatorias     boolean DEFAULT false,
  acepta_postulaciones      boolean DEFAULT false,
  ofrece_residencias        boolean DEFAULT false,
  concede_premios           boolean DEFAULT false,
  usa_ticketing_obrasdeteatro boolean DEFAULT false,
  url_ticketing_externo     text,
  responsable_nombre        text        NOT NULL,
  responsable_cargo         text        NOT NULL,
  responsable_email         text        NOT NULL,
  responsable_telefono      text,
  web                       text,
  email_oficial             text,
  telefono                  text,
  whatsapp                  text,
  instagram                 text,
  facebook                  text,
  tiktok                    text,
  linkedin                  text,
  youtube                   text,
  verificado_solicitado     boolean DEFAULT false,
  mostrar_contacto          boolean DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfil_festival_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.perfil_escuela (
  id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id                   uuid        NOT NULL,
  nombre_escuela            text        NOT NULL,
  nombre_comercial          text,
  anio_fundacion            integer,
  direccion                 text,
  codigo_postal             text,
  logo                      text,
  descripcion               text,
  historia                  text,
  entidad_responsable       text,
  naturaleza_juridica       text,
  form_interpretacion       boolean DEFAULT false,
  form_direccion            boolean DEFAULT false,
  form_dramaturgia          boolean DEFAULT false,
  form_musical              boolean DEFAULT false,
  form_danza                boolean DEFAULT false,
  form_voz                  boolean DEFAULT false,
  form_improvisacion        boolean DEFAULT false,
  form_produccion           boolean DEFAULT false,
  form_gestion_cultural     boolean DEFAULT false,
  num_estudiantes           integer,
  perfil_estudiantes        text,
  ofrece_becas              boolean DEFAULT false,
  ofrece_ayudas             boolean DEFAULT false,
  ofrece_residencias        boolean DEFAULT false,
  ofrece_practicas          boolean DEFAULT false,
  descripcion_becas         text,
  responsable_nombre        text        NOT NULL,
  responsable_cargo         text        NOT NULL,
  responsable_email         text        NOT NULL,
  responsable_telefono      text,
  web                       text,
  email_oficial             text,
  telefono                  text,
  whatsapp                  text,
  instagram                 text,
  facebook                  text,
  tiktok                    text,
  linkedin                  text,
  youtube                   text,
  verificado_solicitado     boolean DEFAULT false,
  mostrar_contacto          boolean DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfil_escuela_pkey PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- FOREIGN KEYS (después de crear todas las tablas)
-- -----------------------------------------------------------------------------

-- profiles → auth.users
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- works
ALTER TABLE public.works
  ADD CONSTRAINT works_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT works_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE RESTRICT;

-- work_files
ALTER TABLE public.work_files
  ADD CONSTRAINT work_files_work_id_fkey
    FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE;

-- subscriptions
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- profile_roles
ALTER TABLE public.profile_roles
  ADD CONSTRAINT profile_roles_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ai_requests
ALTER TABLE public.ai_requests
  ADD CONSTRAINT ai_requests_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- audit_logs
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- calls
ALTER TABLE public.calls
  ADD CONSTRAINT calls_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- castings
ALTER TABLE public.castings
  ADD CONSTRAINT castings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- casting_applications
ALTER TABLE public.casting_applications
  ADD CONSTRAINT casting_applications_casting_id_fkey
    FOREIGN KEY (casting_id) REFERENCES public.castings(id) ON DELETE CASCADE,
  ADD CONSTRAINT casting_applications_applicant_id_fkey
    FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT casting_applications_reviewer_id_fkey
    FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id);

-- events
ALTER TABLE public.events
  ADD CONSTRAINT events_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- tickets
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- ticket_orders
ALTER TABLE public.ticket_orders
  ADD CONSTRAINT ticket_orders_ticket_id_fkey
    FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE,
  ADD CONSTRAINT ticket_orders_buyer_id_fkey
    FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- conversations
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_participant_1_fkey
    FOREIGN KEY (participant_1) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT conversations_participant_2_fkey
    FOREIGN KEY (participant_2) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- messages
ALTER TABLE public.messages
  ADD CONSTRAINT messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- reports
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT reports_reported_profile_id_fkey
    FOREIGN KEY (reported_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT reports_reported_work_id_fkey
    FOREIGN KEY (reported_work_id) REFERENCES public.works(id) ON DELETE SET NULL;

-- verification_requests
ALTER TABLE public.verification_requests
  ADD CONSTRAINT verification_requests_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT verification_requests_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- work_rights_requests
ALTER TABLE public.work_rights_requests
  ADD CONSTRAINT work_rights_requests_work_id_fkey
    FOREIGN KEY (work_id) REFERENCES public.works(id) ON DELETE CASCADE,
  ADD CONSTRAINT work_rights_requests_requester_id_fkey
    FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- perfil_* tables
ALTER TABLE public.perfil_actor      ADD CONSTRAINT perfil_actor_user_id_fkey      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.perfil_director   ADD CONSTRAINT perfil_director_user_id_fkey   FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.perfil_dramaturgo ADD CONSTRAINT perfil_dramaturgo_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.perfil_compania   ADD CONSTRAINT perfil_compania_user_id_fkey   FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.perfil_productora ADD CONSTRAINT perfil_productora_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.perfil_teatro     ADD CONSTRAINT perfil_teatro_user_id_fkey     FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.perfil_festival   ADD CONSTRAINT perfil_festival_user_id_fkey   FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.perfil_escuela    ADD CONSTRAINT perfil_escuela_user_id_fkey    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- FUNCIONES
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at()
  RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.auto_slug_profile()
  RETURNS trigger LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter   INT := 0;
BEGIN
  base_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NULLIF(TRIM(NEW.nombre_artistico), ''), TRIM(NEW.nombre), NEW.id::text),
    '[^a-z0-9]+', '-', 'g'
  ));
  candidate := base_slug;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM profiles WHERE slug = candidate AND id <> NEW.id AND deleted_at IS NULL
    );
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;
-- NOTA: Bug conocido — REGEXP_REPLACE('[^a-z0-9]+') elimina mayúsculas antes del LOWER(),
-- generando slugs rotos para nombres con mayúsculas iniciales (ej. "Héctor" → "-ctor").
-- Pendiente de corrección en sprint dedicado.

CREATE OR REPLACE FUNCTION public.auto_slug_works()
  RETURNS trigger LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter   INT := 0;
BEGIN
  base_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NULLIF(TRIM(NEW.title), ''), NEW.id::text),
    '[^a-z0-9]+', '-', 'g'
  ));
  candidate := base_slug;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM works WHERE slug = candidate AND id <> NEW.id AND deleted_at IS NULL
    );
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_slug_calls()
  RETURNS trigger LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter   INT := 0;
BEGIN
  base_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NULLIF(TRIM(NEW.title), ''), NEW.id::text),
    '[^a-z0-9]+', '-', 'g'
  ));
  candidate := base_slug;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM calls WHERE slug = candidate AND id <> NEW.id AND deleted_at IS NULL
    );
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      NULLIF(TRIM(new.raw_user_meta_data->>'nombre'), ''),
      NULLIF(TRIM(new.raw_user_meta_data->>'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  RETURN new;
END;
$$;

-- -----------------------------------------------------------------------------
-- TRIGGERS
-- -----------------------------------------------------------------------------

-- updated_at automático
CREATE TRIGGER profiles_updated_at        BEFORE UPDATE ON public.profiles        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at   BEFORE UPDATE ON public.subscriptions   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER works_updated_at           BEFORE UPDATE ON public.works           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER calls_updated_at           BEFORE UPDATE ON public.calls           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER castings_updated_at        BEFORE UPDATE ON public.castings        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER casting_applications_updated_at BEFORE UPDATE ON public.casting_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at          BEFORE UPDATE ON public.events          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER actor_updated_at           BEFORE UPDATE ON public.perfil_actor    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER director_updated_at        BEFORE UPDATE ON public.perfil_director FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER dramaturgo_updated_at      BEFORE UPDATE ON public.perfil_dramaturgo FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER compania_updated_at        BEFORE UPDATE ON public.perfil_compania FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER productora_updated_at      BEFORE UPDATE ON public.perfil_productora FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER teatro_updated_at          BEFORE UPDATE ON public.perfil_teatro   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER festival_updated_at        BEFORE UPDATE ON public.perfil_festival FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER escuela_updated_at         BEFORE UPDATE ON public.perfil_escuela  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- slugs automáticos (solo si slug IS NULL en INSERT)
CREATE TRIGGER profiles_auto_slug BEFORE INSERT ON public.profiles
  FOR EACH ROW WHEN (NEW.slug IS NULL) EXECUTE FUNCTION auto_slug_profile();

CREATE TRIGGER works_auto_slug BEFORE INSERT ON public.works
  FOR EACH ROW WHEN (NEW.slug IS NULL) EXECUTE FUNCTION auto_slug_works();

CREATE TRIGGER calls_auto_slug BEFORE INSERT ON public.calls
  FOR EACH ROW WHEN (NEW.slug IS NULL) EXECUTE FUNCTION auto_slug_calls();

-- handle_new_user: trigger en auth.users (schema auth — ejecutar con privilegios)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- NOTA: Este trigger vive en auth.users y requiere acceso de superadmin para recrearse.
-- Supabase lo gestiona automáticamente; se documenta aquí como referencia.

-- -----------------------------------------------------------------------------
-- ÍNDICES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_tipo_perfil
  ON public.profiles (tipo_perfil)
  WHERE deleted_at IS NULL AND perfil_publico = true;

CREATE INDEX IF NOT EXISTS idx_profiles_country_code
  ON public.profiles (country_code)
  WHERE deleted_at IS NULL AND perfil_publico = true;

CREATE INDEX IF NOT EXISTS idx_profiles_region
  ON public.profiles (region)
  WHERE deleted_at IS NULL AND perfil_publico = true;

CREATE INDEX IF NOT EXISTS idx_profiles_country_tipo
  ON public.profiles (country_code, tipo_perfil)
  WHERE deleted_at IS NULL AND perfil_publico = true;

CREATE INDEX IF NOT EXISTS idx_works_institution_id
  ON public.works (institution_id)
  WHERE institution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_works_library
  ON public.works (is_library_work)
  WHERE is_library_work = true;

CREATE INDEX IF NOT EXISTS idx_works_access_type
  ON public.works (access_type)
  WHERE access_type IS NOT NULL AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_files            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.castings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casting_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_rights_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_actor          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_director       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_dramaturgo     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_compania       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_productora     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_teatro         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_festival       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_escuela        ENABLE ROW LEVEL SECURITY;

-- Políticas RLS — profiles
CREATE POLICY "Perfiles públicos visibles"    ON public.profiles FOR SELECT USING (perfil_publico = true AND activo = true);
CREATE POLICY "Perfil propio"                 ON public.profiles FOR ALL    USING (auth.uid() = id);
CREATE POLICY "Usuario edita su propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Inserción automática de perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS — institutions
CREATE POLICY "Instituciones públicas" ON public.institutions FOR SELECT USING (is_public = true AND is_active = true);

-- Políticas RLS — works
CREATE POLICY "Obras públicas" ON public.works FOR SELECT USING (is_published = true AND deleted_at IS NULL);
CREATE POLICY "Obra propia"    ON public.works FOR ALL    USING (auth.uid() = profile_id);

-- Políticas RLS — work_files
CREATE POLICY "Archivos de obra propia" ON public.work_files FOR ALL
  USING (auth.uid() IN (SELECT works.profile_id FROM works WHERE works.id = work_files.work_id));

-- Políticas RLS — subscriptions
CREATE POLICY "Suscripcion propia"                  ON public.subscriptions FOR ALL    USING (auth.uid() = profile_id);
CREATE POLICY "Suscripcion visible para service role" ON public.subscriptions FOR ALL TO service_role USING (true);

-- Políticas RLS — profile_roles
CREATE POLICY "Rol propio"               ON public.profile_roles FOR ALL    USING (auth.uid() = profile_id);
CREATE POLICY "Roles públicos visibles"  ON public.profile_roles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_roles.profile_id AND profiles.perfil_publico = true AND profiles.activo = true));

-- Políticas RLS — ai_requests
CREATE POLICY "Solicitud IA propia" ON public.ai_requests FOR ALL USING (auth.uid() = profile_id);

-- Políticas RLS — audit_logs
CREATE POLICY "Solo admin lee audit_logs" ON public.audit_logs FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'admin_role') = ANY (ARRAY['superadmin', 'moderator']));

-- Políticas RLS — calls
CREATE POLICY "Convocatorias públicas" ON public.calls FOR SELECT USING (is_published = true AND deleted_at IS NULL);
CREATE POLICY "Convocatoria propia"    ON public.calls FOR ALL    USING (auth.uid() = profile_id);

-- Políticas RLS — castings
CREATE POLICY "Castings públicos" ON public.castings FOR SELECT USING (publicado = true);
CREATE POLICY "Casting propio"    ON public.castings FOR ALL    USING (auth.uid() = user_id);

-- Políticas RLS — casting_applications
CREATE POLICY "Aplicacion propia"              ON public.casting_applications FOR ALL    USING (auth.uid() = applicant_id);
CREATE POLICY "Aplicaciones del casting propio" ON public.casting_applications FOR SELECT
  USING (auth.uid() IN (SELECT castings.user_id FROM castings WHERE castings.id = casting_applications.casting_id));
CREATE POLICY "Propietario gestiona aplicaciones" ON public.casting_applications FOR ALL
  USING (auth.uid() IN (SELECT castings.user_id FROM castings WHERE castings.id = casting_applications.casting_id));

-- Políticas RLS — events
CREATE POLICY "Eventos públicos" ON public.events FOR SELECT USING (is_published = true AND deleted_at IS NULL);
CREATE POLICY "Evento propio"    ON public.events FOR ALL    USING (auth.uid() = profile_id);

-- Políticas RLS — tickets
CREATE POLICY "Entradas visibles para compra" ON public.tickets FOR SELECT
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = tickets.event_id AND events.is_published = true));
CREATE POLICY "Entradas del evento propio"    ON public.tickets FOR ALL
  USING (auth.uid() IN (SELECT events.profile_id FROM events WHERE events.id = tickets.event_id));

-- Políticas RLS — ticket_orders
CREATE POLICY "Pedido propio" ON public.ticket_orders FOR ALL USING (auth.uid() = buyer_id);

-- Políticas RLS — conversations
CREATE POLICY "Conversación propia" ON public.conversations FOR ALL
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Políticas RLS — messages
CREATE POLICY "Mensaje en conversación propia" ON public.messages FOR ALL
  USING (auth.uid() = sender_id OR auth.uid() IN (
    SELECT conversations.participant_1 FROM conversations WHERE conversations.id = messages.conversation_id
    UNION
    SELECT conversations.participant_2 FROM conversations WHERE conversations.id = messages.conversation_id
  ));

-- Políticas RLS — notifications
CREATE POLICY "Notificación propia" ON public.notifications FOR ALL USING (auth.uid() = profile_id);

-- Políticas RLS — reports
CREATE POLICY "Crear reporte"              ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Ver propio reporte"         ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Moderador ve todos los reportes" ON public.reports FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'admin_role') = ANY (ARRAY['superadmin', 'moderator']));

-- Políticas RLS — verification_requests
CREATE POLICY "Solicitud de verificación propia" ON public.verification_requests FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Admin gestiona verificaciones"    ON public.verification_requests FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'admin_role') = ANY (ARRAY['superadmin', 'moderator']));

-- Políticas RLS — work_rights_requests
CREATE POLICY "Solicitud de derechos propia"     ON public.work_rights_requests FOR ALL USING (auth.uid() = requester_id);
CREATE POLICY "Ver solicitudes sobre obras propias" ON public.work_rights_requests FOR SELECT
  USING (auth.uid() IN (SELECT works.profile_id FROM works WHERE works.id = work_rights_requests.work_id));

-- Políticas RLS — perfil_actor
CREATE POLICY "Actor propio"           ON public.perfil_actor FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Perfil publico visible" ON public.perfil_actor FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = perfil_actor.user_id AND p.perfil_publico = true AND p.activo = true));

-- Políticas RLS — perfil_director
CREATE POLICY "Director propio"        ON public.perfil_director FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Perfil publico visible" ON public.perfil_director FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = perfil_director.user_id AND p.perfil_publico = true AND p.activo = true));

-- Políticas RLS — perfil_dramaturgo
CREATE POLICY "Dramaturgo propio"      ON public.perfil_dramaturgo FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Perfil publico visible" ON public.perfil_dramaturgo FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = perfil_dramaturgo.user_id AND p.perfil_publico = true AND p.activo = true));

-- Políticas RLS — perfil_compania
CREATE POLICY "Compania propia"        ON public.perfil_compania FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Perfil publico visible" ON public.perfil_compania FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = perfil_compania.user_id AND p.perfil_publico = true AND p.activo = true));

-- Políticas RLS — perfil_productora
CREATE POLICY "Productora propia"      ON public.perfil_productora FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Perfil publico visible" ON public.perfil_productora FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = perfil_productora.user_id AND p.perfil_publico = true AND p.activo = true));

-- Políticas RLS — perfil_teatro
CREATE POLICY "Teatro propio"          ON public.perfil_teatro FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Perfil publico visible" ON public.perfil_teatro FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = perfil_teatro.user_id AND p.perfil_publico = true AND p.activo = true));

-- Políticas RLS — perfil_festival
CREATE POLICY "Festival propio"        ON public.perfil_festival FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Perfil publico visible" ON public.perfil_festival FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = perfil_festival.user_id AND p.perfil_publico = true AND p.activo = true));

-- Políticas RLS — perfil_escuela
CREATE POLICY "Escuela propia"         ON public.perfil_escuela FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Perfil publico visible" ON public.perfil_escuela FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = perfil_escuela.user_id AND p.perfil_publico = true AND p.activo = true));
