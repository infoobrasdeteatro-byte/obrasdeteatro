import { getSubscription, getUsageLimit } from '@/lib/repository-layer'
import type { SubscriptionSection } from './types'

/**
 * IA-001 resuelta (Decision de Direccion, 2026-07-21): subscriptions.plan/
 * status son la fuente autoritativa, expuesta exclusivamente via
 * Repository Layer. usageLimits resuelto por IA-AUTH-001 (2026-07-23):
 * tambien transportado desde Repository Layer (getUsageLimit), sin
 * interpretacion propia -- mismo patron ya aplicado a plan/status.
 * availableCapabilities permanece "no disponible", fuera de alcance.
 */
export async function buildSubscriptionSection(userId: string): Promise<SubscriptionSection> {
  const subscription = await getSubscription(userId)

  return {
    plan: subscription?.plan ?? null,
    status: subscription?.status ?? null,
    availableCapabilities: null,
    usageLimits: getUsageLimit(subscription?.plan ?? null),
  }
}
