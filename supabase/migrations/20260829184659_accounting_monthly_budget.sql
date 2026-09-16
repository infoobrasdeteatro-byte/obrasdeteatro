-- Contabilidad: el presupuesto pasa a medirse por mes natural.
--
-- CAPTURA DE UN CAMBIO YA APLICADO. Esta migración está aplicada en el
-- proyecto remoto y consta en su historial con la versión 20260829184659,
-- pero nunca tuvo fichero en supabase/migrations/. Este archivo NO introduce
-- nada nuevo: existe para que el repo refleje el estado real y no haya deriva
-- entre supabase/migrations/ y producción.
--
-- ORIGEN DEL SQL. El texto que sigue es el contenido literal almacenado en
-- supabase_migrations.schema_migrations.statements para esa versión, extraído
-- en modo lectura el 2026-09-16. No se ha reescrito, reordenado ni completado:
-- es exactamente lo que se ejecutó contra la base de datos.
--
-- QUÉ HACE. Redefine accounting_verify_and_reserve para que el consumo se
-- calcule sobre el mes natural en curso: fija v_period_start con
-- date_trunc('month', now()) y suma por separado lo confirmado (reservas
-- 'settled' liquidadas dentro del periodo) y lo comprometido (reservas
-- 'active' aún no vencidas). Devuelve ambas cifras junto a la capacidad
-- disponible, y añade el índice parcial credit_reservations_profile_settled_idx
-- que sirve a la primera de esas dos sumas.
--
-- NO SE REAPLICARÁ. A diferencia de otras capturas de este directorio, esta
-- migración SÍ consta en el historial del proyecto remoto. El nombre del
-- fichero lleva el timestamp remoto exacto (20260829184659) precisamente para
-- que coincida con esa entrada: `supabase db push` la reconocerá como ya
-- aplicada y la omitirá. Si el fichero se renombrara con otro timestamp, se
-- intentaría ejecutar de nuevo, y el DROP FUNCTION inicial no es inocuo si
-- para entonces la función tuviera otra definición.

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

CREATE INDEX IF NOT EXISTS credit_reservations_profile_settled_idx
  ON public.credit_reservations (profile_id, settled_at)
  WHERE status = 'settled';
