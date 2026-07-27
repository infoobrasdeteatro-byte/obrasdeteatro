import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSubscription, getUsageLimit } from '@/lib/repository-layer'
import { buildSubscriptionSection } from '../subscription-section'

vi.mock('@/lib/repository-layer', () => ({
  getSubscription: vi.fn(),
  getUsageLimit: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getSubscription).mockReset()
  vi.mocked(getUsageLimit).mockReset()
})

describe('buildSubscriptionSection', () => {
  it('refleja plan/status reales y el usageLimits ya resuelto por Repository Layer (IA-AUTH-001); availableCapabilities sigue no disponible', async () => {
    vi.mocked(getSubscription).mockResolvedValue({
      plan: 'premium',
      status: 'active',
      currentPeriodEnd: '2026-08-21T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    })
    vi.mocked(getUsageLimit).mockReturnValue('30')

    expect(await buildSubscriptionSection('user-1')).toEqual({
      plan: 'premium',
      status: 'active',
      availableCapabilities: null,
      usageLimits: '30',
    })
    expect(getSubscription).toHaveBeenCalledWith('user-1')
    expect(getUsageLimit).toHaveBeenCalledWith('premium')
  })

  it('degrada a plan/status/usageLimits "no disponible" cuando el usuario no tiene fila en subscriptions', async () => {
    vi.mocked(getSubscription).mockResolvedValue(null)
    vi.mocked(getUsageLimit).mockReturnValue(null)

    expect(await buildSubscriptionSection('user-sin-suscripcion')).toEqual({
      plan: null,
      status: null,
      availableCapabilities: null,
      usageLimits: null,
    })
    expect(getUsageLimit).toHaveBeenCalledWith(null)
  })
})
