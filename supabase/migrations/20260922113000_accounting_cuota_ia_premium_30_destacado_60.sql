-- Cuota de IA de Premium y Destacado: de 100 y 500 a 30 y 60.
--
-- Por qué: 30 y 60 son las cifras de la Tabla Definitiva de Planes v2,
-- recogidas en docs/arquitectura/ARQUITECTURA_FUNCIONAL_OBRASDETEATRO_v2.0.md
-- §9.2 y en el cierre de IA-AUTH-001 (mapa maestro, 2026-07-23). El 100 y el
-- 500 entraron el 2026-09-01 (commit 17768c0) sin decisión documentada que
-- los respaldara, y la migración 20260918152046 los trasladó a la base.
--
-- Sin efecto sobre ningún usuario: en el momento de escribir esta migración
-- no hay ningún perfil Destacado, y el mayor consumo mensual registrado de un
-- perfil Premium es de 14,26 créditos, muy por debajo de 30.
--
-- Solo cambia esta función. El resto del circuito económico
-- (accounting_verify_and_reserve, settle, release y el barrido de caducidad)
-- queda intacto: la reserva sigue leyendo el techo de aquí.
--
-- Las mismas cifras están en PLAN_AI_QUOTAS (lib/repository-layer/subscription.ts),
-- y un test de contrato exige que coincidan: si cambia una, cambia la otra.

create or replace function public.accounting_cuota_ia_del_plan(p_plan text, out conocido boolean, out limite numeric)
language sql
immutable
set search_path = 'public'
as $$
  select
    p_plan in ('gratuito', 'premium', 'destacado', 'empresas'),
    case p_plan
      when 'gratuito'  then 5
      when 'premium'   then 30
      when 'destacado' then 60
      else null  -- empresas: sin techo; desconocido: se decide con `conocido`
    end::numeric;
$$;

comment on function public.accounting_cuota_ia_del_plan(text) is
  'Créditos de IA por periodo mensual según el plan: gratuito 5, premium 30, destacado 60, empresas sin techo (limite NULL). conocido=false para cualquier otro valor. Debe coincidir con PLAN_AI_QUOTAS (lib/repository-layer/subscription.ts).';
