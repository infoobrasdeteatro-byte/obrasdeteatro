-- -----------------------------------------------------------------------------
-- EXECUTION AUDIT LOG (Repository Layer) — persistencia compartida de
-- ExecutionAudit (SC-004.7) v1
--
-- No es un recurso exclusivo de Analitica: ExecutionAudit tiene mas de un
-- consumidor autorizado (Analitica hoy; Accounting Engine en el futuro,
-- para la liquidacion de IA-007) -- por eso vive directamente en Repository
-- Layer, sin envoltorio de Servicio de Plataforma propio, mismo patron que
-- getIdentity/works/organizations.
--
-- Alcance de esta migracion: unicamente el lado de escritura (INSERT).
-- El lado de lectura agregada (SELECT), autorizado en exclusiva a la
-- identidad de sistema de DT-004, queda diferido -- esa identidad todavia
-- no existe (P-015, hueco de tipo_perfil sin resolver, credenciales sin
-- aprovisionar). Cuando P-015 se resuelva, una migracion nueva añadira la
-- politica de SELECT, sin reabrir esta.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.execution_audit_log (
  id                    uuid             NOT NULL DEFAULT uuid_generate_v4(),
  profile_id            uuid,
  provider_identifier   text,
  provider_model        text,
  execution_latency_ms  integer,
  tokens_consumed       integer,
  real_execution_cost   double precision,
  technical_metadata    text,
  recorded_at           timestamptz      NOT NULL DEFAULT now(),
  CONSTRAINT execution_audit_log_pkey PRIMARY KEY (id)
);

-- Mismo tratamiento que nucleo_activity_log/telemetry_metrics: registro no
-- critico, no economico -- el perfil se conserva como NULL si se elimina
-- el usuario.
ALTER TABLE public.execution_audit_log
  ADD CONSTRAINT execution_audit_log_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--
-- Solo politica de INSERT, mismo modelo de sesion ya congelado en todo el
-- proyecto (auth.uid() = profile_id). Sin politica de SELECT todavia --
-- ningun profesional individual debe poder leer esta tabla, ni siquiera
-- sus propias filas (la mision de Analitica es agregada, nunca personal);
-- la unica lectura autorizada es la identidad de sistema de DT-004, que
-- todavia no existe.
-- -----------------------------------------------------------------------------

ALTER TABLE public.execution_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrar auditoria de ejecucion propia" ON public.execution_audit_log
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
