import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPublicOrganizationById, listPublicOrganizations, listPublicOrganizationProfiles } from '@/lib/repository-layer'
import { getOrganizationKnowledge, listOrganizationKnowledge } from '../organizations-knowledge'

vi.mock('@/lib/repository-layer', () => ({
  getPublicOrganizationById: vi.fn(),
  listPublicOrganizations: vi.fn(),
  listPublicOrganizationProfiles: vi.fn(),
}))

const SAMPLE_ORG = {
  id: 'org-1',
  name: 'Teatro Real',
  type: 'teatro',
  countryCode: 'ES', region: null, city: null,
  website: 'https://teatro-real.example.com',
  slug: 'teatro-real',
}

describe('getOrganizationKnowledge', () => {
  beforeEach(() => {
    vi.mocked(getPublicOrganizationById).mockReset()
  })

  it('tags a found organization with the Organizaciones domain', async () => {
    vi.mocked(getPublicOrganizationById).mockResolvedValue(SAMPLE_ORG)

    const result = await getOrganizationKnowledge('org-1')

    expect(result).toMatchObject({ domain: 'Organizaciones', data: SAMPLE_ORG  })
    expect(getPublicOrganizationById).toHaveBeenCalledWith('org-1')
  })

  it('returns null when Repository Layer finds no organization', async () => {
    vi.mocked(getPublicOrganizationById).mockResolvedValue(null)

    const result = await getOrganizationKnowledge('missing-org')

    expect(result).toBeNull()
  })
})

describe('listOrganizationKnowledge', () => {
  beforeEach(() => {
    vi.mocked(listPublicOrganizations).mockReset()
    vi.mocked(listPublicOrganizationProfiles).mockReset().mockResolvedValue([])
  })

  it('tags every organization in the list with the Organizaciones domain', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([SAMPLE_ORG])

    const result = await listOrganizationKnowledge({}, 5)

    expect(result).toMatchObject([{ domain: 'Organizaciones', data: SAMPLE_ORG  }])
    expect(listPublicOrganizations).toHaveBeenCalledWith({}, 5)
  })

  it('returns an empty array when there is nothing to list', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([])

    const result = await listOrganizationKnowledge()

    expect(result).toMatchObject([])
  })
})

describe('listOrganizationKnowledge — la funcion viaja dentro del propio KnowledgeItem', () => {
  it('deriva la funcion del tipo real declarado, junto a domain, data y provenance', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([
      { ...SAMPLE_ORG, id: 'o-uni', type: 'university' },
      { ...SAMPLE_ORG, id: 'o-fest', type: 'festival' },
      { ...SAMPLE_ORG, id: 'o-teat', type: 'theater' },
      { ...SAMPLE_ORG, id: 'o-otro', type: 'other' },
    ])

    const result = await listOrganizationKnowledge()

    expect(result.map((item) => item.functions)).toEqual([['formacion'], ['programacion'], ['sala'], []])
    for (const item of result) {
      expect(item.domain).toBe('Organizaciones')
      expect(item.provenance.authority).toBe('CATALOGO_PROPIO')
      expect(item.provenance.sourceName).toBeNull()
    }
  })

  it('una organizacion cuyo tipo no entrana funcion no recibe ninguna inventada', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([{ ...SAMPLE_ORG, type: 'cultural_org' }])

    const [item] = await listOrganizationKnowledge()

    expect(item.functions).toEqual([])
  })
})

describe('listOrganizationKnowledge — organizaciones con cuenta de usuario', () => {
  const PERFIL_ORG = {
    id: 'p-1',
    name: 'Teatro del Prado',
    type: 'teatro',
    countryCode: 'ES',
    region: 'Comunidad de Madrid',
    city: 'Madrid',
    website: null,
    slug: 'teatro-del-prado',
  }

  it('un perfil organizativo entra como Organizaciones, NUNCA como Personas', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([])
    vi.mocked(listPublicOrganizationProfiles).mockResolvedValue([PERFIL_ORG])

    const [item] = await listOrganizationKnowledge()

    expect(item.domain).toBe('Organizaciones')
    expect(item.data.name).toBe('Teatro del Prado')
  })

  it('deriva su funcion desde tipo_perfil, no desde el vocabulario de institutions', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([])
    vi.mocked(listPublicOrganizationProfiles).mockResolvedValue([
      { ...PERFIL_ORG, type: 'teatro' },
      { ...PERFIL_ORG, id: 'p-2', type: 'compania' },
      { ...PERFIL_ORG, id: 'p-3', type: 'escuela' },
      { ...PERFIL_ORG, id: 'p-4', type: 'institucion' },
    ])

    const result = await listOrganizationKnowledge()

    expect(result.map((item) => item.functions)).toEqual([
      ['programacion'],
      ['produccion'],
      ['formacion'],
      [],
    ])
  })

  it('combina ambas poblaciones sin duplicar ninguna', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([SAMPLE_ORG])
    vi.mocked(listPublicOrganizationProfiles).mockResolvedValue([PERFIL_ORG])

    const result = await listOrganizationKnowledge()

    expect(result).toHaveLength(2)
    expect(result.map((item) => item.data.id)).toEqual(['org-1', 'p-1'])
  })

  it('conserva provenance de catalogo propio tambien para los perfiles', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([])
    vi.mocked(listPublicOrganizationProfiles).mockResolvedValue([PERFIL_ORG])

    const [item] = await listOrganizationKnowledge()

    expect(item.provenance.authority).toBe('CATALOGO_PROPIO')
    expect(item.provenance.sourceName).toBeNull()
    expect(item.provenance.sourceUrl).toBeNull()
    expect(item.provenance.validUntil).toBeNull()
  })

  it('transporta el criterio a ambas poblaciones', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([])
    vi.mocked(listPublicOrganizationProfiles).mockResolvedValue([])

    await listOrganizationKnowledge({ city: 'Madrid' }, 7)

    expect(listPublicOrganizations).toHaveBeenCalledWith({ city: 'Madrid' }, 7)
    expect(listPublicOrganizationProfiles).toHaveBeenCalledWith({ city: 'Madrid' }, 7)
  })
})
