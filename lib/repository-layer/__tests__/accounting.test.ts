import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { verifyAndReserve, settleReservation, releaseReservation, expireStaleReservations } from '../accounting'
import { createFakeSupabaseRpcClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(createClient).mockReset()
})

const AUTHORIZED_ROW = {
  authorized: true,
  reservation_id: 'reservation-1',
  status: 'active',
  estimated_cost: 5,
  authorized_limit_snapshot: 30,
  expires_at: '2026-07-16T00:05:00.000Z',
  created_at: '2026-07-16T00:00:00.000Z',
  current_consumption: 10,
  denial_reason: null,
}

const DENIED_ROW = {
  authorized: false,
  reservation_id: null,
  status: null,
  estimated_cost: 25,
  authorized_limit_snapshot: 30,
  expires_at: null,
  created_at: null,
  current_consumption: 10,
  denial_reason: 'consumo_actual(10) + coste_estimado(25) > limite_autorizado(30)',
}

describe('verifyAndReserve', () => {
  it('mapea una fila autorizada al contrato ReservationOutcome (authorized: true)', async () => {
    const { client, rpc } = createFakeSupabaseRpcClient({ data: AUTHORIZED_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await verifyAndReserve('profile-1', 30, 5, 300, 'request-1')

    expect(result).toEqual({
      authorized: true,
      reservation: {
        id: 'reservation-1',
        profileId: 'profile-1',
        requestId: 'request-1',
        status: 'active',
        estimatedCost: 5,
        settledCost: null,
        authorizedLimitSnapshot: 30,
        expiresAt: '2026-07-16T00:05:00.000Z',
        createdAt: '2026-07-16T00:00:00.000Z',
        settledAt: null,
      },
    })
    expect(rpc).toHaveBeenCalledWith('accounting_verify_and_reserve', {
      p_profile_id: 'profile-1',
      p_authorized_limit: 30,
      p_estimated_cost: 5,
      p_ttl_seconds: 300,
      p_request_id: 'request-1',
    })
  })

  it('mapea una fila denegada al contrato ReservationOutcome (authorized: false), sin inventar una reserva', async () => {
    const { client } = createFakeSupabaseRpcClient({ data: DENIED_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await verifyAndReserve('profile-1', 30, 25, 300)

    expect(result).toEqual({
      authorized: false,
      currentConsumption: 10,
      denialReason: 'consumo_actual(10) + coste_estimado(25) > limite_autorizado(30)',
    })
  })

  it('lanza si la función RPC devuelve error', async () => {
    const { client } = createFakeSupabaseRpcClient({ data: null, error: { message: 'no autorizado a reservar credito para otro perfil' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(verifyAndReserve('profile-1', 30, 5, 300)).rejects.toThrow(/no autorizado/)
  })
})

describe('settleReservation', () => {
  it('mapea la fila liquidada al contrato CreditReservation', async () => {
    const row = {
      id: 'reservation-1',
      profile_id: 'profile-1',
      request_id: 'request-1',
      status: 'settled',
      estimated_cost: 5,
      settled_cost: 4.2,
      authorized_limit_snapshot: 30,
      expires_at: '2026-07-16T00:05:00.000Z',
      created_at: '2026-07-16T00:00:00.000Z',
      settled_at: '2026-07-16T00:01:00.000Z',
    }
    const { client, rpc } = createFakeSupabaseRpcClient({ data: row, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await settleReservation('reservation-1', 4.2)

    expect(result).toEqual({
      id: 'reservation-1',
      profileId: 'profile-1',
      requestId: 'request-1',
      status: 'settled',
      estimatedCost: 5,
      settledCost: 4.2,
      authorizedLimitSnapshot: 30,
      expiresAt: '2026-07-16T00:05:00.000Z',
      createdAt: '2026-07-16T00:00:00.000Z',
      settledAt: '2026-07-16T00:01:00.000Z',
    })
    expect(rpc).toHaveBeenCalledWith('accounting_settle_reservation', {
      p_reservation_id: 'reservation-1',
      p_real_cost: 4.2,
    })
  })

  it('lanza si la reserva no esta activa', async () => {
    const { client } = createFakeSupabaseRpcClient({
      data: null,
      error: { message: 'reserva reservation-1 no esta activa, no se puede liquidar' },
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(settleReservation('reservation-1', 4.2)).rejects.toThrow(/no esta activa/)
  })
})

describe('releaseReservation', () => {
  it('mapea la fila liberada al contrato CreditReservation', async () => {
    const row = {
      id: 'reservation-1',
      profile_id: 'profile-1',
      request_id: null,
      status: 'released',
      estimated_cost: 5,
      settled_cost: null,
      authorized_limit_snapshot: 30,
      expires_at: '2026-07-16T00:05:00.000Z',
      created_at: '2026-07-16T00:00:00.000Z',
      settled_at: '2026-07-16T00:01:00.000Z',
    }
    const { client } = createFakeSupabaseRpcClient({ data: row, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await releaseReservation('reservation-1')

    expect(result.status).toBe('released')
    expect(result.settledCost).toBeNull()
  })
})

describe('expireStaleReservations', () => {
  it('devuelve el número de reservas caducadas marcadas', async () => {
    const { client } = createFakeSupabaseRpcClient({ data: 3, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await expireStaleReservations()

    expect(result).toBe(3)
  })

  it('lanza si la función RPC devuelve error', async () => {
    const { client } = createFakeSupabaseRpcClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(expireStaleReservations()).rejects.toThrow(/boom/)
  })
})
