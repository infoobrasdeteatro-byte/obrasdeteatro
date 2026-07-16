-- -----------------------------------------------------------------------------
-- ACCOUNTING ENGINE (SC-005.3) — persistencia del ciclo Reserva -> Ejecucion -> Liquidacion
--
-- Diseno logico aprobado por la Direccion del Proyecto (Bloque III).
-- Invariantes que esta migracion debe preservar (ver justificacion en el
-- diseno logico aprobado):
--   1. Toda reserva activa cuenta como consumo en verificaciones posteriores.
--   2. La verificacion-y-reserva es una operacion atomica unica: el consumo
--      actual se calcula y la nueva reserva se escribe dentro de la misma
--      transaccion, serializada por perfil (cierra el TOCTOU de SC-004.5).
--   3. Accounting Engine nunca posee el limite de plan: es exclusivamente un
--      parametro de entrada recibido en cada llamada (DA-001).
--   4. Una reserva nunca bloquea credito indefinidamente: la caducidad es
--      efectiva por la propia consulta (expires_at), no solo por el barrido.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credit_reservations (
  id                        uuid          NOT NULL DEFAULT uuid_generate_v4(),
  profile_id                uuid          NOT NULL,
  request_id                uuid,
  status                    text          NOT NULL DEFAULT 'active',
  estimated_cost            numeric(12,4) NOT NULL,
  settled_cost              numeric(12,4),
  authorized_limit_snapshot numeric(12,4) NOT NULL,
  expires_at                timestamptz   NOT NULL,
  created_at                timestamptz   NOT NULL DEFAULT now(),
  settled_at                timestamptz,
  CONSTRAINT credit_reservations_pkey PRIMARY KEY (id),
  CONSTRAINT credit_reservations_status_check
    CHECK (status = ANY (ARRAY['active', 'settled', 'released', 'expired'])),
  CONSTRAINT credit_reservations_estimated_cost_check
    CHECK (estimated_cost > 0),
  CONSTRAINT credit_reservations_authorized_limit_snapshot_check
    CHECK (authorized_limit_snapshot >= 0),
  CONSTRAINT credit_reservations_settled_cost_check
    CHECK (settled_cost IS NULL OR settled_cost >= 0),
  CONSTRAINT credit_reservations_settled_cost_consistency_check
    CHECK ((status = 'settled') = (settled_cost IS NOT NULL)),
  CONSTRAINT credit_reservations_settled_at_consistency_check
    CHECK (settled_at IS NULL OR status IN ('settled', 'released', 'expired'))
);

CREATE INDEX IF NOT EXISTS credit_reservations_profile_status_idx
  ON public.credit_reservations (profile_id, status);

CREATE INDEX IF NOT EXISTS credit_reservations_status_expires_idx
  ON public.credit_reservations (status, expires_at);

ALTER TABLE public.credit_reservations
  ADD CONSTRAINT credit_reservations_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- -----------------------------------------------------------------------------
-- OPERACIONES ATOMICAS
--
-- SECURITY DEFINER + search_path fijo (mismo patron ya usado en
-- handle_new_user): las funciones se ejecutan con los privilegios del
-- propietario para poder leer/escribir sin depender de politicas RLS de
-- INSERT/UPDATE sobre la tabla, pero cada una verifica explicitamente
-- auth.uid() para no permitir que un usuario opere sobre el perfil de otro.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accounting_verify_and_reserve(
  p_profile_id       uuid,
  p_authorized_limit numeric,
  p_estimated_cost   numeric,
  p_ttl_seconds      integer,
  p_request_id       uuid DEFAULT NULL
)
RETURNS TABLE (
  authorized                 boolean,
  reservation_id              uuid,
  status                      text,
  estimated_cost              numeric,
  authorized_limit_snapshot   numeric,
  expires_at                  timestamptz,
  created_at                  timestamptz,
  current_consumption         numeric,
  denial_reason                text
)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_current_consumption numeric;
  v_reservation_id      uuid;
  v_expires_at           timestamptz;
  v_created_at            timestamptz;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_profile_id THEN
    RAISE EXCEPTION 'no autorizado a reservar credito para otro perfil';
  END IF;

  IF p_estimated_cost <= 0 THEN
    RAISE EXCEPTION 'estimated_cost debe ser positivo';
  END IF;

  IF p_authorized_limit < 0 THEN
    RAISE EXCEPTION 'authorized_limit no puede ser negativo';
  END IF;

  IF p_ttl_seconds <= 0 THEN
    RAISE EXCEPTION 'ttl_seconds debe ser positivo';
  END IF;

  -- Serializa las verificaciones concurrentes del mismo perfil: cierra el
  -- TOCTOU sin necesitar una fila de saldo materializado (ver diseno logico).
  PERFORM pg_advisory_xact_lock(hashtextextended(p_profile_id::text, 0));

  SELECT COALESCE(SUM(cr.estimated_cost), 0)
    INTO v_current_consumption
    FROM public.credit_reservations cr
   WHERE cr.profile_id = p_profile_id
     AND cr.status = 'active'
     AND cr.expires_at > now();

  IF v_current_consumption + p_estimated_cost > p_authorized_limit THEN
    RETURN QUERY SELECT
      false, NULL::uuid, NULL::text, p_estimated_cost, p_authorized_limit,
      NULL::timestamptz, NULL::timestamptz, v_current_consumption,
      format(
        'consumo_actual(%s) + coste_estimado(%s) > limite_autorizado(%s)',
        v_current_consumption, p_estimated_cost, p_authorized_limit
      );
    RETURN;
  END IF;

  v_expires_at := now() + make_interval(secs => p_ttl_seconds);

  INSERT INTO public.credit_reservations (
    profile_id, request_id, status, estimated_cost,
    authorized_limit_snapshot, expires_at
  ) VALUES (
    p_profile_id, p_request_id, 'active', p_estimated_cost,
    p_authorized_limit, v_expires_at
  )
  RETURNING id, created_at INTO v_reservation_id, v_created_at;

  RETURN QUERY SELECT
    true, v_reservation_id, 'active'::text, p_estimated_cost, p_authorized_limit,
    v_expires_at, v_created_at, v_current_consumption, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.accounting_settle_reservation(
  p_reservation_id uuid,
  p_real_cost      numeric
)
  RETURNS public.credit_reservations
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_row public.credit_reservations;
BEGIN
  IF p_real_cost < 0 THEN
    RAISE EXCEPTION 'real_cost no puede ser negativo';
  END IF;

  SELECT * INTO v_row FROM public.credit_reservations WHERE id = p_reservation_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'reserva % no encontrada', p_reservation_id;
  END IF;

  IF auth.uid() IS DISTINCT FROM v_row.profile_id THEN
    RAISE EXCEPTION 'no autorizado a liquidar una reserva de otro perfil';
  END IF;

  UPDATE public.credit_reservations
     SET status = 'settled',
         settled_cost = p_real_cost,
         settled_at = now()
   WHERE id = p_reservation_id
     AND status = 'active'
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'reserva % no esta activa, no se puede liquidar', p_reservation_id;
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.accounting_release_reservation(
  p_reservation_id uuid
)
  RETURNS public.credit_reservations
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_row public.credit_reservations;
BEGIN
  SELECT * INTO v_row FROM public.credit_reservations WHERE id = p_reservation_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'reserva % no encontrada', p_reservation_id;
  END IF;

  IF auth.uid() IS DISTINCT FROM v_row.profile_id THEN
    RAISE EXCEPTION 'no autorizado a liberar una reserva de otro perfil';
  END IF;

  UPDATE public.credit_reservations
     SET status = 'released',
         settled_at = now()
   WHERE id = p_reservation_id
     AND status = 'active'
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'reserva % no esta activa, no se puede liberar', p_reservation_id;
  END IF;

  RETURN v_row;
END;
$$;

-- Housekeeping: nunca es la fuente de la garantia de no-bloqueo (esa la da el
-- filtro expires_at > now() en la propia consulta de consumo activo), solo
-- mantiene el dato consistente en reposo. No requiere verificacion de
-- identidad: no expone ni modifica el importe reservado, solo marca la
-- transicion de estado que ya era efectiva por caducidad.
CREATE OR REPLACE FUNCTION public.accounting_expire_stale_reservations()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.credit_reservations
     SET status = 'expired',
         settled_at = now()
   WHERE status = 'active'
     AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--
-- Solo se declara politica de SELECT: las escrituras se realizan
-- exclusivamente a traves de las funciones SECURITY DEFINER anteriores, cada
-- una con su propia verificacion de auth.uid() -- sin politica de
-- INSERT/UPDATE/DELETE, cualquier intento de mutacion directa sobre la tabla
-- queda denegado por RLS por defecto.
-- -----------------------------------------------------------------------------

ALTER TABLE public.credit_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reserva de credito propia" ON public.credit_reservations
  FOR SELECT USING (auth.uid() = profile_id);
