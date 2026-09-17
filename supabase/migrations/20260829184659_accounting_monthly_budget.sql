-- -----------------------------------------------------------------------------
-- ACCOUNTING ENGINE — presupuesto de consumo por periodo (mensual)
--
-- Que faltaba: la operacion de verificar-y-reservar solo miraba las reservas
-- ACTIVAS y no expiradas, es decir, una ventana de 5 minutos (el TTL). Eso
-- controla la concurrencia, pero no es una cuota: una vez liquidada o
-- expirada una reserva dejaba de contar, de modo que el limite del plan
-- podia superarse indefinidamente dentro de un mes. Ocurrio de verdad: un
-- perfil con limite 30 acumulo 52 peticiones en julio de 2026.
--
-- Que define la arquitectura original (ARQUITECTURA_FUNCIONAL v2.0 §9.2,
-- "Cuotas mensuales por plan"): el control es por MES ACTUAL y por perfil.
-- Esta migracion implementa exactamente ese periodo. El mecanismo de conteo
-- documentado alli era `ai_requests`; se conserva la SEMANTICA (cuota
-- mensual por perfil) sobre `credit_reservations`, que es el mecanismo
-- economico realmente construido -- misma discusion ya resuelta en IA-005,
-- donde se identifico a Credit Manager como responsable de la cuota por
-- periodo. No se introduce ninguna unidad ni semantica nueva.
--
-- El consumo del periodo pasa a ser la suma de dos cosas distintas:
--
--   CONFIRMADO   lo ya liquidado este mes (`settled_cost` de reservas
--                `settled`) -- consumo real, irreversible.
--   COMPROMETIDO lo reservado y todavia sin resolver (`estimated_cost` de
--                reservas `active` no expiradas) -- capacidad apartada que
--                aun puede liquidarse o liberarse.
--
-- Una reserva `released` no consume nada: devuelve la capacidad.
-- Una reserva `active` YA EXPIRADA tampoco cuenta, igual que hasta ahora:
-- el TTL es precisamente la garantia de que una reserva abandonada no
-- bloquea credito indefinidamente. Esto preserva el comportamiento vigente
-- y evita que las reservas historicas nunca liquidadas bloqueen a nadie.
--
-- La concurrencia sigue resuelta donde ya lo estaba: el advisory lock por
-- perfil serializa las verificaciones simultaneas del MISMO usuario dentro
-- de la transaccion, de modo que dos peticiones concurrentes no pueden ver
-- ambas el mismo saldo. No hay contador en memoria ni estado de aplicacion:
-- funciona con cualquier numero de instancias.
--
-- Se amplia el valor de retorno para que el llamador pueda conocer el
-- desglose real (periodo, confirmado, comprometido, capacidad restante) en
-- vez de un unico agregado opaco. Exige DROP + CREATE porque PostgreSQL no
-- permite cambiar el tipo de retorno con CREATE OR REPLACE.
--
-- Sin estructura persistente nueva: `credit_reservations` ya contiene todo
-- lo necesario (estado, importes y fechas). Ninguna tabla, ninguna columna,
-- ningun dato modificado.
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.accounting_verify_and_reserve(uuid, numeric, numeric, integer, uuid);

CREATE FUNCTION public.accounting_verify_and_reserve(
  p_profile_id      uuid,
  p_authorized_limit numeric,
  p_estimated_cost   numeric,
  p_ttl_seconds      integer,
  p_request_id       uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  authorized                boolean,
  reservation_id            uuid,
  status                    text,
  estimated_cost            numeric,
  authorized_limit_snapshot numeric,
  expires_at                timestamptz,
  created_at                timestamptz,
  current_consumption       numeric,
  denial_reason             text,
  period_start              timestamptz,
  settled_consumption       numeric,
  reserved_consumption      numeric,
  available_capacity        numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_period_start        timestamptz;
  v_settled             numeric;
  v_reserved            numeric;
  v_current_consumption numeric;
  v_available           numeric;
  v_reservation_id      uuid;
  v_expires_at          timestamptz;
  v_created_at          timestamptz;
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

  -- Periodo: mes natural en curso (ARQUITECTURA_FUNCIONAL v2.0 §9.2).
  v_period_start := date_trunc('month', now());

  -- CONFIRMADO: lo realmente consumido y liquidado dentro del periodo. Se
  -- fecha por `settled_at` -- el instante en que el consumo se confirmo --
  -- y no por la creacion de la reserva, que es solo cuando se pidio.
  SELECT COALESCE(SUM(cr.settled_cost), 0)
    INTO v_settled
    FROM public.credit_reservations cr
   WHERE cr.profile_id = p_profile_id
     AND cr.status = 'settled'
     AND cr.settled_at >= v_period_start;

  -- COMPROMETIDO: reservas vivas que todavia pueden convertirse en consumo.
  SELECT COALESCE(SUM(cr.estimated_cost), 0)
    INTO v_reserved
    FROM public.credit_reservations cr
   WHERE cr.profile_id = p_profile_id
     AND cr.status = 'active'
     AND cr.expires_at > now();

  v_current_consumption := v_settled + v_reserved;
  v_available := GREATEST(p_authorized_limit - v_current_consumption, 0);

  IF v_current_consumption + p_estimated_cost > p_authorized_limit THEN
    RETURN QUERY SELECT
      false, NULL::uuid, NULL::text, p_estimated_cost, p_authorized_limit,
      NULL::timestamptz, NULL::timestamptz, v_current_consumption,
      format(
        'presupuesto del periodo agotado: confirmado(%s) + comprometido(%s) + coste_estimado(%s) > limite_autorizado(%s)',
        v_settled, v_reserved, p_estimated_cost, p_authorized_limit
      ),
      v_period_start, v_settled, v_reserved, v_available;
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
    v_expires_at, v_created_at, v_current_consumption, NULL::text,
    v_period_start, v_settled, v_reserved,
    GREATEST(p_authorized_limit - v_current_consumption - p_estimated_cost, 0);
END;
$function$;

-- Consulta del periodo: `settled_at` acotado por mes y por perfil. El indice
-- existente (profile_id, status) no cubre la fecha; este lo completa sin
-- duplicarlo, y solo sobre las filas que el calculo recorre.
CREATE INDEX IF NOT EXISTS credit_reservations_profile_settled_idx
  ON public.credit_reservations (profile_id, settled_at)
  WHERE status = 'settled';
