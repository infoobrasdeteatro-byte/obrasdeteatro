import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { normalizeRequest } from '@/lib/request-interpreter'
import { buildKnowledgeContext } from '../knowledge-context-builder'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

/**
 * SCENAIA-004B §4.4 y §7 condición 2 (PR 1): la página y su recuento
 * atraviesan Scenaia Knowledge Model, Knowledge Assets y Repository Layer
 * REALES. Solo se simula la base de datos, con un emulador que reproduce lo
 * que hace PostgREST con la consulta: filtra, ordena por las columnas
 * pedidas, corta por rango o límite, cuenta si se pide count=exact y
 * responde PGRST103 cuando el desplazamiento supera el total.
 *
 * Catálogos de varios cientos y de varios miles de obras: el de 11 obras
 * cabe entero en una página y no ejercita nada de la paginación.
 */

interface WorkRow {
  id: string
  title: string
  subtitle: null
  author: string
  genre: string
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

/** Catálogo determinista, con títulos empatados, obras sin publicar y obras borradas. */
function catalogo(n: number, genero: (i: number) => string = (i) => (i % 3 === 0 ? 'Comedia' : 'Drama')): WorkRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w-${String(n - i).padStart(6, '0')}`,
    title: i % 7 === 0 ? 'Título repetido' : `Obra ${String((i * 7919) % 1_000_003).padStart(7, '0')}`,
    subtitle: null,
    author: 'Autora de prueba',
    genre: genero(i),
    synopsis: null,
    language: 'es',
    year: 1600 + (i % 400),
    slug: `obra-${i}`,
    min_age: 0,
    duration_minutes: 90,
    cast_size_max: 5,
    source_name: null,
    source_url: null,
    is_published: i % 11 !== 5,
    deleted_at: i % 13 === 3 ? '2026-01-01T00:00:00Z' : null,
  }))
}

function visiblesEnOrden(rows: WorkRow[]): WorkRow[] {
  return rows
    .filter((r) => r.is_published && r.deleted_at === null)
    .sort((a, b) => (a.title !== b.title ? (a.title < b.title ? -1 : 1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

type Respuesta = { data: unknown[] | null; error: { code?: string; message: string; details?: string } | null; count: number | null }

/** Emulador de PostgREST. Registra, por consulta, las operaciones pedidas. */
function emulador(rows: WorkRow[]) {
  const consultas: string[][] = []

  const from = vi.fn(() => {
    let filas = [...rows]
    let contar = false
    let columnas = ''
    const orden: string[] = []
    const registro: string[] = []
    consultas.push(registro)

    const resolver = (desde: number, hasta: number): Promise<Respuesta> => {
      const ordenadas = orden.length === 0 ? filas : [...filas].sort((a, b) => {
        for (const col of orden) {
          const x = a[col as keyof WorkRow] as string
          const y = b[col as keyof WorkRow] as string
          if (x !== y) return x < y ? -1 : 1
        }
        return 0
      })
      const total = ordenadas.length
      if (contar && desde > total) {
        return Promise.resolve({
          data: null,
          error: { code: 'PGRST103', message: 'Requested range not satisfiable', details: `An offset of ${desde} was requested, but there are only ${total} rows.` },
          count: null,
        })
      }
      const cortadas = ordenadas.slice(desde, hasta + 1)
      const data = columnas === 'author' ? cortadas.map((r) => ({ author: r.author })) : cortadas
      return Promise.resolve({ data, error: null, count: contar ? total : null })
    }

    const b = {
      select: (cols: string, opts?: { count?: string }) => {
        columnas = cols
        contar = opts?.count === 'exact'
        registro.push(contar ? 'select:count' : `select:${cols === 'author' ? 'author' : 'obras'}`)
        return b
      },
      eq: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof WorkRow] === v); return b },
      is: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof WorkRow] === v); return b },
      neq: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof WorkRow] !== v); return b },
      in: (col: string, vs: readonly unknown[]) => { filas = filas.filter((r) => vs.includes(r[col as keyof WorkRow])); return b },
      ilike: (col: string, patron: string) => {
        const aguja = patron.replace(/%/g, '').toLowerCase()
        filas = filas.filter((r) => String(r[col as keyof WorkRow] ?? '').toLowerCase().includes(aguja))
        return b
      },
      gte: (col: string, v: number) => { filas = filas.filter((r) => (r[col as keyof WorkRow] as number) >= v); return b },
      lte: (col: string, v: number) => { filas = filas.filter((r) => (r[col as keyof WorkRow] as number) <= v); return b },
      order: (col: string) => { registro.push(`order:${col}`); orden.push(col); return b },
      range: (desde: number, hasta: number) => { registro.push(`range:${desde}-${hasta}`); return resolver(desde, hasta) },
      limit: (n: number) => { registro.push(`limit:${n}`); return resolver(0, n - 1) },
    }
    return b
  })

  vi.mocked(createClient).mockResolvedValue({ from } as never)
  /** Consultas del listado de obras (se excluye la lista de autores conocidos). */
  return { consultasDeObras: () => consultas.filter((c) => c[0] !== 'select:author') }
}

const PAGINA = 10
const LISTADO = normalizeRequest('dame la lista de obras', 'turn-1')
const LISTADO_CON_GENERO = normalizeRequest('dame la lista de obras de comedia', 'turn-2')

/** Recorre todas las páginas del listado a través de SKM y devuelve lo visto. */
async function recorrer(peticion: typeof LISTADO, hasta: number) {
  const ids: string[] = []
  const paginas: { offset: number; returned: number; total: number | null }[] = []
  for (let offset = 0; offset < hasta; offset += PAGINA) {
    const contexto = await buildKnowledgeContext(peticion, {}, { offset, pageSize: PAGINA })
    ids.push(...contexto.knowledgeEntities.map((e) => (e.data as { id: string }).id))
    paginas.push({ offset, returned: contexto.worksPage!.returned, total: contexto.worksPage!.total })
  }
  return { ids, paginas }
}

beforeEach(() => {
  vi.mocked(createClient).mockReset()
  __resetCacheForTests()
})

describe('transporte de la página del listado puro (SCENAIA-004B, PR 1)', () => {
  it('las peticiones de prueba son listado puro de Obras según el intérprete real', () => {
    expect(LISTADO.requestsPlainListing).toBe(true)
    expect(LISTADO.requestedKnowledgeDomains).toEqual(['Obras'])
    expect(LISTADO_CON_GENERO.requestsPlainListing).toBe(true)
    expect(LISTADO_CON_GENERO.requestedKnowledgeDomains).toEqual(['Obras'])
  })

  it.each([
    ['varios cientos', 503],
    ['varios miles', 5000],
  ])('catálogo de %s de obras: páginas de 10 sin solapes ni huecos, recuento correcto y última página parcial', async (_escala, n) => {
    const rows = catalogo(n)
    const visibles = visiblesEnOrden(rows)
    emulador(rows)
    expect(visibles.length % PAGINA).not.toBe(0) // para que la última página sea parcial

    const { ids, paginas } = await recorrer(LISTADO, visibles.length)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(visibles.map((r) => r.id))
    expect(paginas.every((p) => p.total === visibles.length)).toBe(true)
    expect(paginas.slice(0, -1).every((p) => p.returned === PAGINA)).toBe(true)
    expect(paginas[paginas.length - 1].returned).toBe(visibles.length % PAGINA)
  })

  it.each([
    ['varios cientos', 503],
    ['varios miles', 5000],
  ])('catálogo de %s: un desplazamiento igual al total devuelve una página vacía con el recuento', async (_escala, n) => {
    const rows = catalogo(n)
    const total = visiblesEnOrden(rows).length
    emulador(rows)

    const contexto = await buildKnowledgeContext(LISTADO, {}, { offset: total, pageSize: PAGINA })

    expect(contexto.knowledgeEntities).toEqual([])
    expect(contexto.worksPage).toEqual({ offset: total, pageSize: PAGINA, returned: 0, total })
  })

  it('la página pide a la base orden estable, rango y recuento, con el tamaño recibido como dato', async () => {
    const { consultasDeObras } = emulador(catalogo(500))

    await buildKnowledgeContext(LISTADO, {}, { offset: 30, pageSize: PAGINA })

    expect(consultasDeObras()).toEqual([['select:count', 'order:title', 'order:id', 'range:30-39']])
  })

  it('con género y más de 1.000 candidatos, el recuento null llega intacto hasta el KnowledgeContext', async () => {
    emulador(catalogo(1500, () => 'Comedia de enredo'))

    const contexto = await buildKnowledgeContext(LISTADO_CON_GENERO, {}, { offset: 0, pageSize: PAGINA })

    expect(contexto.worksPage).toEqual({ offset: 0, pageSize: PAGINA, returned: PAGINA, total: null })
    expect(contexto.knowledgeEntities).toHaveLength(PAGINA)
  })

  it('con género y menos de 1.000 candidatos, el recuento es exacto', async () => {
    const rows = catalogo(600)
    const comedias = visiblesEnOrden(rows).filter((r) => r.genre === 'Comedia')
    emulador(rows)

    const contexto = await buildKnowledgeContext(LISTADO_CON_GENERO, {}, { offset: 0, pageSize: PAGINA })

    expect(contexto.worksPage?.total).toBe(comedias.length)
    expect(contexto.knowledgeEntities.map((e) => (e.data as { id: string }).id)).toEqual(comedias.slice(0, PAGINA).map((r) => r.id))
  })

  it('sin página (interruptor apagado o no es listado puro): worksPage es null y la consulta es la de siempre', async () => {
    const { consultasDeObras } = emulador(catalogo(500))

    const contexto = await buildKnowledgeContext(LISTADO, {})

    expect(contexto.worksPage).toBeNull()
    expect(contexto.knowledgeEntities).toHaveLength(20)
    expect(consultasDeObras()).toEqual([['select:obras', 'limit:20']])
  })

  it('una página pedida para un dominio que no es Obras no se aplica: worksPage es null', async () => {
    emulador(catalogo(50))
    const personas = { ...LISTADO, requestedKnowledgeDomains: ['Personas'] } as typeof LISTADO

    const contexto = await buildKnowledgeContext(personas, {}, { offset: 0, pageSize: PAGINA })

    expect(contexto.worksPage).toBeNull()
  })
})
