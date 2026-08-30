import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPublishedWorks, listPublicOrganizations, listPublicOrganizationProfiles } from '@/lib/repository-layer'
import { listStructuredKnowledge } from '../structured-knowledge'

vi.mock('@/lib/repository-layer', () => ({
  listPublishedWorks: vi.fn(),
  listPublicOrganizations: vi.fn(),
  listPublicOrganizationProfiles: vi.fn(),
}))

const SAMPLE_WORK = {
  id: 'work-1',
  title: 'La Casa de Bernarda Alba',
  subtitle: null,
  author: 'Federico García Lorca',
  genre: 'Drama',
  synopsis: 'Una familia bajo el luto.',
  language: 'es',
  year: 1936,
  slug: 'la-casa-de-bernarda-alba',
  minAge: 14,
  durationMinutes: 100,
  castSizeMax: 9, sourceName: null, sourceUrl: null,
}

const SAMPLE_ORG = {
  id: 'org-1',
  name: 'Teatro Real',
  type: 'teatro',
  countryCode: 'ES', region: null, city: null,
  website: 'https://teatro-real.example.com',
  slug: 'teatro-real',
}

describe('listStructuredKnowledge (integración entre dominios Obras + Organizaciones)', () => {
  beforeEach(() => {
    vi.mocked(listPublishedWorks).mockReset()
    vi.mocked(listPublicOrganizations).mockReset()
    vi.mocked(listPublicOrganizationProfiles).mockReset().mockResolvedValue([])
  })

  it('combina ambos dominios en un único conjunto coherente, cada uno con su etiqueta correcta', async () => {
    vi.mocked(listPublishedWorks).mockResolvedValue([SAMPLE_WORK])
    vi.mocked(listPublicOrganizations).mockResolvedValue([SAMPLE_ORG])

    const result = await listStructuredKnowledge(10)

    expect(result).toMatchObject([
      { domain: 'Obras', data: SAMPLE_WORK  },
      { domain: 'Organizaciones', data: SAMPLE_ORG  },
    ])
    expect(listPublishedWorks).toHaveBeenCalledWith({}, 10)
    expect(listPublicOrganizations).toHaveBeenCalledWith({}, 10)
  })

  it('no falla y devuelve solo lo disponible cuando un dominio está vacío', async () => {
    vi.mocked(listPublishedWorks).mockResolvedValue([SAMPLE_WORK])
    vi.mocked(listPublicOrganizations).mockResolvedValue([])

    const result = await listStructuredKnowledge()

    expect(result).toMatchObject([{ domain: 'Obras', data: SAMPLE_WORK  }])
  })

  it('solo produce dominios ya implementados (Obras, Organizaciones), nunca otro valor de KnowledgeDomain', async () => {
    vi.mocked(listPublishedWorks).mockResolvedValue([SAMPLE_WORK])
    vi.mocked(listPublicOrganizations).mockResolvedValue([SAMPLE_ORG])

    const result = await listStructuredKnowledge()

    const domains = new Set(result.map((item) => item.domain))
    expect(domains).toEqual(new Set(['Obras', 'Organizaciones']))
  })
})
