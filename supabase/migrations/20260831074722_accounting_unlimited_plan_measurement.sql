-- BLOQUE 2 — Medicion de planes sin cuota comercial.
--
-- Hasta ahora un plan ILIMITADO salia entero del circuito economico: sin
-- reserva, sin liquidacion y sin coste registrado. El unico plan sin techo
-- era tambien el unico del que no se sabia nada.
--
-- Medir no es limitar. NULL en `p_authorized_limit` significa AUSENCIA DE
-- LIMITE, no una cifra convenida: la comparacion de denegacion no puede ser
-- verdadera con un operando nulo, de modo que la imposibilidad de denegar
-- no es una regla anadida sino una consecuencia del tipo.
--
-- No se modifica ninguna fila, ninguna politica RLS, ni el bloqueo por
-- perfil que garantiza la atomicidad.

-- 1. Una reserva de un plan sin techo debe poder registrar que NO habia
--    limite. Cero significaria "cero creditos autorizados", justo lo
--    contrario; cualquier cifra grande seria un valor magico.
ALTER TABLE public.credit_reservations
  ALTER COLUMN authorized_limit_snapshot DROP NOT NULL;

COMMENT ON COLUMN public.credit_reservations.authorized_limit_snapshot IS
  'Limite que regia al crear la reserva. NULL = el plan no tenia limite (ausencia real de techo, nunca un valor convenido).';

-- 2. La operacion atomica acepta la ausencia de limite: mide igual, y no
--    puede denegar lo que no tiene techo contra el que compararse.
CREATE OR REPLACE FUNCTION public.accounting_verify_and_reserve(
  p_profile_id uuid,
  p_authorized_limit numeric,
  p_estimated_cost numeric,
  p_ttl_seconds integer,
  p_request_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  authorized boolean, reservation_id uuid, status text, estimated_cost numeric,
  authorized_limit_snapshot numeric, expires_at timestamptz, created_at timestamptz,
  current_consumption numeric, denial_reason text, period_start timestamptz,
  settled_consumption numeric, reserved_consumption numeric, available_capacity numeric
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

  -- Un limite ausente no es un limite negativo: la guarda solo aplica
  -- cuando hay cifra que comprobar.
  IF p_authorized_limit IS NOT NULL AND p_authorized_limit < 0 THEN
    RAISE EXCEPTION 'authorized_limit no puede ser negativo';
  END IF;

  IF p_ttl_seconds <= 0 THEN
    RAISE EXCEPTION 'ttl_seconds debe ser positivo';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_profile_id::text, 0));

  v_period_start := date_trunc('month', now());

  SELECT COALESCE(SUM(cr.settled_cost), 0)
    INTO v_settled
    FROM public.credit_reservations cr
   WHERE cr.profile_id = p_profile_id
     AND cr.status = 'settled'
     AND cr.settled_at >= v_period_start;

  SELECT COALESCE(SUM(cr.estimated_cost), 0)
    INTO v_reserved
    FROM public.credit_reservations cr
   WHERE cr.profile_id = p_profile_id
     AND cr.status = 'active'
     AND cr.expires_at > now();

  v_current_consumption := v_settled + v_reserved;

  -- GREATEST ignora los NULL en PostgreSQL: sin este CASE, un plan sin
  -- limite informaria "0 de capacidad disponible", que es exactamente lo
  -- contrario de lo que ocurre. Sin techo, "lo que resta" no vale cero:
  -- es una magnitud que no existe.
  v_available := CASE
                   WHEN p_authorized_limit IS NULL THEN NULL
                   ELSE GREATEST(p_authorized_limit - v_current_consumption, 0)
                 END;

  IF p_authorized_limit IS NOT NULL
     AND v_current_consumption + p_estimated_cost > p_authorized_limit THEN
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
    CASE
      WHEN p_authorized_limit IS NULL THEN NULL
      ELSE GREATEST(p_authorized_limit - v_current_consumption - p_estimated_cost, 0)
    END;
END;
$function$;
