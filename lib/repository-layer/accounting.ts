import { createServiceClient } from '@/lib/supabase/service'
import type { AccountingVerifyAndReserveArgs, AccountingVerifyAndReserveRow } from './accounting-rpc-types'
import type { CreditReservation, PeriodBudget, ReservationOutcome, ReservationStatus } from './types'

function toReservation(row: {
  id: string
  profile_id: string
  request_id: string | null
  status: string
  estimated_cost: number
  settled_cost: number | null
  authorized_limit_snapshot: number | null
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

/*
 * Las cuatro operaciones van con el cliente de SERVICIO: las funciones
 * accounting_* solo son ejecutables por service_role. Antes iban con la
 * sesion del usuario, y eso le permitia llamarlas el mismo por la API con un
 * limite vacio (cuota ilimitada) o un coste real de 0. `profileId` lo
 * resuelve quien llama desde la sesion; nunca debe venir de la peticion.
 */

/**
 * Unica via de escritura de Accounting Engine (SC-005.3): operacion atomica
 * de verificacion y reserva. `estimatedCost` es el unico dato economico de
 * entrada: el limite lo calcula la funcion de base de datos a partir de
 * profiles.plan, y el consumo actual tambien se calcula alli, nunca aqui.
 *
 * Un plan sin techo (empresas) se mide igual -- reserva, liquidacion,
 * presupuesto del periodo -- pero no puede denegarse por cuota.
 */
export async function verifyAndReserve(
  profileId: string,
  estimatedCost: number,
  ttlSeconds: number,
  requestId: string | null = null
): Promise<ReservationOutcome> {
  const supabase = createServiceClient()

  const args: AccountingVerifyAndReserveArgs = {
    p_profile_id: profileId,
    p_estimated_cost: estimatedCost,
    p_ttl_seconds: ttlSeconds,
    p_request_id: requestId ?? undefined,
  }

  const { data: generated, error } = await supabase
    .rpc('accounting_verify_and_reserve', args)
    .single()

  if (error || !generated) {
    throw new Error(`accounting_verify_and_reserve failed: ${error?.message ?? 'sin datos'}`)
  }

  // Los tipos generados declaran no-nulos siete campos que la funcion SQL si
  // devuelve nulos (ver accounting-rpc-types.ts). Ensanchar aqui restituye
  // las comprobaciones de nulo de mas abajo, que si no serian codigo muerto
  // a ojos del compilador.
  const data: AccountingVerifyAndReserveRow = generated

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
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc('accounting_expire_stale_reservations')

  if (error || data === null || data === undefined) {
    throw new Error(`accounting_expire_stale_reservations failed: ${error?.message ?? 'sin datos'}`)
  }

  return data
}
