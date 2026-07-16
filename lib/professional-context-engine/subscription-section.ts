import type { SubscriptionSection } from './types'

/**
 * v1: seccion completa "no disponible" -- IA-001 permanece abierta y
 * diferida (decision aprobada por la Direccion del Proyecto: no introducir
 * ningun accessor parcial mientras la fuente autoritativa de Subscription/
 * plan no este resuelta).
 */
export function buildSubscriptionSection(): SubscriptionSection {
  return {
    plan: null,
    status: null,
    availableCapabilities: null,
    usageLimits: null,
  }
}
