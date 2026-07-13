import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { getIdentity } from '../identity'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('getIdentity', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('maps a found profile row to the Identity contract', async () => {
    const { client, builder } = createFakeSupabaseClient({
      data: { id: 'user-1', tipo_perfil: 'actor', idioma: 'es', pais: 'ES' },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getIdentity('user-1')

    expect(result).toEqual({
      userId: 'user-1',
      profileType: 'actor',
      language: 'es',
      country: 'ES',
      timezone: null,
    })
    expect(client.from).toHaveBeenCalledWith('profiles')
    expect(builder.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(Object.keys(result!).sort()).toEqual(['country', 'language', 'profileType', 'timezone', 'userId'].sort())
  })

  it('returns null when the row is not found', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'not found' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getIdentity('missing-user')

    expect(result).toBeNull()
  })

  it('reports timezone as unavailable, never inferred (no source column exists yet)', async () => {
    const { client } = createFakeSupabaseClient({
      data: { id: 'user-2', tipo_perfil: 'director', idioma: 'en', pais: null },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getIdentity('user-2')

    expect(result?.timezone).toBeNull()
    expect(result?.country).toBeNull()
  })
})
