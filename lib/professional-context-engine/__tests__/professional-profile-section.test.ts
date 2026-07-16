import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProfessionalProfilePublic } from '@/lib/repository-layer'
import { buildProfessionalProfileSection } from '../professional-profile-section'

vi.mock('@/lib/repository-layer', () => ({
  getProfessionalProfilePublic: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getProfessionalProfilePublic).mockReset()
})

const SAMPLE_PUBLIC_PROFILE = {
  firstName: 'Ana',
  lastName: 'García',
  artisticName: null,
  slug: 'ana-garcia',
  bio: null,
  avatarUrl: null,
  coverUrl: null,
  isPublic: true,
  isVerified: false,
  websiteUrl: null,
}

describe('buildProfessionalProfileSection', () => {
  it('incluye el perfil público encontrado, con especialidad/disciplinas/experiencia siempre no disponibles (IA-002)', async () => {
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(SAMPLE_PUBLIC_PROFILE)

    const result = await buildProfessionalProfileSection('user-1')

    expect(result).toEqual({
      specialty: null,
      disciplines: null,
      experience: null,
      publicProfile: SAMPLE_PUBLIC_PROFILE,
    })
  })

  it('degrada publicProfile a null si Repository Layer no encuentra el perfil', async () => {
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(null)

    const result = await buildProfessionalProfileSection('user-sin-perfil')

    expect(result.publicProfile).toBeNull()
  })
})
