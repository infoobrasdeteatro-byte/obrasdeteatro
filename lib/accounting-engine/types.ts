export type { CreditReservation, ReservationOutcome, ReservationStatus } from '@/lib/repository-layer'

/**
 * TTL por defecto de una reserva, en segundos. Decision de politica de
 * Accounting Engine (regla 4 del Acta de Apertura de Bloque III: libre
 * mientras no altere contratos ya congelados) -- Repository Layer no conoce
 * ni decide este valor, solo lo aplica como parametro recibido.
 */
export const DEFAULT_RESERVATION_TTL_SECONDS = 300
