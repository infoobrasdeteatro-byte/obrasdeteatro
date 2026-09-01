import { createClient } from '@/lib/supabase/server'
import type { Subscription } from './types'

const SUBSCRIPTION_COLUMNS = 'plan, status, current_period_end, cancel_at_period_end'

function toSubscription(row: {
  plan: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean | null
}): Subscription {
  return {
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
  }
}

/**
 * Relacion comercial con Stripe. NO es la fuente del plan vigente (ver
 * `getProfilePlan`): aporta el estado de la suscripcion de pago y sus
 * fechas. Su ausencia es un estado normal -- significa "sin relacion de
 * pago", no "sin plan".
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_COLUMNS)
    .eq('profile_id', userId)
    .single()

  if (error || !data) return null

  return toSubscription(data)
}

/**
 * Cuota de IA de un plan, expresada como estado del dominio y no como
 * numero convenido (PRD-001).
 *
 * ILIMITADO no es "un limite muy grande" ni cero ni 999999999: es la
 * AUSENCIA de techo, y por eso no lleva cifra. Un plan sin techo se mide
 * igual que cualquier otro -- reserva, liquida y consta en el presupuesto
 * del periodo --, simplemente no puede denegarse por cuota.
 */
type PlanAIQuota =
  | { readonly kind: 'LIMITADO'; readonly creditsPerPeriod: number }
  | { readonly kind: 'ILIMITADO' }

const UNLIMITED_MARKER = 'ILIMITADO'

/**
 * FUENTE UNICA de la cuota de IA por plan (Bloque 5, Decision de Direccion
 * 2026-08-31). Las cifras son comerciales, no tecnicas: se declaran aqui y
 * en ningun otro sitio -- ni en la UI, ni en la API, ni en Credit Manager,
 * ni en las pruebas, ni en SQL. La funcion de base de datos NO las conoce:
 * recibe el techo como parametro en cada invocacion, de modo que cambiar
 * una cuota nunca exige una migracion.
 *
 * Lo que se cuenta son CREDITOS DE IA por periodo natural mensual, nunca
 * "usos" de ScenaIA. Las peticiones que se resuelven de forma determinista
 * -- las que no necesitan proveedor -- no llegan a reservar nada y por
 * tanto no descuentan de esta cuota; quedan registradas aparte, en
 * `nucleo_activity_log`. Agotar la cuota de IA no retira ninguna capacidad
 * determinista.
 *
 * Cifras anteriores (IA-AUTH-001, Tabla Definitiva de Planes v2): 5 / 30 /
 * 60 / ILIMITADO. Premium y Destacado quedan sustituidos por las que
 * siguen; Gratuito y Empresas se mantienen.
 *
 * Sigue siendo el unico lugar del repositorio con esta traduccion
 * (Decision de Direccion IA-AUTH-001, Punto 1: Repository Layer es la
 * unica autoridad del dominio Subscription).
 */
const PLAN_AI_QUOTAS: Readonly<Record<string, PlanAIQuota>> = {
  gratuito: { kind: 'LIMITADO', creditsPerPeriod: 5 },
  premium: { kind: 'LIMITADO', creditsPerPeriod: 100 },
  destacado: { kind: 'LIMITADO', creditsPerPeriod: 500 },
  empresas: { kind: 'ILIMITADO' },
}

/**
 * Serializa la cuota al canal ya congelado `SubscriptionSection.usageLimits`
 * (`string | null`), que Credit Manager interpreta con
 * `parseAuthorizedLimit`. `null` significa "plan desconocido": ni cuota
 * cero ni cuota infinita, sino ausencia de dato -- y Credit Manager la
 * trata como tal, denegando por falta de informacion y no por consumo.
 */
export function getUsageLimit(plan: string | null): string | null {
  if (plan === null) return null

  const quota = PLAN_AI_QUOTAS[plan]
  if (quota === undefined) return null

  return quota.kind === 'ILIMITADO' ? UNLIMITED_MARKER : String(quota.creditsPerPeriod)
}
