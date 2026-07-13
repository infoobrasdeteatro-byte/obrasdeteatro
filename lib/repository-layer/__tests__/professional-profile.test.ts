import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { getProfessionalProfilePublic } from '../professional-profile'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const SAMPLE_ROW = {
  nombre: 'Ana',
  apellidos: 'García',
  nombre_artistico: 'Ana G.',
  slug: 'ana-garcia',
  bio: 'Actriz',
  avatar_url: 'https://example.com/a.png',
  cover_url: null,
  perfil_publico: true,
  verificado: false,
  website_url: null,
}

describe('getProfessionalProfilePublic', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('maps a found profile row to the ProfessionalProfilePublic contract', async () => {
    const { client } = createFakeSupabaseClient({ data: SAMPLE_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getProfessionalProfilePublic('user-1')

    expect(result).toEqual({
      firstName: 'Ana',
      lastName: 'García',
      artisticName: 'Ana G.',
      slug: 'ana-garcia',
      bio: 'Actriz',
      avatarUrl: 'https://example.com/a.png',
      coverUrl: null,
      isPublic: true,
      isVerified: false,
      websiteUrl: null,
    })
    expect(client.from).toHaveBeenCalledWith('profiles')
    expect(Object.keys(result!).sort()).toEqual(
      ['artisticName', 'avatarUrl', 'bio', 'coverUrl', 'firstName', 'isPublic', 'isVerified', 'lastName', 'slug', 'websiteUrl'].sort()
    )
  })

  it('maps a profile row with no optional data filled in ("perfil sin datos")', async () => {
    const { client } = createFakeSupabaseClient({
      data: {
        nombre: 'Juan',
        apellidos: null,
        nombre_artistico: null,
        slug: null,
        bio: null,
        avatar_url: null,
        cover_url: null,
        perfil_publico: false,
        verificado: false,
        website_url: null,
      },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getProfessionalProfilePublic('user-empty')

    expect(result).toEqual({
      firstName: 'Juan',
      lastName: null,
      artisticName: null,
      slug: null,
      bio: null,
      avatarUrl: null,
      coverUrl: null,
      isPublic: false,
      isVerified: false,
      websiteUrl: null,
    })
  })

  it('never selects or exposes Subscription-domain data (is_premium) while Incidencia A remains open', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: SAMPLE_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getProfessionalProfilePublic('user-1')

    const selectedColumns = builder.select.mock.calls[0][0] as string
    expect(selectedColumns).not.toMatch(/is_premium/)
    expect(result).not.toHaveProperty('isPremium')
  })

  it('returns null when the row is not found', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'not found' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getProfessionalProfilePublic('missing-user')

    expect(result).toBeNull()
  })
})
