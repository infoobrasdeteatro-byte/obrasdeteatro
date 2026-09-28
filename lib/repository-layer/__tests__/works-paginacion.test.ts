import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { listPublishedWorks } from '../works'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

/**
 * SCENAIA-004 §4.4 (Parte 2) y §7 condición 8: orden estable, desplazamiento
 * y recuento de listPublishedWorks, probados sobre un catálogo simulado de
 * varios cientos de obras -- no sobre las 11 actuales, que caben enteras en
 * una sola recuperación y no ejercitan la paginación.
 *
 * El emulador reproduce lo que hace PostgREST con la consulta: filtra, ordena
 * por las columnas pedidas, corta por rango o límite, cuenta si se pide
 * count=exact, y responde PGRST103 (416) cuando el desplazamiento supera el
 * total, que es su comportamiento real (comprobado contra producción).
 */

interface WorkRow {
  id: string
  title: string
  subtitle: string | null
  author: string | null
  genre: string | null
  synopsis: string | null
  language: string | null
  year: number | null
  slug: string | null
  min_age: number | null
  duration_minutes: number | null
  cast_size_max: number | null
  source_name: string | null
  source_url: string | null
  is_published: boolean
  deleted_at: string | null
}

const GENEROS = ['Comedia', 'Drama', 'Teatro clásico', 'Tragedia', 'Musical']
const AUTORES = ['Lope de Vega', 'Calderón de la Barca', 'Federico García Lorca', 'Tirso de Molina', 'Valle-Inclán']

/**
 * Catálogo determinista. Cada 7ª obra comparte título ("Obra repetida"), para
 * forzar empates que crucen fronteras de página; los ids se asignan en orden
 * inverso al de creación, para que desempatar por id no coincida por
 * casualidad con el orden de inserción. Cada 11ª obra está sin publicar y cada
 * 13ª borrada: no deben aparecer ni contar.
 */
function catalogo(n: number): WorkRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w-${String(n - i).padStart(4, '0')}`,
    title: i % 7 === 0 ? 'Obra repetida' : `Obra ${String((i * 37) % n).padStart(4, '0')}`,
    subtitle: null,
    author: AUTORES[i % AUTORES.length],
    genre: GENEROS[i % GENEROS.length],
    synopsis: null,
    language: 'es',
    year: 1600 + (i % 400),
    slug: `obra-${i}`,
    min_age: i % 18,
    duration_minutes: 60 + (i % 90),
    cast_size_max: 1 + (i % 20),
    source_name: null,
    source_url: null,
    is_published: i % 11 !== 5,
    deleted_at: i % 13 === 3 ? '2026-01-01T00:00:00Z' : null,
  }))
}

/** Orden de referencia, calculado aparte del código probado: título y, en empate, id. */
function ordenEstable(a: WorkRow, b: WorkRow): number {
  if (a.title !== b.title) return a.title < b.title ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function visibles(rows: WorkRow[]): WorkRow[] {
  return rows.filter((r) => r.is_published && r.deleted_at === null).sort(ordenEstable)
}

type Resultado = { data: WorkRow[] | null; error: { code?: string; message: string; details?: string } | null; count: number | null }

function emuladorPostgrest(rows: WorkRow[], opciones: { detallePgrst103?: string; errorForzado?: boolean } = {}) {
  const llamadas: string[] = []

  const from = vi.fn(() => {
    let filas = [...rows]
    let contar = false
    const orden: string[] = []

    const resolver = (desde: number, hasta: number): Promise<Resultado> => {
      if (opciones.errorForzado) return Promise.resolve({ data: null, error: { message: 'boom' }, count: null })
      const ordenadas = [...filas].sort((a, b) => {
        for (const col of orden) {
          const x = a[col as keyof WorkRow] as string
          const y = b[col as keyof WorkRow] as string
          if (x !== y) return x < y ? -1 : 1
        }
        return 0
      })
      const total = ordenadas.length
      if (contar && desde > total) {
        const details = opciones.detallePgrst103 ?? `An offset of ${desde} was requested, but there are only ${total} rows.`
        return Promise.resolve({ data: null, error: { code: 'PGRST103', message: 'Requested range not satisfiable', details }, count: null })
      }
      return Promise.resolve({ data: ordenadas.slice(desde, hasta + 1), error: null, count: contar ? total : null })
    }

    const b = {
      select: (_cols: string, opts?: { count?: string }) => { llamadas.push('select'); contar = opts?.count === 'exact'; return b },
      eq: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof WorkRow] === v); return b },
      is: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof WorkRow] === v); return b },
      ilike: (col: string, patron: string) => {
        const aguja = patron.replace(/%/g, '').toLowerCase()
        filas = filas.filter((r) => String(r[col as keyof WorkRow] ?? '').toLowerCase().includes(aguja))
        return b
      },
      gte: (col: string, v: number) => { filas = filas.filter((r) => (r[col as keyof WorkRow] as number) >= v); return b },
      lte: (col: string, v: number) => { filas = filas.filter((r) => (r[col as keyof WorkRow] as number) <= v); return b },
      order: (col: string) => { llamadas.push(`order:${col}`); orden.push(col); return b },
      range: (desde: number, hasta: number) => { llamadas.push(`range:${desde}-${hasta}`); return resolver(desde, hasta) },
      limit: (n: number) => { llamadas.push(`limit:${n}`); return resolver(0, n - 1) },
    }
    return b
  })

  return { client: { from }, llamadas }
}

function usar(emulador: ReturnType<typeof emuladorPostgrest>) {
  vi.mocked(createClient).mockResolvedValue(emulador.client as never)
  return emulador
}

const CATALOGO = catalogo(500)
const VISIBLES = visibles(CATALOGO)
const PAGINA = 20

describe('listPublishedWorks — página (orden estable, desplazamiento, recuento)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('el catálogo simulado es de varios cientos de obras visibles, con empates de título', () => {
    expect(VISIBLES.length).toBeGreaterThan(400)
    expect(VISIBLES.filter((w) => w.title === 'Obra repetida').length).toBeGreaterThan(PAGINA)
  })

  it('recorre el catálogo entero en páginas contiguas: sin solapes, sin huecos y en orden estable', async () => {
    usar(emuladorPostgrest(CATALOGO))
    const vistos: string[] = []

    for (let offset = 0; offset < VISIBLES.length; offset += PAGINA) {
      const pagina = await listPublishedWorks({}, PAGINA, { offset })
      expect(pagina.total).toBe(VISIBLES.length)
      expect(pagina.works.length).toBe(Math.min(PAGINA, VISIBLES.length - offset))
      vistos.push(...pagina.works.map((w) => w.id))
    }

    expect(new Set(vistos).size).toBe(vistos.length)
    expect(vistos).toEqual(VISIBLES.map((w) => w.id))
  })

  it('la misma página pedida dos veces devuelve exactamente las mismas obras, en el mismo orden', async () => {
    usar(emuladorPostgrest(CATALOGO))
    const primera = await listPublishedWorks({}, PAGINA, { offset: 40 })
    __resetCacheForTests()
    const segunda = await listPublishedWorks({}, PAGINA, { offset: 40 })

    expect(segunda.works.map((w) => w.id)).toEqual(primera.works.map((w) => w.id))
  })

  it('resuelve los empates de título por id, también cuando el empate cruza una frontera de página', async () => {
    usar(emuladorPostgrest(CATALOGO))
    const repetidas = VISIBLES.filter((w) => w.title === 'Obra repetida').map((w) => w.id)
    const inicio = VISIBLES.findIndex((w) => w.title === 'Obra repetida')
    const offset = inicio + 5 // la página empieza en mitad del bloque empatado

    const a = await listPublishedWorks({}, PAGINA, { offset })
    const b = await listPublishedWorks({}, PAGINA, { offset: offset + PAGINA })
    const idsEmpatados = [...a.works, ...b.works].filter((w) => w.title === 'Obra repetida').map((w) => w.id)

    expect(idsEmpatados).toEqual(repetidas.slice(5, 5 + idsEmpatados.length))
    expect(idsEmpatados).toEqual([...idsEmpatados].sort())
  })

  it('pide a la base el orden estable (título, luego id), el rango de la página y el recuento exacto', async () => {
    const { llamadas } = usar(emuladorPostgrest(CATALOGO))

    await listPublishedWorks({}, PAGINA, { offset: 60 })

    expect(llamadas).toEqual(['select', 'order:title', 'order:id', 'range:60-79'])
  })

  it('un desplazamiento igual al total devuelve una página vacía con el recuento correcto', async () => {
    usar(emuladorPostgrest(CATALOGO))

    const pagina = await listPublishedWorks({}, PAGINA, { offset: VISIBLES.length })

    expect(pagina).toEqual({ works: [], total: VISIBLES.length })
  })

  it('un desplazamiento más allá del final devuelve una página vacía y conserva el recuento (PGRST103)', async () => {
    usar(emuladorPostgrest(CATALOGO))

    const pagina = await listPublishedWorks({}, PAGINA, { offset: 5000 })

    expect(pagina).toEqual({ works: [], total: VISIBLES.length })
  })

  it('si PGRST103 no trae un detalle reconocible, el recuento queda como no determinado (null), nunca inventado', async () => {
    usar(emuladorPostgrest(CATALOGO, { detallePgrst103: 'formato desconocido' }))

    const pagina = await listPublishedWorks({}, PAGINA, { offset: 5000 })

    expect(pagina).toEqual({ works: [], total: null })
  })

  it('el recuento cuenta solo las obras publicadas, no borradas y que cumplen el criterio', async () => {
    usar(emuladorPostgrest(CATALOGO))
    const esperadas = VISIBLES.filter((w) => w.author!.toLowerCase().includes('lorca') && (w.duration_minutes ?? 0) <= 100)

    const pagina = await listPublishedWorks({ author: 'Lorca', maxDurationMinutes: 100 }, PAGINA, { offset: 0 })

    expect(esperadas.length).toBeGreaterThan(PAGINA)
    expect(pagina.total).toBe(esperadas.length)
    expect(pagina.works.map((w) => w.id)).toEqual(esperadas.slice(0, PAGINA).map((w) => w.id))
  })

  it('ante un error de la base devuelve página vacía y recuento no determinado, nunca lanza', async () => {
    usar(emuladorPostgrest(CATALOGO, { errorForzado: true }))

    const pagina = await listPublishedWorks({}, PAGINA, { offset: 0 })

    expect(pagina).toEqual({ works: [], total: null })
  })

  it('normaliza desplazamientos negativos o fraccionarios, y sin offset empieza por el principio', async () => {
    usar(emuladorPostgrest(CATALOGO))
    const primeros = VISIBLES.slice(0, PAGINA).map((w) => w.id)

    expect((await listPublishedWorks({}, PAGINA, {})).works.map((w) => w.id)).toEqual(primeros)
    expect((await listPublishedWorks({}, PAGINA, { offset: -3 })).works.map((w) => w.id)).toEqual(primeros)
    expect((await listPublishedWorks({}, PAGINA, { offset: 20.9 })).works.map((w) => w.id)).toEqual(VISIBLES.slice(20, 40).map((w) => w.id))
  })

  it('páginas distintas no comparten caché', async () => {
    usar(emuladorPostgrest(CATALOGO))

    const p1 = await listPublishedWorks({}, PAGINA, { offset: 0 })
    const p2 = await listPublishedWorks({}, PAGINA, { offset: PAGINA })

    expect(p1.works[0].id).not.toBe(p2.works[0].id)
    expect(createClient).toHaveBeenCalledTimes(2)
  })

  it('con género (excepción en memoria), pagina y cuenta sobre las coincidencias, en orden estable', async () => {
    const pequeño = catalogo(180) // dentro del margen de candidatos de la excepción de género
    const { llamadas } = usar(emuladorPostgrest(pequeño))
    const comedias = visibles(pequeño).filter((w) => w.genre === 'Comedia')

    const a = await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })
    const b = await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 10 })
    const fuera = await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 999 })

    expect(a.total).toBe(comedias.length)
    expect([...a.works, ...b.works].map((w) => w.id)).toEqual(comedias.slice(0, 20).map((w) => w.id))
    expect(fuera).toEqual({ works: [], total: comedias.length })
    expect(llamadas).toContain('limit:1000')
    expect(llamadas.some((l) => l.startsWith('range:'))).toBe(false)
  })
})

describe('listPublishedWorks — sin página, comportamiento previo intacto', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
  })

  it('sin tercer argumento devuelve un array, sin ordenar, sin rango, sin recuento y con el límite de 20', async () => {
    const { llamadas } = usar(emuladorPostgrest(CATALOGO))

    const resultado = await listPublishedWorks()

    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).toHaveLength(20)
    expect(llamadas).toEqual(['select', 'limit:20'])
  })

  it('devuelve las mismas obras y en el mismo orden que la base entrega sin ORDER BY (el de hoy)', async () => {
    usar(emuladorPostgrest(CATALOGO))
    const ordenDeLaBase = CATALOGO.filter((r) => r.is_published && r.deleted_at === null).slice(0, 10).map((r) => r.id)

    const resultado = await listPublishedWorks({}, 10)

    expect(resultado.map((w) => w.id)).toEqual(ordenDeLaBase)
  })

  it('una llamada sin página y otra con página no comparten caché', async () => {
    usar(emuladorPostgrest(CATALOGO))

    const sinPagina = await listPublishedWorks({}, PAGINA)
    const conPagina = await listPublishedWorks({}, PAGINA, { offset: 0 })

    expect(Array.isArray(sinPagina)).toBe(true)
    expect(conPagina).toHaveProperty('total', VISIBLES.length)
    expect(createClient).toHaveBeenCalledTimes(2)
  })
})
