import { verifyAndReserve as repositoryVerifyAndReserve } from '@/lib/repository-layer'
import type { ReservationOutcome } from './types'
import { DEFAULT_RESERVATION_TTL_SECONDS } from './types'

/**
 * Unica operacion de entrada al ciclo economico (SC-005.3): verificacion y
 * reserva atomica. `authorizedLimit` y `estimatedCost` son los unicos datos
 * de entrada externos legitimos (DA-001) -- Accounting Engine nunca posee ni
 * deriva el limite de plan, solo lo recibe de quien lo invoque.
 *
 * `authorizedLimit` en `null` significa plan SIN LIMITE: se reserva y se
 * liquida igual -- la medicion no depende de que exista cuota -- pero la
 * operacion atomica no puede denegar lo que no tiene techo.
 */
export async function verifyAndReserve(
  profileId: string,
  authorizedLimit: number | null,
  estimatedCost: number,
  requestId?: string,
  ttlSeconds: number = DEFAULT_RESERVATION_TTL_SECONDS
): Promise<ReservationOutcome> {
  return repositoryVerifyAndReserve(profileId, authorizedLimit, estimatedCost, ttlSeconds, requestId ?? null)
}
