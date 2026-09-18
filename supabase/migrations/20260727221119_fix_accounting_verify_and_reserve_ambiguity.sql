-- -----------------------------------------------------------------------------
-- CORRECCION IA-ACC-SQL-001 -- ambiguedad de columna en accounting_verify_and_reserve
--
-- Defecto detectado mediante prueba E2E real en produccion (2026-07-27):
-- RETURNS TABLE(..., created_at timestamptz, ...) declara una variable de
-- salida llamada created_at, visible en todo el cuerpo de la funcion. La
-- sentencia original "RETURNING id, created_at INTO v_reservation_id,
-- v_created_at" referenciaba created_at sin cualificar -- ambiguo entre esa
-- variable de salida y la columna credit_reservations.created_at de la fila
-- recien insertada. PostgreSQL rechazaba la sentencia con:
--   column reference "created_at" is ambiguous
--
-- Correccion: alias explicito de la tabla en el INSERT (AS cr) y cualificacion
-- explicita de ambas columnas en RETURNING (cr.id, cr.created_at) -- elimina
-- la ambiguedad de forma declarativa e inequivoca, sin depender de ninguna
-- convencion de nombrado implicita.
--
-- Invariante: firma publica (parametros, RETURNS TABLE con los mismos nombres
-- y tipos de columna), las cuatro validaciones de entrada, el
-- pg_advisory_xact_lock, el calculo de current_consumption, la semantica
-- AUTHORIZED/DENIED, el comportamiento transaccional, RLS y permisos
-- permanecen exactamente iguales que en la version desplegada por
-- 20260716000000_accounting_engine_credit_reservations.sql -- unico cambio
-- funcional: la cualificacion de columna en la clausula RETURNING del INSERT.
-- Ese archivo historico no se modifica; esta es una migracion correctiva
-- nueva e incremental (IA-ACC-SQL-001).
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

  INSERT INTO public.credit_reservations AS cr (
    profile_id, request_id, status, estimated_cost,
    authorized_limit_snapshot, expires_at
  ) VALUES (
    p_profile_id, p_request_id, 'active', p_estimated_cost,
    p_authorized_limit, v_expires_at
  )
  RETURNING cr.id, cr.created_at INTO v_reservation_id, v_created_at;

  RETURN QUERY SELECT
    true, v_reservation_id, 'active'::text, p_estimated_cost, p_authorized_limit,
    v_expires_at, v_created_at, v_current_consumption, NULL::text;
END;
$$;
