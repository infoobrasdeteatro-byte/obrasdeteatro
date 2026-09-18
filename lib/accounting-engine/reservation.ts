import { verifyAndReserve as repositoryVerifyAndReserve } from '@/lib/repository-layer'
import type { ReservationOutcome } from './types'
import { DEFAULT_RESERVATION_TTL_SECONDS } from './types'

/**
 * Unica operacion de entrada al ciclo economico (SC-005.3): verificacion y
 * reserva atomica. `estimatedCost` es el unico dato economico de entrada: el
 * limite del plan lo calcula la funcion de base de datos a partir del
 * plan del perfil, para que ni el usuario ni ninguna capa intermedia puedan
 * enviar otro.
 *
 * Un plan sin techo se reserva y se liquida igual -- la medicion no depende
 * de que exista cuota -- pero la operacion atomica no puede denegarlo.
 */
export async function verifyAndReserve(
  profileId: string,
  estimatedCost: number,
  requestId?: string,
  ttlSeconds: number = DEFAULT_RESERVATION_TTL_SECONDS
): Promise<ReservationOutcome> {
  return repositoryVerifyAndReserve(profileId, estimatedCost, ttlSeconds, requestId ?? null)
}
