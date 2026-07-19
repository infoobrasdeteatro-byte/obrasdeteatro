-- -----------------------------------------------------------------------------
-- PROCESOS ASINCRONOS — lado de lectura (completa nucleo_activity_log)
--
-- Autorizado tras la investigacion cerrada sin nueva Decision Transversal
-- (docs/actas-bloque-3/investigacion-ejecucion-en-segundo-plano.md): los
-- consumidores actuales (Procesos Asincronos, Mi Trayectoria(R)) no exigen
-- ejecucion fuera de sesion -- el procesamiento diferido a la siguiente
-- sesion real del propio profesional satisface sus contratos congelados.
-- Por eso estas politicas son identicas en espiritu a la ya existente de
-- INSERT: sesion de usuario, sin cliente privilegiado, sin excepcion.
-- -----------------------------------------------------------------------------

CREATE POLICY "Ver actividad propia" ON public.nucleo_activity_log
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Marcar actividad propia como procesada" ON public.nucleo_activity_log
  FOR UPDATE USING (auth.uid() = profile_id);
