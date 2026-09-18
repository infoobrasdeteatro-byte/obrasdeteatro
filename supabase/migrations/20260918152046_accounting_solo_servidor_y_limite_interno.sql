-- Accounting Engine: solo el servidor reserva y liquida, y el límite sale del
-- plan real, no de quien llama.
--
-- Antes, lib/repository-layer/accounting.ts llamaba a estas funciones con la
-- sesión del usuario, y eran ejecutables por anon/authenticated. Un usuario
-- con sesión podía llamarlas él mismo por /rest/v1/rpc con sus propios
-- valores:
--   - accounting_verify_and_reserve con p_authorized_limit = NULL, que la
--     función trata como "plan sin techo": cuota de IA ilimitada;
--   - accounting_settle_reservation con p_real_cost = 0 en cada reserva:
--     consumo del mes siempre a cero.
--
-- Ahora:
--   1. accounting_verify_and_reserve ya no recibe el límite. Lo calcula a
--      partir de profiles.plan (que desde 20260918…_profiles_proteger_plan_y_
--      verificado el usuario ya no puede cambiarse). Un plan desconocido
--      deniega con motivo explícito, igual que Credit Manager
--      ('plan_quota_unknown'): ni cuota cero ni cuota infinita.
--   2. Las cuatro funciones son ejecutables SOLO por service_role. El coste
--      real lo sigue calculando el servidor con los tokens reales del
--      proveedor (lib/provider-catalog/execution-cost.ts); la base no tiene
--      esos datos. Lo que cambia es que ese valor ya solo puede llegar del
--      servidor, nunca del usuario.
--   3. Desaparecen las comprobaciones auth.uid() = dueño: con service_role
--      auth.uid() es NULL y habrían rechazado todas las llamadas legítimas.
--      La identidad del perfil la resuelve el servidor desde la sesión antes
--      de llamar. NO volver a conceder EXECUTE a anon/authenticated sin
--      reponer esas comprobaciones.

-- 1. Cuota de IA por plan. Mismas cifras que PLAN_AI_QUOTAS en
--    lib/repository-layer/subscription.ts (5 / 100 / 500 / ilimitado): si
--    cambian allí, hay que cambiarlas aquí. Esta es la que manda.
--    Devuelve (conocido, limite): limite NULL con conocido=true es "sin techo".
create or replace function public.accounting_cuota_ia_del_plan(p_plan text, out conocido boolean, out limite numeric)
language sql
immutable
set search_path = 'public'
as $$
  select
    p_plan in ('gratuito', 'premium', 'destacado', 'empresas'),
    case p_plan
      when 'gratuito'  then 5
      when 'premium'   then 100
      when 'destacado' then 500
      else null  -- empresas: sin techo; desconocido: se decide con `conocido`
    end::numeric;
$$;

comment on function public.accounting_cuota_ia_del_plan(text) is
  'Créditos de IA por periodo mensual según el plan: gratuito 5, premium 100, destacado 500, empresas sin techo (limite NULL). conocido=false para cualquier otro valor. Debe coincidir con PLAN_AI_QUOTAS (lib/repository-layer/subscription.ts).';

-- 2. Reserva: nueva firma sin p_authorized_limit.
drop function if exists public.accounting_verify_and_reserve(uuid, numeric, numeric, integer, uuid);

create function public.accounting_verify_and_reserve(
  p_profile_id uuid,
  p_estimated_cost numeric,
  p_ttl_seconds integer,
  p_request_id uuid default null
)
returns table(
  authorized boolean, reservation_id uuid, status text, estimated_cost numeric,
  authorized_limit_snapshot numeric, expires_at timestamptz, created_at timestamptz,
  current_consumption numeric, denial_reason text, period_start timestamptz,
  settled_consumption numeric, reserved_consumption numeric, available_capacity numeric
)
language plpgsql
security definer
set search_path = 'public'
as $$
DECLARE
  v_plan                text;
  v_plan_conocido       boolean;
  v_authorized_limit    numeric;
  v_period_start        timestamptz;
  v_settled             numeric;
  v_reserved            numeric;
  v_current_consumption numeric;
  v_available           numeric;
  v_reservation_id      uuid;
  v_expires_at          timestamptz;
  v_created_at          timestamptz;
BEGIN
  IF p_estimated_cost <= 0 THEN
    RAISE EXCEPTION 'estimated_cost debe ser positivo';
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

  -- El límite sale del plan real del perfil, nunca de quien llama.
  SELECT p.plan::text INTO v_plan FROM public.profiles p WHERE p.id = p_profile_id;
  SELECT q.conocido, q.limite INTO v_plan_conocido, v_authorized_limit
    FROM public.accounting_cuota_ia_del_plan(v_plan) q;

  IF v_plan IS NULL OR NOT v_plan_conocido THEN
    RETURN QUERY SELECT
      false, NULL::uuid, NULL::text, p_estimated_cost, NULL::numeric,
      NULL::timestamptz, NULL::timestamptz, v_current_consumption,
      format('plan desconocido (%s): no hay cuota de IA que aplicar', coalesce(v_plan, 'sin perfil')),
      v_period_start, v_settled, v_reserved, NULL::numeric;
    RETURN;
  END IF;

  -- GREATEST ignora los NULL en PostgreSQL: sin este CASE, un plan sin
  -- limite informaria "0 de capacidad disponible", que es exactamente lo
  -- contrario de lo que ocurre. Sin techo, "lo que resta" no vale cero:
  -- es una magnitud que no existe.
  v_available := CASE
                   WHEN v_authorized_limit IS NULL THEN NULL
                   ELSE GREATEST(v_authorized_limit - v_current_consumption, 0)
                 END;

  IF v_authorized_limit IS NOT NULL
     AND v_current_consumption + p_estimated_cost > v_authorized_limit THEN
    RETURN QUERY SELECT
      false, NULL::uuid, NULL::text, p_estimated_cost, v_authorized_limit,
      NULL::timestamptz, NULL::timestamptz, v_current_consumption,
      format(
        'presupuesto del periodo agotado: confirmado(%s) + comprometido(%s) + coste_estimado(%s) > limite_autorizado(%s)',
        v_settled, v_reserved, p_estimated_cost, v_authorized_limit
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
    v_authorized_limit, v_expires_at
  )
  RETURNING cr.id, cr.created_at INTO v_reservation_id, v_created_at;

  RETURN QUERY SELECT
    true, v_reservation_id, 'active'::text, p_estimated_cost, v_authorized_limit,
    v_expires_at, v_created_at, v_current_consumption, NULL::text,
    v_period_start, v_settled, v_reserved,
    CASE
      WHEN v_authorized_limit IS NULL THEN NULL
      ELSE GREATEST(v_authorized_limit - v_current_consumption - p_estimated_cost, 0)
    END;
END;
$$;

-- 3. Liquidación: sin comprobación de dueño (solo la llama el servidor).
create or replace function public.accounting_settle_reservation(p_reservation_id uuid, p_real_cost numeric)
returns public.credit_reservations
language plpgsql
security definer
set search_path = 'public'
as $$
DECLARE
  v_row public.credit_reservations;
BEGIN
  IF p_real_cost IS NULL OR p_real_cost < 0 THEN
    RAISE EXCEPTION 'real_cost no puede ser nulo ni negativo';
  END IF;

  UPDATE public.credit_reservations
     SET status = 'settled', settled_cost = p_real_cost, settled_at = now()
   WHERE id = p_reservation_id AND status = 'active'
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'reserva % no encontrada o no esta activa, no se puede liquidar', p_reservation_id;
  END IF;

  RETURN v_row;
END;
$$;

-- 4. Liberación: igual.
create or replace function public.accounting_release_reservation(p_reservation_id uuid)
returns public.credit_reservations
language plpgsql
security definer
set search_path = 'public'
as $$
DECLARE
  v_row public.credit_reservations;
BEGIN
  UPDATE public.credit_reservations
     SET status = 'released', settled_at = now()
   WHERE id = p_reservation_id AND status = 'active'
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'reserva % no encontrada o no esta activa, no se puede liberar', p_reservation_id;
  END IF;

  RETURN v_row;
END;
$$;

-- 5. Permisos: solo service_role.
revoke execute on function public.accounting_verify_and_reserve(uuid, numeric, integer, uuid) from public, anon, authenticated;
revoke execute on function public.accounting_settle_reservation(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.accounting_release_reservation(uuid) from public, anon, authenticated;
revoke execute on function public.accounting_expire_stale_reservations() from public, anon, authenticated;
revoke execute on function public.accounting_cuota_ia_del_plan(text) from public, anon, authenticated;

grant execute on function public.accounting_verify_and_reserve(uuid, numeric, integer, uuid) to service_role;
grant execute on function public.accounting_settle_reservation(uuid, numeric) to service_role;
grant execute on function public.accounting_release_reservation(uuid) to service_role;
grant execute on function public.accounting_expire_stale_reservations() to service_role;
grant execute on function public.accounting_cuota_ia_del_plan(text) to service_role;
