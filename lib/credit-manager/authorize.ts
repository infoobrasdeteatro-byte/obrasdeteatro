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
      // Una peticion determinista no consume cuota de IA: no hay nada que
      // denegar, y por tanto no hay causa de denegacion.
      denialCode: null,
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
      denialCode: 'estimated_cost_unknown',
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
      denialCode: 'plan_quota_unknown',
      reservationId: null,
      availableCredits: null,
      estimatedCost,
      remainingQuota: null,
      timestamp,
    }
  }

  // Un plan sin cuota comercial sigue consumiendo recursos reales. Hasta
  // ahora esa rama devolvia `reservationId: null` y salia del circuito
  // economico entera: sin reserva, sin liquidacion y sin coste registrado.
  // El resultado es que el unico plan sin techo era tambien el unico del
  // que no se sabia absolutamente nada -- justo donde mas falta hace.
  //
  // Medir no es limitar. `null` como limite recorre el mismo circuito
  // atomico que cualquier otra reserva, pero la funcion de base de datos
  // no puede denegarlo: sin techo no hay comparacion posible. La promesa
  // comercial "ilimitado" queda intacta; lo que desaparece es la ceguera.
  const outcome = await verifyAndReserve(
    professionalContext.identity.userId,
    authorizedLimit.kind === 'ILIMITADO' ? null : authorizedLimit.value,
    estimatedCost,
    decisionContext.requestId
  )

  if (!outcome.authorized) {
    // Inalcanzable con un plan sin limite: la operacion atomica no puede
    // denegar lo que no tiene techo contra el que compararse.
    const available =
      authorizedLimit.kind === 'ILIMITADO' ? null : Math.max(authorizedLimit.value - outcome.currentConsumption, 0)
    return {
      authorizationStatus: 'DENIED',
      authorizationReason: formatReason('VERIFICACION_NEGATIVA', outcome.denialReason),
      // La operacion atomica solo tiene UNA forma de devolver `authorized:
      // false` -- que el presupuesto del periodo no alcance. Cualquier otra
      // condicion (perfil ajeno, coste no positivo, TTL invalido) lanza
      // excepcion y no llega hasta aqui. Por eso este codigo es exacto y no
      // una interpretacion del texto de la razon.
      denialCode: 'insufficient_ai_credits',
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
    authorizationReason: formatReason(
      'VERIFICADO',
      authorizedLimit.kind === 'ILIMITADO'
        ? 'plan sin control de cuota (IA-AUTH-001) -- reserva creada para medir, nunca para limitar'
        : 'reserva de credito confirmada'
    ),
    denialCode: null,
    reservationId: outcome.reservation.id,
    // Sin techo, "creditos disponibles" y "cuota restante" no valen cero:
    // son magnitudes que no existen para este plan.
    availableCredits: authorizedLimit.kind === 'ILIMITADO' ? null : authorizedLimit.value,
    estimatedCost: outcome.reservation.estimatedCost,
    remainingQuota:
      authorizedLimit.kind === 'ILIMITADO' ? null : authorizedLimit.value - outcome.reservation.estimatedCost,
    timestamp,
  }
}
