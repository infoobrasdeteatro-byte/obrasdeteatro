import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getIdentity, getProfessionalProfilePublic } from '@/lib/repository-layer'
import { buildProfessionalContext } from '../context-builder'

vi.mock('@/lib/repository-layer', () => ({
  getIdentity: vi.fn(),
  getProfessionalProfilePublic: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getIdentity).mockReset()
  vi.mocked(getProfessionalProfilePublic).mockReset()
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

    const result = await buildProfessionalContext('user-1', { route: '/scenaia', module: 'biblioteca', locale: 'es' })

    expect(result.identity.userId).toBe('user-1')
    expect(result.identity.authenticationStatus).toBe('autenticado')
    expect(result.subscription).toEqual({ plan: null, status: null, availableCapabilities: null, usageLimits: null })
    expect(result.professionalProfile).toEqual({
      specialty: null,
      disciplines: null,
      experience: null,
      publicProfile: null,
    })
    expect(result.session.route).toBe('/scenaia')
  })

  it('nunca lanza excepción cuando no existe fila de profiles: construye un contexto degradado completo', async () => {
    vi.mocked(getIdentity).mockResolvedValue(null)
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(null)

    await expect(
      buildProfessionalContext('user-sin-perfil', { route: null, module: null, locale: 'es' })
    ).resolves.toMatchObject({
      identity: { userId: 'user-sin-perfil', profileType: null, authenticationStatus: 'autenticado' },
    })
  })
})
