import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProfessionalProfilePublic, getIndividualProfileData, getOrganizationalProfileData } from '@/lib/repository-layer'
import { buildProfessionalProfileSection } from '../professional-profile-section'

vi.mock('@/lib/repository-layer', () => ({
  getProfessionalProfilePublic: vi.fn(),
  getIndividualProfileData: vi.fn(),
  getOrganizationalProfileData: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getProfessionalProfilePublic).mockReset()
  vi.mocked(getIndividualProfileData).mockReset()
  vi.mocked(getOrganizationalProfileData).mockReset()
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
  it('deriva specialty/disciplines/experience del contrato Individual cuando profileType pertenece a esa familia', async () => {
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(SAMPLE_PUBLIC_PROFILE)
    vi.mocked(getIndividualProfileData).mockResolvedValue({
      biography: 'Biografía de prueba',
      trajectory: 'Trayectoria de prueba',
      training: null,
      awards: null,
      specializations: ['canto', 'danza'],
      availability: ['castings', 'giras'],
      activityCounters: null,
      photoUrl: null,
      website: null,
      contactEmail: null,
      contactPhone: null,
      whatsapp: null,
      socialLinks: null,
    })

    const result = await buildProfessionalProfileSection('user-1', 'actor')

    expect(result).toEqual({
      specialty: 'canto, danza',
      disciplines: 'castings, giras',
      experience: 'Trayectoria de prueba',
      publicProfile: SAMPLE_PUBLIC_PROFILE,
    })
    expect(getIndividualProfileData).toHaveBeenCalledWith('user-1', 'actor')
    expect(getOrganizationalProfileData).not.toHaveBeenCalled()
  })

  it('deriva specialty/disciplines/experience del contrato Organizacional cuando profileType pertenece a esa familia', async () => {
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(null)
    vi.mocked(getOrganizationalProfileData).mockResolvedValue({
      name: 'Compañía de Prueba',
      commercialName: null,
      foundingYear: null,
      description: 'Descripción de prueba',
      history: null,
      activityCategories: ['clasico'],
      services: ['giras'],
      activityCounters: null,
      logoUrl: null,
      website: null,
      contactEmail: null,
      contactPhone: null,
      whatsapp: null,
      socialLinks: null,
      responsibleContact: null,
    })

    const result = await buildProfessionalProfileSection('user-2', 'compania')

    expect(result).toEqual({
      specialty: 'clasico',
      disciplines: 'giras',
      experience: 'Descripción de prueba',
      publicProfile: null,
    })
    expect(getOrganizationalProfileData).toHaveBeenCalledWith('user-2', 'compania')
    expect(getIndividualProfileData).not.toHaveBeenCalled()
  })

  it('degrada a specialty/disciplines/experience null cuando profileType no pertenece a ninguna familia (institucion/profesional/publico)', async () => {
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(null)

    const result = await buildProfessionalProfileSection('user-3', 'publico')

    expect(result).toEqual({ specialty: null, disciplines: null, experience: null, publicProfile: null })
    expect(getIndividualProfileData).not.toHaveBeenCalled()
    expect(getOrganizationalProfileData).not.toHaveBeenCalled()
  })

  it('degrada a specialty/disciplines/experience null cuando profileType es null', async () => {
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(null)

    const result = await buildProfessionalProfileSection('user-sin-perfil', null)

    expect(result).toEqual({ specialty: null, disciplines: null, experience: null, publicProfile: null })
  })

  it('degrada a null cuando el tipo pertenece a una familia pero no existe fila especializada', async () => {
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(null)
    vi.mocked(getIndividualProfileData).mockResolvedValue(null)

    const result = await buildProfessionalProfileSection('user-4', 'director')

    expect(result).toEqual({ specialty: null, disciplines: null, experience: null, publicProfile: null })
  })

  it('degrada publicProfile a null si Repository Layer no encuentra el perfil', async () => {
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(null)

    const result = await buildProfessionalProfileSection('user-sin-perfil', null)

    expect(result.publicProfile).toBeNull()
  })
})
