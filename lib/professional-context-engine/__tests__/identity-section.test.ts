import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getIdentity } from '@/lib/repository-layer'
import { buildIdentitySection } from '../identity-section'

vi.mock('@/lib/repository-layer', () => ({
  getIdentity: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getIdentity).mockReset()
})

describe('buildIdentitySection', () => {
  it('mapea la identidad encontrada, con estado de autenticación constante', async () => {
    vi.mocked(getIdentity).mockResolvedValue({
      userId: 'user-1',
      profileType: 'actor',
      language: 'es',
      country: 'ES',
      timezone: null,
    })

    const result = await buildIdentitySection('user-1')

    expect(result).toEqual({
      userId: 'user-1',
      profileType: 'actor',
      language: 'es',
      country: 'ES',
      timezone: null,
      authenticationStatus: 'autenticado',
    })
  })

  it('degrada de forma segura si no existe fila de profiles, sin lanzar excepción', async () => {
    vi.mocked(getIdentity).mockResolvedValue(null)

    const result = await buildIdentitySection('user-sin-perfil')

    expect(result).toEqual({
      userId: 'user-sin-perfil',
      profileType: null,
      language: null,
      country: null,
      timezone: null,
      authenticationStatus: 'autenticado',
    })
  })
})
