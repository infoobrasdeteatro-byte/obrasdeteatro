import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { getPublishedWorkById, listPublishedWorks, listPublishedWorkAuthors } from '../works'
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
  min_age: 14,
  duration_minutes: 100,
  cast_size_max: 9,
  source_name: null,
  source_url: null,
}

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

describe('getPublishedWorkById', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('maps a found work row to the Work contract', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: SAMPLE_WORK_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getPublishedWorkById('work-1')

    expect(result).toEqual(SAMPLE_WORK)
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

  it('maps a list of work rows to the Work contract, sin criterio (comportamiento previo preservado)', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [SAMPLE_WORK_ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublishedWorks({}, 10)

    expect(result).toEqual([SAMPLE_WORK])
    expect(builder.limit).toHaveBeenCalledWith(10)
    expect(builder.ilike).not.toHaveBeenCalled()
  })

  it('returns an empty array on error', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublishedWorks()

    expect(result).toEqual([])
  })

  it('filtra por autor mediante coincidencia parcial (ilike)', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [SAMPLE_WORK_ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublishedWorks({ author: 'Lorca' })

    expect(builder.ilike).toHaveBeenCalledWith('author', '%Lorca%')
  })

  it('filtra por género en memoria, mediante coincidencia parcial insensible a mayúsculas (excepción documentada, microexpediente SCENAIA-002C Punto 2): nunca se traduce a ilike en Supabase', async () => {
    const rows = [SAMPLE_WORK_ROW, { ...SAMPLE_WORK_ROW, id: 'work-2', genre: 'Comedia de enredo' }]
    const { client, builder } = createFakeSupabaseClient({ data: rows, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublishedWorks({ genre: 'comedia' })

    expect(result).toEqual([{ ...SAMPLE_WORK, id: 'work-2', genre: 'Comedia de enredo' }])
    expect(builder.ilike).not.toHaveBeenCalledWith('genre', expect.anything())
  })

  it('el filtro de género en memoria ignora diacríticos, en ambos sentidos (razón de ser de la excepción)', async () => {
    const rows = [{ ...SAMPLE_WORK_ROW, id: 'work-3', genre: 'Teatro clásico' }]
    const { client } = createFakeSupabaseClient({ data: rows, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublishedWorks({ genre: 'clasico' })

    expect(result).toEqual([{ ...SAMPLE_WORK, id: 'work-3', genre: 'Teatro clásico' }])
  })

  it('al filtrar por género, trae un lote más amplio de candidatos antes de aplicar el límite real, para no truncar coincidencias válidas', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [SAMPLE_WORK_ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublishedWorks({ genre: 'drama' }, 5)

    expect(builder.limit).toHaveBeenCalledWith(200)
    expect(builder.limit).not.toHaveBeenCalledWith(5)
  })

  it('sin criterio de género, el límite real se aplica directamente en Supabase (comportamiento previo preservado)', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [SAMPLE_WORK_ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublishedWorks({ author: 'Lorca' }, 5)

    expect(builder.limit).toHaveBeenCalledWith(5)
  })

  it('combina varios criterios compatibles en la misma consulta: género en memoria, el resto en SQL', async () => {
    const rows = [SAMPLE_WORK_ROW, { ...SAMPLE_WORK_ROW, id: 'work-2', genre: 'Comedia de enredo' }]
    const { client, builder } = createFakeSupabaseClient({ data: rows, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublishedWorks({ genre: 'comedia', maxDurationMinutes: 60, maxCastSize: 4 })

    expect(result).toEqual([{ ...SAMPLE_WORK, id: 'work-2', genre: 'Comedia de enredo' }])
    expect(builder.ilike).not.toHaveBeenCalledWith('genre', expect.anything())
    expect(builder.lte).toHaveBeenCalledWith('duration_minutes', 60)
    expect(builder.lte).toHaveBeenCalledWith('cast_size_max', 4)
  })

  it('aplica los umbrales de edad, duración y año con el operador correcto', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublishedWorks({ maxAge: 8, minDurationMinutes: 90, yearFrom: 1950 })

    expect(builder.lte).toHaveBeenCalledWith('min_age', 8)
    expect(builder.gte).toHaveBeenCalledWith('duration_minutes', 90)
    expect(builder.gte).toHaveBeenCalledWith('year', 1950)
  })

  it('un criterio sin resultados reales degrada a lista vacía, nunca lanza ni inventa datos', async () => {
    const { client } = createFakeSupabaseClient({ data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublishedWorks({ genre: 'musical' })

    expect(result).toEqual([])
  })

  it('dos criterios distintos no comparten caché (claves distintas)', async () => {
    const { client } = createFakeSupabaseClient({ data: [SAMPLE_WORK_ROW], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listPublishedWorks({ genre: 'comedia' })
    await listPublishedWorks({ genre: 'musical' })

    expect(createClient).toHaveBeenCalledTimes(2)
  })
})

describe('listPublishedWorkAuthors', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('devuelve autores únicos, sin valores nulos', async () => {
    const rows = [{ author: 'Federico García Lorca' }, { author: 'Lope de Vega' }, { author: null }, { author: 'Lope de Vega' }]
    const { client } = createFakeSupabaseClient({ data: rows, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublishedWorkAuthors()

    expect(result).toEqual(['Federico García Lorca', 'Lope de Vega'])
  })

  it('devuelve una lista vacía ante error, nunca lanza', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPublishedWorkAuthors()

    expect(result).toEqual([])
  })
})
