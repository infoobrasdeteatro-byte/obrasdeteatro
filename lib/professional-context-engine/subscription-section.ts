import { getSubscription, getProfilePlan, getUsageLimit } from '@/lib/repository-layer'
import type { SubscriptionSection } from './types'

/**
 * IA-001 resuelta (Decision de Direccion, 2026-07-21) y CORREGIDA en el
 * cierre del circuito economico.
 *
 * Que cambia y por que: `plan` y `usageLimits` pasan a leerse de
 * `profiles.plan` -- el plan vigente del usuario -- en lugar de deducirse
 * de la existencia de una fila en `subscriptions`. Ambas siguen viniendo
 * exclusivamente de Repository Layer, sin interpretacion propia (mismo
 * patron ya aplicado).
 *
 * El motivo es de dominio, no de conveniencia: `subscriptions` refleja la
 * relacion comercial con Stripe y solo existe cuando hay pago, de modo que
 * su ausencia se estaba leyendo como "plan desconocido" cuando en realidad
 * significaba "plan gratuito". Con datos reales, 34 de 35 perfiles quedaban
 * sin plan -- incluido uno de plan `empresas`.
 *
 * `status` SI sigue viniendo de `subscriptions`, que es su fuente legitima:
 * describe el estado de la relacion de pago, no el nivel de producto. Su
 * ausencia sigue siendo `null`, un estado normal.
 *
 * availableCapabilities permanece "no disponible", fuera de alcance.
 */
export async function buildSubscriptionSection(userId: string): Promise<SubscriptionSection> {
  const [plan, subscription] = await Promise.all([getProfilePlan(userId), getSubscription(userId)])

  return {
    plan,
    status: subscription?.status ?? null,
    availableCapabilities: null,
    usageLimits: getUsageLimit(plan),
  }
}
