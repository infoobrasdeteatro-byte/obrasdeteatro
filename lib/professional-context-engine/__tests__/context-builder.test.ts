import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getIdentity,
  getProfessionalProfilePublic,
  getSubscription,
  getProfilePlan,
  getUsageLimit,
  getIndividualProfileData,
  getOrganizationalProfileData,
} from '@/lib/repository-layer'
import { buildProfessionalContext } from '../context-builder'

vi.mock('@/lib/repository-layer', () => ({
  getIdentity: vi.fn(),
  getProfessionalProfilePublic: vi.fn(),
  getSubscription: vi.fn(),
  getProfilePlan: vi.fn(),
  getUsageLimit: vi.fn(),
  getIndividualProfileData: vi.fn(),
  getOrganizationalProfileData: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getIdentity).mockReset()
  vi.mocked(getProfessionalProfilePublic).mockReset()
  vi.mocked(getSubscription).mockReset()
  vi.mocked(getUsageLimit).mockReset()
  vi.mocked(getIndividualProfileData).mockReset()
  vi.mocked(getOrganizationalProfileData).mockReset()
})

describe('buildProfessionalContext', () => {
  it('compone las 4 secciones en un único ProfessionalContext', async () => {
    vi.mocked(getIdentity).mockResolvedValue({
      userId: 'user-1',
      profileType: 'actor',
      language: 'es',
      country: 'ES',
      timezone: null,
    })
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(null)
    vi.mocked(getProfilePlan).mockResolvedValue('premium')
    vi.mocked(getSubscription).mockResolvedValue({
      plan: 'premium',
      status: 'active',
      currentPeriodEnd: '2026-08-21T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    })
    vi.mocked(getIndividualProfileData).mockResolvedValue(null)
    vi.mocked(getUsageLimit).mockReturnValue('30')

    const result = await buildProfessionalContext('user-1', { route: '/scenaia', module: 'biblioteca', locale: 'es' })

    expect(result.identity.userId).toBe('user-1')
    expect(result.identity.authenticationStatus).toBe('autenticado')
    expect(result.subscription).toEqual({ plan: 'premium', status: 'active', availableCapabilities: null, usageLimits: '30' })
    expect(result.professionalProfile).toEqual({
      specialty: null,
      disciplines: null,
      experience: null,
      publicProfile: null,
    })
    expect(getIndividualProfileData).toHaveBeenCalledWith('user-1', 'actor')
    expect(result.session.route).toBe('/scenaia')
  })

  it('nunca lanza excepción cuando no existe fila de profiles ni de subscriptions: construye un contexto degradado completo', async () => {
    vi.mocked(getIdentity).mockResolvedValue(null)
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(null)
    // Perfil inexistente: sin plan y sin relacion comercial.
    vi.mocked(getProfilePlan).mockResolvedValue(null)
    vi.mocked(getSubscription).mockResolvedValue(null)
    vi.mocked(getUsageLimit).mockReturnValue(null)

    await expect(
      buildProfessionalContext('user-sin-perfil', { route: null, module: null, locale: 'es' })
    ).resolves.toMatchObject({
      identity: { userId: 'user-sin-perfil', profileType: null, authenticationStatus: 'autenticado' },
      subscription: { plan: null, status: null, availableCapabilities: null, usageLimits: null },
      professionalProfile: { specialty: null, disciplines: null, experience: null, publicProfile: null },
    })
    expect(getIndividualProfileData).not.toHaveBeenCalled()
    expect(getOrganizationalProfileData).not.toHaveBeenCalled()
  })
})
