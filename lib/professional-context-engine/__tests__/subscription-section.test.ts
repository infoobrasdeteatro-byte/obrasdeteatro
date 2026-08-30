import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSubscription, getProfilePlan, getUsageLimit } from '@/lib/repository-layer'
import { buildSubscriptionSection } from '../subscription-section'

vi.mock('@/lib/repository-layer', () => ({
  getSubscription: vi.fn(),
  getProfilePlan: vi.fn(),
  getUsageLimit: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getSubscription).mockReset()
  vi.mocked(getProfilePlan).mockReset()
  vi.mocked(getUsageLimit).mockReset()
})

/**
 * El plan vigente y la relacion comercial son dos hechos distintos y se leen
 * de sitios distintos: `profiles.plan` y `subscriptions`. Estos tests fijan
 * esa separacion, que es exactamente lo que fallaba antes -- deducir el plan
 * de la existencia de una fila de Stripe dejaba sin plan a todo el que no
 * paga, incluido un usuario de plan `empresas`.
 */
describe('buildSubscriptionSection', () => {
  it('el plan y su limite vienen del plan VIGENTE; el status, de la relacion comercial', async () => {
    vi.mocked(getProfilePlan).mockResolvedValue('premium')
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
    expect(getProfilePlan).toHaveBeenCalledWith('user-1')
    expect(getSubscription).toHaveBeenCalledWith('user-1')
    expect(getUsageLimit).toHaveBeenCalledWith('premium')
  })

  it('sin relacion comercial SIGUE habiendo plan: el gratuito no es ausencia de plan', async () => {
    vi.mocked(getProfilePlan).mockResolvedValue('gratuito')
    vi.mocked(getSubscription).mockResolvedValue(null)
    vi.mocked(getUsageLimit).mockReturnValue('5')

    expect(await buildSubscriptionSection('user-gratuito')).toEqual({
      plan: 'gratuito',
      status: null,
      availableCapabilities: null,
      usageLimits: '5',
    })
    // El limite se resuelve sobre el plan real, nunca sobre `null`.
    expect(getUsageLimit).toHaveBeenCalledWith('gratuito')
  })

  it('un plan alto sin fila de Stripe conserva su limite: era el caso que quedaba bloqueado', async () => {
    vi.mocked(getProfilePlan).mockResolvedValue('empresas')
    vi.mocked(getSubscription).mockResolvedValue(null)
    vi.mocked(getUsageLimit).mockReturnValue('ILIMITADO')

    const seccion = await buildSubscriptionSection('user-empresas')

    expect(seccion.plan).toBe('empresas')
    expect(seccion.usageLimits).toBe('ILIMITADO')
  })

  it('tras cancelar, el limite es el del plan vigente, nunca el del plan que se cancelo', async () => {
    // El webhook de Stripe ya devuelve profiles.plan a 'gratuito' al cancelar,
    // y deja la fila en 'canceled' como registro historico.
    vi.mocked(getProfilePlan).mockResolvedValue('gratuito')
    vi.mocked(getSubscription).mockResolvedValue({
      plan: 'premium',
      status: 'canceled',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: true,
    })
    vi.mocked(getUsageLimit).mockReturnValue('5')

    const seccion = await buildSubscriptionSection('user-excancelado')

    expect(seccion.plan).toBe('gratuito')
    expect(seccion.status).toBe('canceled')
    expect(getUsageLimit).toHaveBeenCalledWith('gratuito')
    expect(getUsageLimit).not.toHaveBeenCalledWith('premium')
  })

  it('degrada a "no disponible" solo cuando el perfil no existe', async () => {
    vi.mocked(getProfilePlan).mockResolvedValue(null)
    vi.mocked(getSubscription).mockResolvedValue(null)
    vi.mocked(getUsageLimit).mockReturnValue(null)

    expect(await buildSubscriptionSection('user-inexistente')).toEqual({
      plan: null,
      status: null,
      availableCapabilities: null,
      usageLimits: null,
    })
    expect(getUsageLimit).toHaveBeenCalledWith(null)
  })

  it('availableCapabilities sigue no disponible (fuera de alcance)', async () => {
    vi.mocked(getProfilePlan).mockResolvedValue('premium')
    vi.mocked(getSubscription).mockResolvedValue(null)
    vi.mocked(getUsageLimit).mockReturnValue('30')

    expect((await buildSubscriptionSection('user-1')).availableCapabilities).toBeNull()
  })
})
