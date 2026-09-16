-- Perfiles Profesionales 2.0: currículum estructurado en 6 tablas.
--
-- CAPTURA DE UN CAMBIO YA APLICADO. Esta migración está aplicada en el
-- proyecto remoto y consta en su historial con la versión 20260708234009,
-- pero nunca tuvo fichero en supabase/migrations/. Este archivo NO introduce
-- nada nuevo: existe para que el repo refleje el estado real y no haya deriva
-- entre supabase/migrations/ y producción.
--
-- ERA LA LAGUNA MÁS GRAVE DEL REPOSITORIO. Las seis tablas que crea
-- (profile_specialties, professional_experience, profile_awards,
-- profile_training, profile_gallery y profile_availability) existen en
-- producción con RLS activa, y ningún fichero de este directorio contenía su
-- CREATE TABLE. Hasta ahora, un despliegue limpio desde el repo habría
-- producido una base de datos sin ellas.
--
-- ORIGEN DEL SQL. El texto que sigue es el contenido literal almacenado en
-- supabase_migrations.schema_migrations.statements para esa versión, extraído
-- en modo lectura el 2026-09-16. No se ha reescrito, reordenado ni completado:
-- es exactamente lo que se ejecutó contra la base de datos.
--
-- DEPENDENCIA EXTERNA. Los tres CREATE TRIGGER del final invocan
-- public.update_updated_at(), que esta migración no define: la da por
-- existente de antes.
--
-- NO SE REAPLICARÁ, Y ES IMPORTANTE QUE ASÍ SEA. Esta migración SÍ consta en
-- el historial del proyecto remoto. El nombre del fichero lleva el timestamp
-- remoto exacto (20260708234009) precisamente para que coincida con esa
-- entrada y `supabase db push` la omita. A diferencia de otras capturas de
-- este directorio, reaplicarla NO sería inocuo: usa CREATE TABLE, CREATE INDEX
-- y CREATE POLICY sin IF NOT EXISTS, de modo que una segunda ejecución
-- fallaría. Si se renombrara el fichero con otro timestamp, se intentaría
-- ejecutar de nuevo y el push se rompería.


-- ============================================================
-- PP2-A: Perfiles Profesionales 2.0 — Arquitectura de datos
-- Fecha: 2026-07-09
-- Scope: Nuevos campos en profiles + 6 tablas relacionadas
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. NUEVOS CAMPOS EN profiles
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS social_links jsonb;

COMMENT ON COLUMN public.profiles.is_premium IS
  'DEPRECATED 2026-07-09: Sustituido por profiles.plan. No usar en código nuevo. Eliminar tras auditoría completa de dependencias.';

-- ────────────────────────────────────────────────────────────
-- 2. profile_specialties
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.profile_specialties (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialty  text        NOT NULL CHECK (char_length(specialty) BETWEEN 1 AND 120),
  is_primary boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Solo una especialidad principal por perfil
CREATE UNIQUE INDEX idx_profile_specialties_one_primary
  ON public.profile_specialties (profile_id)
  WHERE is_primary = true;

CREATE INDEX idx_profile_specialties_profile_id
  ON public.profile_specialties (profile_id);

ALTER TABLE public.profile_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specialties_owner_all" ON public.profile_specialties
  FOR ALL
  USING  (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "specialties_public_read" ON public.profile_specialties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_specialties.profile_id
        AND p.perfil_publico = true
        AND p.activo = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. professional_experience
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.professional_experience (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo         text        NOT NULL CHECK (tipo IN (
                  'actuacion','direccion','dramaturgia','produccion',
                  'tecnico','gestion','docencia','otro'
               )),
  titulo       text        NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  organizacion text        CHECK (char_length(organizacion) <= 200),
  descripcion  text        CHECK (char_length(descripcion) <= 1000),
  fecha_inicio date,
  fecha_fin    date,
  en_curso     boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experience_dates_coherent
    CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio),
  CONSTRAINT experience_fin_or_en_curso
    CHECK (NOT (en_curso = true AND fecha_fin IS NOT NULL))
);

CREATE INDEX idx_professional_experience_profile_id
  ON public.professional_experience (profile_id);

ALTER TABLE public.professional_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_owner_all" ON public.professional_experience
  FOR ALL
  USING  (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "experience_public_read" ON public.professional_experience
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = professional_experience.profile_id
        AND p.perfil_publico = true
        AND p.activo = true
    )
  );

CREATE TRIGGER trg_professional_experience_updated_at
  BEFORE UPDATE ON public.professional_experience
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 4. profile_awards
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.profile_awards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre      text        NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 200),
  entidad     text        CHECK (char_length(entidad) <= 200),
  anio        integer     CHECK (anio >= 1900 AND anio <= 2100),
  descripcion text        CHECK (char_length(descripcion) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_awards_profile_id
  ON public.profile_awards (profile_id);

ALTER TABLE public.profile_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "awards_owner_all" ON public.profile_awards
  FOR ALL
  USING  (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "awards_public_read" ON public.profile_awards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_awards.profile_id
        AND p.perfil_publico = true
        AND p.activo = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. profile_training
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.profile_training (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo       text        NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  institucion  text        CHECK (char_length(institucion) <= 200),
  fecha_inicio date,
  fecha_fin    date,
  en_curso     boolean     NOT NULL DEFAULT false,
  descripcion  text        CHECK (char_length(descripcion) <= 500),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_dates_coherent
    CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio),
  CONSTRAINT training_fin_or_en_curso
    CHECK (NOT (en_curso = true AND fecha_fin IS NOT NULL))
);

CREATE INDEX idx_profile_training_profile_id
  ON public.profile_training (profile_id);

ALTER TABLE public.profile_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_owner_all" ON public.profile_training
  FOR ALL
  USING  (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "training_public_read" ON public.profile_training
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_training.profile_id
        AND p.perfil_publico = true
        AND p.activo = true
    )
  );

CREATE TRIGGER trg_profile_training_updated_at
  BEFORE UPDATE ON public.profile_training
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 6. profile_gallery
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.profile_gallery (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo        text        NOT NULL CHECK (tipo IN ('imagen','video')),
  url         text        NOT NULL CHECK (char_length(url) <= 2048),
  titulo      text        CHECK (char_length(titulo) <= 200),
  descripcion text        CHECK (char_length(descripcion) <= 500),
  posicion    smallint    NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_gallery_profile_id
  ON public.profile_gallery (profile_id);

CREATE INDEX idx_profile_gallery_posicion
  ON public.profile_gallery (profile_id, posicion);

ALTER TABLE public.profile_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gallery_owner_all" ON public.profile_gallery
  FOR ALL
  USING  (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "gallery_public_read" ON public.profile_gallery
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_gallery.profile_id
        AND p.perfil_publico = true
        AND p.activo = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. profile_availability (relación 1-a-1 con profiles)
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.profile_availability (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT profile_availability_profile_id_unique UNIQUE (profile_id),
  estado     text        NOT NULL DEFAULT 'abierto_a_propuestas' CHECK (estado IN (
               'disponible',
               'parcialmente_disponible',
               'no_disponible',
               'buscando_trabajo',
               'abierto_a_propuestas'
             )),
  alcance    text        NOT NULL DEFAULT 'nacional' CHECK (alcance IN (
               'local',
               'nacional',
               'internacional',
               'remoto',
               'nacional_internacional'
             )),
  nota       text        CHECK (char_length(nota) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_owner_all" ON public.profile_availability
  FOR ALL
  USING  (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "availability_public_read" ON public.profile_availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_availability.profile_id
        AND p.perfil_publico = true
        AND p.activo = true
    )
  );

CREATE TRIGGER trg_profile_availability_updated_at
  BEFORE UPDATE ON public.profile_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
