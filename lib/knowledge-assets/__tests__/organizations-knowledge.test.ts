import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPublicOrganizationById, listPublicOrganizations } from '@/lib/repository-layer'
import { getOrganizationKnowledge, listOrganizationKnowledge } from '../organizations-knowledge'

vi.mock('@/lib/repository-layer', () => ({
  getPublicOrganizationById: vi.fn(),
  listPublicOrganizations: vi.fn(),
}))

const SAMPLE_ORG = {
  id: 'org-1',
  name: 'Teatro Real',
  type: 'teatro',
  countryCode: 'ES',
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

    expect(result).toEqual({ domain: 'Organizaciones', data: SAMPLE_ORG })
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
  })

  it('tags every organization in the list with the Organizaciones domain', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([SAMPLE_ORG])

    const result = await listOrganizationKnowledge(5)

    expect(result).toEqual([{ domain: 'Organizaciones', data: SAMPLE_ORG }])
    expect(listPublicOrganizations).toHaveBeenCalledWith(5)
  })

  it('returns an empty array when there is nothing to list', async () => {
    vi.mocked(listPublicOrganizations).mockResolvedValue([])

    const result = await listOrganizationKnowledge()

    expect(result).toEqual([])
  })
})
