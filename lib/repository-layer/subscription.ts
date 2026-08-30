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
 * Mapeo plan -> limite mensual (IA-AUTH-001, PRD-001). Fuente autoritativa:
 * Tabla Definitiva de Planes v2, Nivel 1
 * (docs/arquitectura/ARQUITECTURA_FUNCIONAL_OBRASDETEATRO_v2.0.md §9.2).
 * Conjunto cerrado y conocido -- sin persistencia nueva, coherente con el
 * impacto Muy Bajo ya acreditado en IA-AUTH-002. Unico lugar del
 * repositorio con esta traduccion (Decision de Direccion IA-AUTH-001,
 * Punto 1: Repository Layer es la unica autoridad del dominio Subscription).
 */
const PLAN_USAGE_LIMITS: Readonly<Record<string, string>> = {
  gratuito: '5',
  premium: '30',
  destacado: '60',
  empresas: 'ILIMITADO',
}

export function getUsageLimit(plan: string | null): string | null {
  if (plan === null) return null
  return PLAN_USAGE_LIMITS[plan] ?? null
}
