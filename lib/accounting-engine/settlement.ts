import {
  settleReservation as repositorySettleReservation,
  releaseReservation as repositoryReleaseReservation,
  expireStaleReservations as repositoryExpireStaleReservations,
} from '@/lib/repository-layer'
import type { CreditReservation } from './types'

/** Liquidacion: cierra una reserva activa con el coste real (ExecutionAudit, SC-004.7). */
export async function settleReservation(reservationId: string, realCost: number): Promise<CreditReservation> {
  return repositorySettleReservation(reservationId, realCost)
}

/** Libera una reserva activa sin liquidacion -- la ejecucion no llego a producirse. */
export async function releaseReservation(reservationId: string): Promise<CreditReservation> {
  return repositoryReleaseReservation(reservationId)
}

/**
 * Housekeeping: la garantia de que una reserva nunca bloquea credito
 * indefinidamente ya es efectiva por consulta (filtro expires_at > now() en
 * la propia operacion de verificacion, ver migracion) -- esto solo mantiene
 * el dato en reposo consistente, no es la fuente de la garantia.
 */
export async function expireStaleReservations(): Promise<number> {
  return repositoryExpireStaleReservations()
}
