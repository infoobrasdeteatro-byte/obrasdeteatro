import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { listPublishedWorks } from '../works'
import type { PublishedWorksPage, PublishedWorksPageOptions } from '@/lib/repository-layer'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

/**
 * SCENAIA-004A §4.1 y §7 condición 3: página con filtro por género sobre
 * catálogos simulados de más de 200 obras del mismo género. El emulador
 * reproduce lo que hace PostgREST con la consulta (filtra, ordena por las
 * columnas pedidas y corta por límite o rango); el género se filtra después
 * en memoria, como en producción.
 */

interface WorkRow {
  id: string
  title: string
  subtitle: null
  author: string
  genre: string | null
  synopsis: null
  language: string
  year: number
  slug: string
  min_age: number
  duration_minutes: number
  cast_size_max: number
  source_name: null
  source_url: null
  is_published: boolean
  deleted_at: string | null
}

function obra(i: number, genre: string | null, extra: Partial<WorkRow> = {}): WorkRow {
  return {
    id: `w-${String(i).padStart(5, '0')}`,
    // Títulos con empates y sin relación con el orden de creación
    title: i % 9 === 0 ? 'Título repetido' : `Obra ${String((i * 7919) % 100000).padStart(5, '0')}`,
    subtitle: null,
    author: 'Autor',
    genre,
    synopsis: null,
    language: 'es',
    year: 1600,
    slug: `obra-${i}`,
    min_age: 0,
    duration_minutes: 90,
    cast_size_max: 5,
    source_name: null,
    source_url: null,
    is_published: true,
    deleted_at: null,
    ...extra,
  }
}

function ordenEstable(a: WorkRow, b: WorkRow): number {
  if (a.title !== b.title) return a.title < b.title ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function emuladorPostgrest(rows: WorkRow[]) {
  const llamadas: string[] = []

  const from = vi.fn(() => {
    let filas = [...rows]
    const orden: string[] = []
    const cortar = (desde: number, hasta: number) => {
      const ordenadas = orden.length === 0 ? filas : [...filas].sort((a, b) => {
        for (const col of orden) {
          const x = a[col as keyof WorkRow] as string
          const y = b[col as keyof WorkRow] as string
          if (x !== y) return x < y ? -1 : 1
        }
        return 0
      })
      return Promise.resolve({ data: ordenadas.slice(desde, hasta + 1), error: null, count: null })
    }
    const b = {
      select: () => { llamadas.push('select'); return b },
      eq: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof WorkRow] === v); return b },
      is: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof WorkRow] === v); return b },
      ilike: () => b,
      gte: () => b,
      lte: () => b,
      order: (col: string) => { llamadas.push(`order:${col}`); orden.push(col); return b },
      range: (desde: number, hasta: number) => { llamadas.push(`range:${desde}-${hasta}`); return cortar(desde, hasta) },
      limit: (n: number) => { llamadas.push(`limit:${n}`); return cortar(0, n - 1) },
    }
    return b
  })

  return { client: { from }, llamadas }
}

function usar(rows: WorkRow[]) {
  const emulador = emuladorPostgrest(rows)
  vi.mocked(createClient).mockResolvedValue(emulador.client as never)
  return emulador
}

/** Recorre todas las páginas y devuelve los ids vistos y los totales de cada página. */
async function recorrer(genre: string, pagina: number, hasta: number) {
  const ids: string[] = []
  const totales: (number | null)[] = []
  for (let offset = 0; offset < hasta; offset += pagina) {
    const p: PublishedWorksPage = await listPublishedWorks({ genre }, pagina, { offset })
    ids.push(...p.works.map((w) => w.id))
    totales.push(p.total)
  }
  return { ids, totales }
}

describe('listPublishedWorks — página con género (SCENAIA-004A §4.1)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('con más de 200 obras del mismo género, el recuento es exacto y el recorrido completo, sin solapes ni huecos', async () => {
    // 700 obras: 450 comedias (más de 200) intercaladas con otros géneros,
    // más obras sin publicar y borradas que no deben contar.
    const catalogo = Array.from({ length: 700 }, (_, i) => obra(i, i % 14 < 9 ? 'Comedia de enredo' : 'Drama de honor'))
    catalogo.push(obra(900, 'Comedia', { is_published: false }), obra(901, 'Comedia', { deleted_at: '2026-01-01T00:00:00Z' }))
    const comedias = catalogo.filter((r) => r.is_published && r.deleted_at === null && r.genre === 'Comedia de enredo').sort(ordenEstable)
    expect(comedias.length).toBeGreaterThan(200)
    const { llamadas } = usar(catalogo)

    const { ids, totales } = await recorrer('comedia', 20, comedias.length + 20)

    expect(totales.every((t) => t === comedias.length)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(comedias.map((r) => r.id))
    expect(llamadas).toContain('limit:1000')
  })

  it('al alcanzar el máximo de candidatos (1.000), el recuento es null, nunca un número inventado', async () => {
    const catalogo = Array.from({ length: 1500 }, (_, i) => obra(i, i % 2 === 0 ? 'Comedia' : 'Drama'))
    usar(catalogo)

    const p = await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })

    expect(p.total).toBeNull()
  })

  it('aunque el recuento sea null, las obras de la página se devuelven en orden estable, sobre los candidatos evaluados', async () => {
    const catalogo = Array.from({ length: 1500 }, (_, i) => obra(i, i % 2 === 0 ? 'Comedia' : 'Drama'))
    usar(catalogo)
    const candidatos = catalogo.filter((r) => r.is_published && r.deleted_at === null).sort(ordenEstable).slice(0, 1000)
    const esperadas = candidatos.filter((r) => r.genre === 'Comedia')

    const a = await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })
    const b = await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 10 })

    expect([...a.works, ...b.works].map((w) => w.id)).toEqual(esperadas.slice(0, 20).map((r) => r.id))
    expect(a.works.length).toBe(10)
  })

  it('justo en el umbral: 999 candidatos dan recuento exacto; 1.000 candidatos, null', async () => {
    usar(Array.from({ length: 999 }, (_, i) => obra(i, 'Comedia')))
    expect((await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })).total).toBe(999)

    __resetCacheForTests()
    usar(Array.from({ length: 1000 }, (_, i) => obra(i, 'Comedia')))
    expect((await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })).total).toBeNull()
  })

  it('los tres términos del intérprete encuentran sus obras aunque la base guarde acentos y mayúsculas', async () => {
    const generos: Record<string, string | null> = {
      'w-comedia-1': 'Comedia',
      'w-comedia-2': 'COMEDIA DE ENREDO',
      'w-comedia-3': 'Tragicomedia',
      'w-musical-1': 'Musical',
      'w-musical-2': 'Comedia musical',
      'w-clasico-1': 'Teatro clásico',
      'w-clasico-2': 'TEATRO CLÁSICO DEL SIGLO DE ORO',
      'w-clasico-3': 'Clásico',
      'w-otro-1': 'Drama de honor',
      'w-otro-2': 'Música y danza',
      'w-otro-3': null,
    }
    const catalogo = Object.entries(generos).map(([id, genre], i) => obra(i, genre, { id, title: `Obra ${id}` }))
    // Esperados escritos a mano, no calculados con matchesGenre: la regla es "contiene", sin acentos ni mayúsculas.
    const esperados: Record<string, string[]> = {
      comedia: ['w-comedia-1', 'w-comedia-2', 'w-comedia-3', 'w-musical-2'],
      musical: ['w-musical-1', 'w-musical-2'],
      clasico: ['w-clasico-1', 'w-clasico-2', 'w-clasico-3'],
    }

    for (const [termino, ids] of Object.entries(esperados)) {
      __resetCacheForTests()
      usar(catalogo)
      const p = await listPublishedWorks({ genre: termino }, 50, { offset: 0 })
      expect(p.works.map((w) => w.id).sort()).toEqual([...ids].sort())
      expect(p.total).toBe(ids.length)
    }
  })

  it('la llamada sin página con género no cambia: 200 candidatos, sin ordenar y un array', async () => {
    const { llamadas } = usar(Array.from({ length: 300 }, (_, i) => obra(i, 'Comedia')))

    const resultado = await listPublishedWorks({ genre: 'comedia' }, 20)

    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).toHaveLength(20)
    expect(llamadas).toEqual(['select', 'limit:200'])
  })

  it('los tipos de página se importan desde la vía pública de Repository Layer (§4.2)', async () => {
    usar([obra(1, 'Comedia')])
    const opciones: PublishedWorksPageOptions = { offset: 0 }

    const p: PublishedWorksPage = await listPublishedWorks({ genre: 'comedia' }, 10, opciones)

    expect(p).toEqual({ works: [expect.objectContaining({ id: 'w-00001' })], total: 1 })
  })
})
