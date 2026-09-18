-- -----------------------------------------------------------------------------
-- PROCESOS ASINCRONOS (Servicio de Plataforma) — registro de actividad v1
--
-- Alcance de esta migracion, conforme al Plan Tecnico aprobado: unicamente el
-- lado de escritura (recordActivity). El lado de lectura (listPendingActivity,
-- markActivityProcessed) queda expresamente diferido -- su mecanismo de
-- ejecucion en segundo plano (identidad/autenticacion de un proceso sin
-- sesion de usuario) todavia no esta especificado en ningun documento.
--
-- Diseno deliberadamente minimo: sin indices mas alla de la clave primaria
-- (el patron de consulta del lado de lectura, todavia no definido, podria
-- exigir indices distintos a los que se adivinarian ahora) y sin
-- response_content (el contrato de Mi Trayectoria(R), consumidor futuro,
-- sigue pendiente de recuperacion).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.nucleo_activity_log (
  id            uuid        NOT NULL DEFAULT uuid_generate_v4(),
  profile_id    uuid,
  response_type text        NOT NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz,
  CONSTRAINT nucleo_activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT nucleo_activity_log_response_type_check
    CHECK (response_type = ANY (ARRAY[
      'RESPONSE_SUCCESS', 'RESPONSE_DIRECT', 'RESPONSE_DENIED', 'RESPONSE_PARTIAL', 'RESPONSE_ERROR'
    ]))
);

-- Mismo tratamiento que audit_logs (registro no critico, no economico): el
-- perfil se conserva como NULL si se elimina el usuario, en vez de bloquear
-- ni cascadear el borrado.
ALTER TABLE public.nucleo_activity_log
  ADD CONSTRAINT nucleo_activity_log_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--
-- Solo politica de INSERT: recordActivity() se invoca dentro de la misma
-- sesion de usuario que genero la actividad (el SPO coordina la llamada
-- desde dentro del flujo sincrono de esa peticion) -- nunca desde un cliente
-- privilegiado. Sin politica de SELECT/UPDATE/DELETE todavia: el lado de
-- lectura queda diferido, y sin consumidor no hay necesidad de exponer
-- acceso de lectura.
-- -----------------------------------------------------------------------------

ALTER TABLE public.nucleo_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registro de actividad propio" ON public.nucleo_activity_log
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
