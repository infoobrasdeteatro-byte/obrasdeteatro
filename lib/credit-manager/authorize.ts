import type { ProfessionalContext } from '@/lib/professional-context-engine'
import type { DecisionContext } from '@/lib/decision-engine'
import { verifyAndReserve } from '@/lib/accounting-engine'
import type { AuthorizationContext } from './types'
import { formatReason } from './reason-prefixes'
import { parseAuthorizedLimit } from './parse-authorized-limit'

/**
 * Unico punto de entrada de Credit Manager (SC-004.5). No accede
 * directamente al SKM, al PCE ni al AI Gateway -- recibe unicamente las
 * salidas ya construidas de PCE y Decision Engine, y la unica dependencia
 * funcional nueva (reapertura 2026-07-13) es la operacion atomica de
 * verificar-y-reservar de Accounting Engine.
 *
 * `requestId` SI se propaga desde el cierre del circuito economico:
 * DecisionContext ya lo transporta, y sin el la reserva quedaba sin
 * vinculo con la peticion que la origino (`request_id` en NULL en las 75
 * reservas reales existentes). `reservationId` viaja de vuelta en el
 * contexto para que el ciclo pueda cerrarse despues -- liquidando o
 * liberando -- sobre la reserva concreta.
 */
export async function buildAuthorizationContext(
  professionalContext: ProfessionalContext,
  decisionContext: DecisionContext
): Promise<AuthorizationContext> {
  const timestamp = new Date().toISOString()

  if (!decisionContext.needsAI) {
    return {
      authorizationStatus: 'AUTHORIZED',
      authorizationReason: formatReason('NO_APLICA', 'no se requiere IA para esta peticion'),
      reservationId: null,
      availableCredits: null,
      estimatedCost: null,
      remainingQuota: null,
      timestamp,
    }
  }

  const estimatedCost = decisionContext.estimatedCost
  if (estimatedCost === null) {
    return {
      authorizationStatus: 'DENIED',
      authorizationReason: formatReason('SIN_DATOS_VERIFICABLES', 'coste estimado no disponible (IA-004)'),
      reservationId: null,
      availableCredits: null,
      estimatedCost: null,
      remainingQuota: null,
      timestamp,
    }
  }

  const authorizedLimit = parseAuthorizedLimit(professionalContext.subscription.usageLimits)
  if (authorizedLimit === null) {
    return {
      authorizationStatus: 'DENIED',
      authorizationReason: formatReason('SIN_DATOS_VERIFICABLES', 'limite de plan no disponible (IA-001)'),
      reservationId: null,
      availableCredits: null,
      estimatedCost,
      remainingQuota: null,
      timestamp,
    }
  }

  if (authorizedLimit.kind === 'ILIMITADO') {
    return {
      authorizationStatus: 'AUTHORIZED',
      authorizationReason: formatReason('VERIFICADO', 'plan sin control de cuota (IA-AUTH-001)'),
      // Sin cupo que consumir no hay reserva que cerrar despues.
      reservationId: null,
      availableCredits: null,
      estimatedCost,
      remainingQuota: null,
      timestamp,
    }
  }

  const outcome = await verifyAndReserve(
    professionalContext.identity.userId,
    authorizedLimit.value,
    estimatedCost,
    decisionContext.requestId
  )

  if (!outcome.authorized) {
    const available = Math.max(authorizedLimit.value - outcome.currentConsumption, 0)
    return {
      authorizationStatus: 'DENIED',
      authorizationReason: formatReason('VERIFICACION_NEGATIVA', outcome.denialReason),
      reservationId: null,
      availableCredits: available,
      estimatedCost,
      remainingQuota: available,
      timestamp,
    }
  }

  // availableCredits refleja el cupo total antes de esta operacion;
  // remainingQuota refleja el cupo tras reservar esta operacion concreta
  // -- sin contar otras reservas concurrentes que la propia funcion atomica
  // sí verifico internamente pero no devuelve en la rama autorizada.
  return {
    authorizationStatus: 'AUTHORIZED',
    authorizationReason: formatReason('VERIFICADO', 'reserva de credito confirmada'),
    reservationId: outcome.reservation.id,
    availableCredits: authorizedLimit.value,
    estimatedCost: outcome.reservation.estimatedCost,
    remainingQuota: authorizedLimit.value - outcome.reservation.estimatedCost,
    timestamp,
  }
}
