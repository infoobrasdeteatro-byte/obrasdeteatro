import { createClient } from '@/lib/supabase/server'
import type { CreditReservation, PeriodBudget, ReservationOutcome, ReservationStatus } from './types'

function toReservation(row: {
  id: string
  profile_id: string
  request_id: string | null
  status: string
  estimated_cost: number
  settled_cost: number | null
  authorized_limit_snapshot: number
  expires_at: string
  created_at: string
  settled_at: string | null
}): CreditReservation {
  return {
    id: row.id,
    profileId: row.profile_id,
    requestId: row.request_id,
    status: row.status as ReservationStatus,
    estimatedCost: row.estimated_cost,
    settledCost: row.settled_cost,
    authorizedLimitSnapshot: row.authorized_limit_snapshot,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    settledAt: row.settled_at,
  }
}

/**
 * Unica via de escritura de Accounting Engine (SC-005.3): operacion atomica
 * de verificacion y reserva. `authorizedLimit` y `estimatedCost` son los
 * unicos datos de entrada externos legitimos (DA-001) -- el consumo actual
 * se calcula siempre dentro de la funcion de base de datos, nunca aqui.
 */
export async function verifyAndReserve(
  profileId: string,
  authorizedLimit: number,
  estimatedCost: number,
  ttlSeconds: number,
  requestId: string | null = null
): Promise<ReservationOutcome> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('accounting_verify_and_reserve', {
      p_profile_id: profileId,
      p_authorized_limit: authorizedLimit,
      p_estimated_cost: estimatedCost,
      p_ttl_seconds: ttlSeconds,
      p_request_id: requestId ?? undefined,
    })
    .single()

  if (error || !data) {
    throw new Error(`accounting_verify_and_reserve failed: ${error?.message ?? 'sin datos'}`)
  }

  const budget: PeriodBudget = {
    periodStart: data.period_start,
    settledConsumption: data.settled_consumption,
    reservedConsumption: data.reserved_consumption,
    availableCapacity: data.available_capacity,
  }

  if (!data.authorized || !data.reservation_id || !data.status || !data.expires_at || !data.created_at) {
    return {
      authorized: false,
      currentConsumption: data.current_consumption,
      denialReason: data.denial_reason ?? 'reserva denegada',
      budget,
    }
  }

  return {
    authorized: true,
    reservation: {
      id: data.reservation_id,
      profileId,
      requestId,
      status: data.status as ReservationStatus,
      estimatedCost: data.estimated_cost,
      settledCost: null,
      authorizedLimitSnapshot: data.authorized_limit_snapshot,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      settledAt: null,
    },
    budget,
  }
}

export async function settleReservation(reservationId: string, realCost: number): Promise<CreditReservation> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('accounting_settle_reservation', {
    p_reservation_id: reservationId,
    p_real_cost: realCost,
  })

  if (error || !data) {
    throw new Error(`accounting_settle_reservation failed: ${error?.message ?? 'sin datos'}`)
  }

  return toReservation(data)
}

export async function releaseReservation(reservationId: string): Promise<CreditReservation> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('accounting_release_reservation', {
    p_reservation_id: reservationId,
  })

  if (error || !data) {
    throw new Error(`accounting_release_reservation failed: ${error?.message ?? 'sin datos'}`)
  }

  return toReservation(data)
}

/** Housekeeping: nunca es la fuente de la garantia de no-bloqueo (ver migracion). */
export async function expireStaleReservations(): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('accounting_expire_stale_reservations')

  if (error || data === null || data === undefined) {
    throw new Error(`accounting_expire_stale_reservations failed: ${error?.message ?? 'sin datos'}`)
  }

  return data
}
