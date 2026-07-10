-- PP2-E.3A: Complemento necesario para el Centro Profesional.
-- La política existente (profile_follows_select_own) permite ver los follows salientes
-- (quién sigo yo). Esta política permite ver los follows entrantes (quién me sigue).
-- Ambas juntas forman el conjunto completo de datos que el Centro Profesional necesita.
CREATE POLICY "profile_follows_select_incoming"
  ON public.profile_follows
  FOR SELECT
  TO authenticated
  USING (following_id = auth.uid());
