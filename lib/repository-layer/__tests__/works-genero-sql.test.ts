import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { listPublishedWorks } from '../works'
import type { PublishedWorksPage } from '@/lib/repository-layer'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

/**
 * SCENAIA-006 §4.4 y §7 condición 2: filtro de género por SQL en el modo
 * página de listPublishedWorks, detrás de SCENAIA_GENERO_SQL_ENABLED.
 *
 * El emulador reproduce lo que hace la base con la consulta: calcula
 * genre_normalizado como la columna generada real (lower(unaccent(genre)),
 * con las ligaduras que descompone unaccent), aplica ILIKE con la semántica
 * de LIKE de PostgreSQL (% cualquier cadena, _ un carácter, \ escapa),
 * ordena por las columnas pedidas, corta por rango y cuenta si se pide
 * count=exact. Deliberadamente NO reutiliza el código probado.
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

type Fila = WorkRow & { genre_normalizado: string }

const LIGADURAS: Record<string, string> = { œ: 'oe', Œ: 'OE', æ: 'ae', Æ: 'AE', ß: 'ss' }

/** Emulación de lower(extensions.unaccent(coalesce(genre, ''))). */
function columnaGenerada(genre: string | null): string {
  const sinLigaduras = (genre ?? '').replace(/[œŒæÆß]/g, (c) => LIGADURAS[c])
  return sinLigaduras.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** ILIKE de PostgreSQL: % cualquier cadena, _ un carácter, \ hace literal el siguiente. */
function ilike(valor: string, patron: string): boolean {
  let re = ''
  for (let i = 0; i < patron.length; i++) {
    const c = patron[i]
    if (c === '\\') {
      i++
      re += (patron[i] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (c === '%') re += '.*'
    else if (c === '_') re += '.'
    else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`, 'is').test(valor)
}

/** Referencia de matchesGenre (lib/repository-layer/works.ts), copiada literal para comparar. */
function matchesGenreReferencia(rowGenre: string | null, criteriaGenre: string): boolean {
  if (rowGenre === null) return false
  const strip = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  return strip(rowGenre.toLowerCase()).includes(strip(criteriaGenre.toLowerCase()))
}

function obra(i: number, genre: string | null, extra: Partial<WorkRow> = {}): WorkRow {
  return {
    id: `w-${String(i).padStart(5, '0')}`,
    // Títulos con empates y sin relación con el orden de creación ni con el género
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

type Resultado = { data: WorkRow[] | null; error: { code?: string; message: string; details?: string } | null; count: number | null }

function emuladorPostgrest(rows: WorkRow[], opciones: { errorForzado?: boolean } = {}) {
  const llamadas: string[] = []
  const tabla: Fila[] = rows.map((r) => ({ ...r, genre_normalizado: columnaGenerada(r.genre) }))

  const from = vi.fn(() => {
    let filas = [...tabla]
    let contar = false
    const orden: string[] = []

    const resolver = (desde: number, hasta: number): Promise<Resultado> => {
      if (opciones.errorForzado) return Promise.resolve({ data: null, error: { message: 'boom' }, count: null })
      const ordenadas = orden.length === 0 ? filas : [...filas].sort((a, b) => {
        for (const col of orden) {
          const x = a[col as keyof Fila] as string
          const y = b[col as keyof Fila] as string
          if (x !== y) return x < y ? -1 : 1
        }
        return 0
      })
      const total = ordenadas.length
      if (contar && desde > total) {
        const details = `An offset of ${desde} was requested, but there are only ${total} rows.`
        return Promise.resolve({ data: null, error: { code: 'PGRST103', message: 'Requested range not satisfiable', details }, count: null })
      }
      // La API nunca devuelve la columna generada: no está en WORK_COLUMNS.
      const data = ordenadas.slice(desde, hasta + 1).map((fila) => {
        const r: Partial<Fila> = { ...fila }
        delete r.genre_normalizado
        return r as WorkRow
      })
      return Promise.resolve({ data, error: null, count: contar ? total : null })
    }

    const b = {
      select: (cols: string, opts?: { count?: string }) => {
        llamadas.push(opts?.count === 'exact' ? 'select:count' : 'select')
        if (cols.includes('genre_normalizado')) llamadas.push('select:expone-genre_normalizado')
        contar = opts?.count === 'exact'
        return b
      },
      eq: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof Fila] === v); return b },
      is: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof Fila] === v); return b },
      ilike: (col: string, patron: string) => {
        llamadas.push(`ilike:${col}:${patron}`)
        filas = filas.filter((r) => ilike(String(r[col as keyof Fila] ?? ''), patron))
        return b
      },
      gte: (col: string, v: number) => { filas = filas.filter((r) => (r[col as keyof Fila] as number) >= v); return b },
      lte: (col: string, v: number) => { filas = filas.filter((r) => (r[col as keyof Fila] as number) <= v); return b },
      order: (col: string) => { llamadas.push(`order:${col}`); orden.push(col); return b },
      range: (desde: number, hasta: number) => { llamadas.push(`range:${desde}-${hasta}`); return resolver(desde, hasta) },
      limit: (n: number) => { llamadas.push(`limit:${n}`); return resolver(0, n - 1) },
    }
    return b
  })

  return { client: { from }, llamadas, from }
}

function usar(rows: WorkRow[], opciones: { errorForzado?: boolean } = {}) {
  const emulador = emuladorPostgrest(rows, opciones)
  vi.mocked(createClient).mockResolvedValue(emulador.client as never)
  return emulador
}

/** Recorre todas las páginas hasta que no quedan obras y devuelve ids y totales. */
async function recorrer(genre: string, pagina: number) {
  const ids: string[] = []
  const totales: (number | null)[] = []
  for (let offset = 0; ; offset += pagina) {
    const p: PublishedWorksPage = await listPublishedWorks({ genre }, pagina, { offset })
    totales.push(p.total)
    if (p.works.length === 0) break
    ids.push(...p.works.map((w) => w.id))
    if (offset > 100_000) throw new Error('recorrido sin fin')
  }
  return { ids, totales }
}

/**
 * Catálogo de varios miles de obras con géneros reales y variantes con
 * acentos, mayúsculas, ligaduras, nulos y caracteres que LIKE trata como
 * comodín. Incluye obras sin publicar y borradas, que no deben aparecer.
 */
const GENEROS: (string | null)[] = [
  'Comedia', 'COMEDIA DE ENREDO', 'Tragicomedia', 'Comèdia', 'comedia musical',
  'Teatro clásico', 'TEATRO CLÁSICO DEL SIGLO DE ORO', 'Clásico', 'clasico',
  'Musical', 'Teatro MUSICAL', 'Música y danza',
  'Drama de honor', 'Auto sacramental', 'Zarzuela', 'Ópera', 'Monólogo',
  'Œuvre dramatique', 'Straßentheater', 'Æsthetic', 'Teatro 100% físico', 'teatro_físico', null,
]

function catalogoGrande(n: number): WorkRow[] {
  const filas = Array.from({ length: n }, (_, i) =>
    obra(i, GENEROS[(i * 31) % GENEROS.length], {
      is_published: i % 23 !== 4,
      deleted_at: i % 29 === 7 ? '2026-01-01T00:00:00Z' : null,
    })
  )
  return filas
}

const visibles = (rows: WorkRow[]) => rows.filter((r) => r.is_published && r.deleted_at === null).sort(ordenEstable)

function encender(valor = '1') {
  vi.stubEnv('SCENAIA_GENERO_SQL_ENABLED', valor)
}

describe('listPublishedWorks — género por SQL en modo página (SCENAIA-006 §4.4)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('con el interruptor encendido', () => {
    it('en un catálogo de 6.000 obras, comedia, musical y clasico dan exactamente las obras de matchesGenre, en orden estable, recorriendo páginas de 10 sin solapes ni huecos y con recuento exacto', async () => {
      encender()
      const catalogo = catalogoGrande(6000)
      const publicas = visibles(catalogo)

      for (const termino of ['comedia', 'musical', 'clasico']) {
        __resetCacheForTests()
        usar(catalogo)
        const esperadas = publicas.filter((r) => matchesGenreReferencia(r.genre, termino)).map((r) => r.id)
        expect(esperadas.length).toBeGreaterThan(100)

        const { ids, totales } = await recorrer(termino, 10)

        expect(ids).toEqual(esperadas)
        expect(new Set(ids).size).toBe(ids.length)
        expect(totales.every((t) => t === esperadas.length)).toBe(true)
      }
      // Larga a propósito: unas 300 páginas sobre 6.000 obras simuladas. Con toda
      // la suite en paralelo supera a veces los 5 s por defecto de vitest.
    }, 30_000)

    it('los tres términos encuentran sus obras aunque la base guarde acentos y mayúsculas (esperados escritos a mano)', async () => {
      encender()
      const generos: Record<string, string | null> = {
        'w-comedia-1': 'Comedia',
        'w-comedia-2': 'COMEDIA DE ENREDO',
        'w-comedia-3': 'Tragicomedia',
        'w-comedia-4': 'Comèdia',
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
      const esperados: Record<string, string[]> = {
        comedia: ['w-comedia-1', 'w-comedia-2', 'w-comedia-3', 'w-comedia-4', 'w-musical-2'],
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

    it('con más de 1.000 coincidencias el recuento es exacto (no null) y no hay tope de candidatos', async () => {
      encender()
      const catalogo = Array.from({ length: 4000 }, (_, i) => obra(i, i % 3 === 0 ? 'Drama' : i % 2 === 0 ? 'Comedia' : 'Comedia de enredo'))
      const comedias = visibles(catalogo).filter((r) => r.genre !== 'Drama')
      expect(comedias.length).toBeGreaterThan(1000)
      const { llamadas } = usar(catalogo)

      const primera = await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })
      const ultima = await listPublishedWorks({ genre: 'comedia' }, 10, { offset: comedias.length - 3 })

      expect(primera.total).toBe(comedias.length)
      expect(ultima.total).toBe(comedias.length)
      expect(ultima.works.map((w) => w.id)).toEqual(comedias.slice(-3).map((r) => r.id))
      expect(llamadas).not.toContain('limit:1000')
      expect(llamadas.some((l) => l.startsWith('limit:'))).toBe(false)
    })

    it('filtra en una sola consulta: ilike sobre genre_normalizado, count exact, orden title e id y range', async () => {
      encender()
      const { llamadas, from } = usar([obra(1, 'Teatro clásico'), obra(2, 'Drama')])

      const p = await listPublishedWorks({ genre: 'clasico' }, 10, { offset: 0 })

      expect(p).toEqual({ works: [expect.objectContaining({ id: 'w-00001', genre: 'Teatro clásico' })], total: 1 })
      expect(from).toHaveBeenCalledTimes(1)
      expect(llamadas).toEqual(['select:count', 'ilike:genre_normalizado:%clasico%', 'order:title', 'order:id', 'range:0-9'])
    })

    it('el término se normaliza como la columna: sin acentos y en minúsculas', async () => {
      encender()
      const { llamadas } = usar([obra(1, 'Teatro clásico')])

      const p = await listPublishedWorks({ genre: 'Clásico' }, 10, { offset: 0 })

      expect(llamadas).toContain('ilike:genre_normalizado:%clasico%')
      expect(p.total).toBe(1)
    })

    it('escapa % y _ en el término: se buscan literales, no como comodines', async () => {
      encender()
      const catalogo = [
        obra(1, 'Teatro 100% físico'),
        obra(2, 'Teatro 1000 físico'),
        obra(3, 'teatro_físico'),
        obra(4, 'teatro-físico'),
        obra(5, 'teatroXfísico'),
      ]

      usar(catalogo)
      const porciento = await listPublishedWorks({ genre: '100%' }, 10, { offset: 0 })
      __resetCacheForTests()
      const { llamadas } = usar(catalogo)
      const guionBajo = await listPublishedWorks({ genre: 'teatro_fisico' }, 10, { offset: 0 })

      expect(porciento.works.map((w) => w.id)).toEqual(['w-00001'])
      expect(guionBajo.works.map((w) => w.id)).toEqual(['w-00003'])
      expect(llamadas).toContain('ilike:genre_normalizado:%teatro\\_fisico%')
    })

    it('escapa también la barra invertida', async () => {
      encender()
      const { llamadas } = usar([obra(1, 'a\\b'), obra(2, 'ab')])

      const p = await listPublishedWorks({ genre: 'a\\b' }, 10, { offset: 0 })

      expect(llamadas).toContain('ilike:genre_normalizado:%a\\\\b%')
      expect(p.works.map((w) => w.id)).toEqual(['w-00001'])
    })

    it('ligaduras: unaccent las descompone (œ→oe, ß→ss) y matchesGenre no; ninguno de los tres términos del intérprete las contiene', async () => {
      encender()
      usar([obra(1, 'Œuvre dramatique'), obra(2, 'Straßentheater')])

      const oeuvre = await listPublishedWorks({ genre: 'oeuvre' }, 10, { offset: 0 })

      expect(oeuvre.works.map((w) => w.id)).toEqual(['w-00001'])
      expect(matchesGenreReferencia('Œuvre dramatique', 'oeuvre')).toBe(false)
    })

    it('mantiene el resto del criterio en la misma consulta', async () => {
      encender()
      const { llamadas } = usar([obra(1, 'Comedia', { author: 'Lope de Vega' }), obra(2, 'Comedia', { author: 'Calderón' })])

      await listPublishedWorks({ genre: 'comedia', author: 'Lope' }, 10, { offset: 0 })

      expect(llamadas).toContain('ilike:author:%Lope%')
      expect(llamadas).toContain('ilike:genre_normalizado:%comedia%')
    })

    it('un desplazamiento más allá del total devuelve una página vacía con el total real (PGRST103)', async () => {
      encender()
      usar(Array.from({ length: 30 }, (_, i) => obra(i, 'Comedia')))

      const p = await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 50 })

      expect(p).toEqual({ works: [], total: 30 })
    })

    it('ante un error de la base, página vacía y total null', async () => {
      encender()
      usar([obra(1, 'Comedia')], { errorForzado: true })

      expect(await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })).toEqual({ works: [], total: null })
    })

    it('acepta los mismos valores de encendido que SCENAIA_PAGINACION_ENABLED ("1", "true", sin distinguir mayúsculas ni espacios)', async () => {
      for (const valor of ['1', 'true', 'TRUE', ' true ']) {
        __resetCacheForTests()
        encender(valor)
        const { llamadas } = usar([obra(1, 'Comedia')])
        await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })
        expect(llamadas).toContain('ilike:genre_normalizado:%comedia%')
      }
    })

    it('nunca expone genre_normalizado en las columnas devueltas', async () => {
      encender()
      const { llamadas } = usar([obra(1, 'Comedia')])

      const p = await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })

      expect(llamadas).not.toContain('select:expone-genre_normalizado')
      expect(Object.keys(p.works[0])).not.toContain('genreNormalizado')
      const fuente = readFileSync(join(__dirname, '..', 'works.ts'), 'utf-8')
      expect(fuente.match(/const WORK_COLUMNS =\s*'[^']*'/)?.[0]).not.toMatch(/genre_normalizado/)
    })
  })

  describe('lo que no cambia', () => {
    it('con el interruptor apagado (ausente o con cualquier otro valor), el camino con género es el de siempre: 1.000 candidatos filtrados en memoria', async () => {
      for (const valor of [undefined, '', '0', 'false', 'si', 'yes', 'on']) {
        __resetCacheForTests()
        vi.unstubAllEnvs()
        if (valor !== undefined) encender(valor)
        const { llamadas } = usar(Array.from({ length: 30 }, (_, i) => obra(i, i % 2 === 0 ? 'Teatro clásico' : 'Drama')))

        const p = await listPublishedWorks({ genre: 'clasico' }, 10, { offset: 0 })

        expect(llamadas).toEqual(['select', 'order:title', 'order:id', 'limit:1000'])
        expect(p.total).toBe(15)
      }
    })

    it('con el interruptor encendido, sin género en el criterio, la consulta es la de siempre', async () => {
      encender()
      const { llamadas } = usar(Array.from({ length: 30 }, (_, i) => obra(i, 'Comedia')))

      const p = await listPublishedWorks({ author: 'Autor' }, 10, { offset: 10 })

      expect(llamadas).toEqual(['select:count', 'ilike:author:%Autor%', 'order:title', 'order:id', 'range:10-19'])
      expect(p.total).toBe(30)
    })

    it('con el interruptor encendido, el modo sin página sigue con 200 candidatos en memoria, sin ilike sobre ninguna columna de género', async () => {
      encender()
      const { llamadas } = usar(Array.from({ length: 300 }, (_, i) => obra(i, 'Comedia')))

      const resultado = await listPublishedWorks({ genre: 'comedia' }, 20)

      expect(Array.isArray(resultado)).toBe(true)
      expect(resultado).toHaveLength(20)
      expect(llamadas).toEqual(['select', 'limit:200'])
    })

    it('en un catálogo de menos de 1.000 obras, encendido y apagado devuelven exactamente las mismas páginas y totales', async () => {
      const catalogo = catalogoGrande(900)

      for (const termino of ['comedia', 'musical', 'clasico']) {
        __resetCacheForTests()
        vi.unstubAllEnvs()
        usar(catalogo)
        const apagado = await recorrer(termino, 10)

        __resetCacheForTests()
        encender()
        usar(catalogo)
        const encendido = await recorrer(termino, 10)

        expect(encendido).toEqual(apagado)
        expect(encendido.ids.length).toBeGreaterThan(10)
      }
    })
  })

  describe('caché', () => {
    it('encender o apagar el interruptor nunca sirve una página del camino contrario', async () => {
      const catalogo = Array.from({ length: 1500 }, (_, i) => obra(i, i % 2 === 0 ? 'Comedia' : 'Drama'))

      // Apagado: 1.000 candidatos, recuento no determinado.
      const primero = usar(catalogo)
      expect((await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })).total).toBeNull()

      // Encendido, misma petición: no se sirve la página en caché del camino en memoria.
      encender()
      const segundo = usar(catalogo)
      expect((await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })).total).toBe(750)
      expect(segundo.from).toHaveBeenCalledTimes(1)

      // Apagado de nuevo: vuelve la página del camino en memoria, no la del SQL.
      vi.unstubAllEnvs()
      const tercero = usar(catalogo)
      expect((await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })).total).toBeNull()
      expect(tercero.from).not.toHaveBeenCalled()
      expect(primero.from).toHaveBeenCalledTimes(1)
    })

    it('con el interruptor encendido, la misma página se sirve desde la caché', async () => {
      encender()
      const { from } = usar([obra(1, 'Comedia')])

      await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })
      await listPublishedWorks({ genre: 'comedia' }, 10, { offset: 0 })

      expect(from).toHaveBeenCalledTimes(1)
    })
  })
})
