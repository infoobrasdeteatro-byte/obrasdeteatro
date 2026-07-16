import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  settleReservation as repositorySettleReservation,
  releaseReservation as repositoryReleaseReservation,
  expireStaleReservations as repositoryExpireStaleReservations,
} from '@/lib/repository-layer'
import { settleReservation, releaseReservation, expireStaleReservations } from '../settlement'

vi.mock('@/lib/repository-layer', () => ({
  settleReservation: vi.fn(),
  releaseReservation: vi.fn(),
  expireStaleReservations: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(repositorySettleReservation).mockReset()
  vi.mocked(repositoryReleaseReservation).mockReset()
  vi.mocked(repositoryExpireStaleReservations).mockReset()
})

const SETTLED_RESERVATION = {
  id: 'reservation-1',
  profileId: 'profile-1',
  requestId: 'request-1',
  status: 'settled' as const,
  estimatedCost: 5,
  settledCost: 4.2,
  authorizedLimitSnapshot: 30,
  expiresAt: '2026-07-16T00:05:00.000Z',
  createdAt: '2026-07-16T00:00:00.000Z',
  settledAt: '2026-07-16T00:01:00.000Z',
}

describe('settleReservation (Accounting Engine)', () => {
  it('delega en Repository Layer con el coste real recibido', async () => {
    vi.mocked(repositorySettleReservation).mockResolvedValue(SETTLED_RESERVATION)

    const result = await settleReservation('reservation-1', 4.2)

    expect(repositorySettleReservation).toHaveBeenCalledWith('reservation-1', 4.2)
    expect(result).toBe(SETTLED_RESERVATION)
  })
})

describe('releaseReservation (Accounting Engine)', () => {
  it('delega en Repository Layer sin capturar ningún coste', async () => {
    const released = { ...SETTLED_RESERVATION, status: 'released' as const, settledCost: null }
    vi.mocked(repositoryReleaseReservation).mockResolvedValue(released)

    const result = await releaseReservation('reservation-1')

    expect(repositoryReleaseReservation).toHaveBeenCalledWith('reservation-1')
    expect(result).toBe(released)
  })
})

describe('expireStaleReservations (Accounting Engine)', () => {
  it('delega en Repository Layer y propaga el recuento', async () => {
    vi.mocked(repositoryExpireStaleReservations).mockResolvedValue(7)

    const result = await expireStaleReservations()

    expect(repositoryExpireStaleReservations).toHaveBeenCalledWith()
    expect(result).toBe(7)
  })
})
