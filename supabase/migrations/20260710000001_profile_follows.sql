-- =============================================================================
-- PP2-E.1 — Red Profesional: Tabla de relaciones entre perfiles
-- Sprint: PP2-E.1
-- Fecha: 2026-07-10
-- Proyecto Supabase: pnsirwtiiurczjwrayza (eu-west-1)
--
-- PRINCIPIO DE ARQUITECTURA (autorizado 2026-07-10):
-- "La tabla profile_follows representa relaciones entre perfiles profesionales
-- del ecosistema ObrasDeTeatro®. No constituye una funcionalidad de red social.
-- Su objetivo principal es construir el grafo de relaciones profesionales que
-- utilizarán futuras funcionalidades del ecosistema y ScenaIA."
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLA: profile_follows
-- Convención de nombres: profile_* (conforme a PP2-A: profile_availability,
-- profile_specialties, profile_awards, profile_gallery, profile_roles, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_follows (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  follower_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),

  -- Un perfil no puede seguirse a sí mismo
  CONSTRAINT profile_follows_no_self
    CHECK (follower_id != following_id),

  -- Prevención de duplicados a nivel de base de datos
  -- Sirve además como índice compuesto (follower_id, following_id)
  CONSTRAINT profile_follows_unique
    UNIQUE (follower_id, following_id),

  CONSTRAINT profile_follows_pkey
    PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- ÍNDICES
-- El UNIQUE constraint ya genera un índice compuesto (follower_id, following_id).
-- Los índices simples adicionales cubren:
--   profile_follows_follower_idx  → "¿a quién sigo?"       WHERE follower_id = $1
--   profile_follows_following_idx → "¿quién me sigue?"     WHERE following_id = $1
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS profile_follows_follower_idx
  ON public.profile_follows (follower_id);

CREATE INDEX IF NOT EXISTS profile_follows_following_idx
  ON public.profile_follows (following_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE public.profile_follows ENABLE ROW LEVEL SECURITY;

-- SELECT: solo el follower puede leer sus propios follows.
-- Las relaciones entre perfiles no son información pública por defecto.
-- Los contadores públicos (si se implementan) usarán SECURITY DEFINER RPC.
CREATE POLICY "profile_follows_select_own"
  ON public.profile_follows
  FOR SELECT
  TO authenticated
  USING (follower_id = auth.uid());

-- INSERT: solo puedes seguir como tú mismo.
-- WITH CHECK impide que un usuario autenticado inserte follows en nombre de otro.
CREATE POLICY "profile_follows_insert"
  ON public.profile_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

-- DELETE: solo el follower puede dejar de seguir.
CREATE POLICY "profile_follows_delete"
  ON public.profile_follows
  FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

-- No hay política UPDATE: un follow no se modifica, se crea o se elimina.
-- No hay acceso anónimo: la funcionalidad requiere sesión activa.
