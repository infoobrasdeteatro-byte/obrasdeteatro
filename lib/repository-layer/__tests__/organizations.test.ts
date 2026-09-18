import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { getPublicOrganizationById, listPublicOrganizations } from '../organizations'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const SAMPLE_ORG_ROW = {
  id: 'org-1',
  name: 'Teatro Real',
  type: 'teatro',
  country_code: 'ES',
  website: 'https://teatro-real.example.com',
  slug: 'teatro-real',
}

describe('getPublicOrganizationById', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('maps a found organization row to the Organization contract', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: SAMPLE_ORG_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getPublicOrganizationById('org-1')

    expect(result).toEqual({
      id: 'org-1',
      name: 'Teatro Real',
      type: 'teatro',
      countryCode: 'ES',
      website: 'https://teatro-real.example.com',
      slug: 'teatro-real',
    })
    expect(client.from).toHaveBeenCalledWith('institutions')
    expect(builder.eq).toHaveBeenCalledWith('is_public', true)
    expect(builder.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('returns null when the organization is not found or not public', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'not found' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getPublicOrganizationById('missing-org')

    expect(result).toBeNull()
  })

  it('en una segunda llamada con el mismo id, no vuelve a invocar a Supabase (caché activa)', async () => {
    const { client } = createFakeSupabaseClient({ data: SAMPLE_ORG_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const first = await getPublicOrganizationById('org-1')
    const second = await getPublicOrganizationById('org-1')

    expect(first).toEqual(second)
    expect(createClient).toHaveBeenCalledTimes(1)
  })
})

describe('listPublicOrganizations', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('maps a list of organization rows to the Organization contract', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [SAMPLE_ORG_ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublicOrganizations({}, 5)

    expect(result).toEqual([
      {
        id: 'org-1',
        name: 'Teatro Real',
        type: 'teatro',
        countryCode: 'ES',
        website: 'https://teatro-real.example.com',
        slug: 'teatro-real',
      },
    ])
    expect(builder.limit).toHaveBeenCalledWith(5)
  })

  it('returns an empty array on error', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublicOrganizations()

    expect(result).toEqual([])
  })
})
