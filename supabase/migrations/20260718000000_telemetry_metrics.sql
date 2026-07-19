-- -----------------------------------------------------------------------------
-- TELEMETRIA (Servicio de Plataforma) — mecanismo general de metricas v1
--
-- Tabla propia, deliberadamente distinta de nucleo_activity_log: esa tabla
-- tiene un CHECK cerrado contra los 5 valores de ResponseType, ligado al
-- resultado del Nucleo -- reutilizarla para metricas genericas habria sido
-- un acoplamiento conceptual, no una reutilizacion legitima (a diferencia de
-- listActivityHistory, que reutilizo la MISMA tabla bajo otra vista).
--
-- Vocabulario de metric_name deliberadamente abierto (sin CHECK): a
-- diferencia de response_type, ningun documento congelado define un
-- catalogo cerrado de metricas -- Telemetria es un mecanismo general de
-- instrumentacion, no un componente atado a los campos de ExecutionAudit.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.telemetry_metrics (
  id            uuid             NOT NULL DEFAULT uuid_generate_v4(),
  profile_id    uuid,
  metric_name   text             NOT NULL,
  metric_value  double precision NOT NULL,
  metric_unit   text,
  tags          jsonb,
  recorded_at   timestamptz      NOT NULL DEFAULT now(),
  CONSTRAINT telemetry_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT telemetry_metrics_metric_name_check CHECK (length(metric_name) > 0)
);

-- Mismo tratamiento que nucleo_activity_log/audit_logs: registro no critico,
-- no economico -- el perfil se conserva como NULL si se elimina el usuario.
ALTER TABLE public.telemetry_metrics
  ADD CONSTRAINT telemetry_metrics_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--
-- Mismo modelo de sesion ya congelado en todo el proyecto (auth.uid() =
-- profile_id), sin excepcion. recordMetric() exige una sesion real de
-- usuario autenticado -- una metrica sin sesion asociada no puede
-- persistirse hoy (mismo limite ya aceptado para recordActivity()).
--
-- Sin semantica de cola: las metricas son hechos inmutables, nunca se
-- marcan como "procesadas" -- por eso no hay politica de UPDATE.
-- -----------------------------------------------------------------------------

ALTER TABLE public.telemetry_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrar metrica propia" ON public.telemetry_metrics
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Ver metricas propias" ON public.telemetry_metrics
  FOR SELECT USING (auth.uid() = profile_id);
