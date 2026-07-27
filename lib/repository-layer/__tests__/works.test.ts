import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { getPublishedWorkById, listPublishedWorks } from '../works'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const SAMPLE_WORK_ROW = {
  id: 'work-1',
  title: 'La Casa de Bernarda Alba',
  subtitle: null,
  author: 'Federico García Lorca',
  genre: 'Drama',
  synopsis: 'Una familia bajo el luto.',
  language: 'es',
  year: 1936,
  slug: 'la-casa-de-bernarda-alba',
}

describe('getPublishedWorkById', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('maps a found work row to the Work contract', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: SAMPLE_WORK_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getPublishedWorkById('work-1')

    expect(result).toEqual({
      id: 'work-1',
      title: 'La Casa de Bernarda Alba',
      subtitle: null,
      author: 'Federico García Lorca',
      genre: 'Drama',
      synopsis: 'Una familia bajo el luto.',
      language: 'es',
      year: 1936,
      slug: 'la-casa-de-bernarda-alba',
    })
    expect(client.from).toHaveBeenCalledWith('works')
    expect(builder.eq).toHaveBeenCalledWith('is_published', true)
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('returns null when the work is not found or not published', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'not found' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getPublishedWorkById('missing-work')

    expect(result).toBeNull()
  })

  it('en una segunda llamada con el mismo id, no vuelve a invocar a Supabase (caché activa)', async () => {
    const { client } = createFakeSupabaseClient({ data: SAMPLE_WORK_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const first = await getPublishedWorkById('work-1')
    const second = await getPublishedWorkById('work-1')

    expect(first).toEqual(second)
    expect(createClient).toHaveBeenCalledTimes(1)
  })
})

describe('listPublishedWorks', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('maps a list of work rows to the Work contract', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [SAMPLE_WORK_ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublishedWorks(10)

    expect(result).toEqual([
      {
        id: 'work-1',
        title: 'La Casa de Bernarda Alba',
        subtitle: null,
        author: 'Federico García Lorca',
        genre: 'Drama',
        synopsis: 'Una familia bajo el luto.',
        language: 'es',
        year: 1936,
        slug: 'la-casa-de-bernarda-alba',
      },
    ])
    expect(builder.limit).toHaveBeenCalledWith(10)
  })

  it('returns an empty array on error', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublishedWorks()

    expect(result).toEqual([])
  })
})
