import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPublishedWorkById, listPublishedWorks } from '@/lib/repository-layer'
import { getWorkKnowledge, listWorkKnowledge } from '../works-knowledge'

vi.mock('@/lib/repository-layer', () => ({
  getPublishedWorkById: vi.fn(),
  listPublishedWorks: vi.fn(),
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
  castSizeMax: 9,
}

describe('getWorkKnowledge', () => {
  beforeEach(() => {
    vi.mocked(getPublishedWorkById).mockReset()
  })

  it('tags a found work with the Obras domain', async () => {
    vi.mocked(getPublishedWorkById).mockResolvedValue(SAMPLE_WORK)

    const result = await getWorkKnowledge('work-1')

    expect(result).toEqual({ domain: 'Obras', data: SAMPLE_WORK })
    expect(getPublishedWorkById).toHaveBeenCalledWith('work-1')
  })

  it('returns null when Repository Layer finds no work', async () => {
    vi.mocked(getPublishedWorkById).mockResolvedValue(null)

    const result = await getWorkKnowledge('missing-work')

    expect(result).toBeNull()
  })
})

describe('listWorkKnowledge', () => {
  beforeEach(() => {
    vi.mocked(listPublishedWorks).mockReset()
  })

  it('tags every work in the list with the Obras domain', async () => {
    vi.mocked(listPublishedWorks).mockResolvedValue([SAMPLE_WORK])

    const result = await listWorkKnowledge({}, 10)

    expect(result).toEqual([{ domain: 'Obras', data: SAMPLE_WORK }])
    expect(listPublishedWorks).toHaveBeenCalledWith({}, 10)
  })

  it('traslada el criterio ya resuelto a Repository Layer sin interpretarlo (SCENAIA-002C)', async () => {
    vi.mocked(listPublishedWorks).mockResolvedValue([SAMPLE_WORK])

    await listWorkKnowledge({ author: 'Lorca' }, 5)

    expect(listPublishedWorks).toHaveBeenCalledWith({ author: 'Lorca' }, 5)
  })

  it('returns an empty array when there is nothing to list', async () => {
    vi.mocked(listPublishedWorks).mockResolvedValue([])

    const result = await listWorkKnowledge()

    expect(result).toEqual([])
  })
})
