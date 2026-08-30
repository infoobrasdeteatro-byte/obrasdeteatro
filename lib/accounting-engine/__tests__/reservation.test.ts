import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyAndReserve as repositoryVerifyAndReserve } from '@/lib/repository-layer'
import { verifyAndReserve } from '../reservation'
import { DEFAULT_RESERVATION_TTL_SECONDS } from '../types'

vi.mock('@/lib/repository-layer', () => ({
  verifyAndReserve: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(repositoryVerifyAndReserve).mockReset()
})

const AUTHORIZED_OUTCOME = {
  authorized: true as const,
  reservation: {
    id: 'reservation-1',
    profileId: 'profile-1',
    requestId: 'request-1',
    status: 'active' as const,
    estimatedCost: 5,
    settledCost: null,
    authorizedLimitSnapshot: 30,
    expiresAt: '2026-07-16T00:05:00.000Z',
    createdAt: '2026-07-16T00:00:00.000Z',
    settledAt: null,
  },
  // Presupuesto del periodo, calculado en la misma operacion atomica.
  budget: {
    periodStart: '2026-07-01T00:00:00.000Z',
    settledConsumption: 4,
    reservedConsumption: 5,
    availableCapacity: 21,
  },
}

describe('verifyAndReserve (Accounting Engine)', () => {
  it('aplica el TTL por defecto cuando no se especifica uno', async () => {
    vi.mocked(repositoryVerifyAndReserve).mockResolvedValue(AUTHORIZED_OUTCOME)

    await verifyAndReserve('profile-1', 30, 5, 'request-1')

    expect(repositoryVerifyAndReserve).toHaveBeenCalledWith(
      'profile-1',
      30,
      5,
      DEFAULT_RESERVATION_TTL_SECONDS,
      'request-1'
    )
  })

  it('permite sobrescribir el TTL explícitamente', async () => {
    vi.mocked(repositoryVerifyAndReserve).mockResolvedValue(AUTHORIZED_OUTCOME)

    await verifyAndReserve('profile-1', 30, 5, 'request-1', 60)

    expect(repositoryVerifyAndReserve).toHaveBeenCalledWith('profile-1', 30, 5, 60, 'request-1')
  })

  it('permite invocarse sin requestId (invocación fuera de una petición viva del Núcleo)', async () => {
    vi.mocked(repositoryVerifyAndReserve).mockResolvedValue(AUTHORIZED_OUTCOME)

    await verifyAndReserve('profile-1', 30, 5)

    expect(repositoryVerifyAndReserve).toHaveBeenCalledWith(
      'profile-1',
      30,
      5,
      DEFAULT_RESERVATION_TTL_SECONDS,
      null
    )
  })

  it('propaga el resultado de Repository Layer sin transformarlo', async () => {
    vi.mocked(repositoryVerifyAndReserve).mockResolvedValue(AUTHORIZED_OUTCOME)

    const result = await verifyAndReserve('profile-1', 30, 5, 'request-1')

    expect(result).toBe(AUTHORIZED_OUTCOME)
  })
})
