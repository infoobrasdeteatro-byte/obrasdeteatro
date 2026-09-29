import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'
import { __resetCacheForTests } from '@/lib/verified/sistemas-cache/with-cache'
import { listPublishedWorks } from '../works'
import type { PublishedWorksPage, WorkSearchCriteria } from '@/lib/repository-layer'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

/**
 * SCENAIA-007 §4.3: criterio `epocas` (y `epocaYearFrom`) en applyCriteria,
 * resuelto en SQL igual en el modo página y en el modo sin página.
 *
 * El emulador reproduce lo que hace la base con la consulta: `ov` es el
 * solapamiento de arrays (&&: la obra comparte al menos una clave), `or`
 * combina sus condiciones con OR y con AND respecto al resto de filtros, y
 * `year.gte.N` es falso para un year nulo, como en SQL. Deliberadamente NO
 * reutiliza el código probado.
 */

interface WorkRow {
  id: string
  title: string
  subtitle: null
  author: string
  genre: string | null
  synopsis: null
  language: string
  year: number | null
  slug: string
  min_age: number
  duration_minutes: number
  cast_size_max: number
  source_name: null
  source_url: null
  is_published: boolean
  deleted_at: string | null
  epocas: string[]
}

type Fila = WorkRow & { genre_normalizado: string }

function columnaGenerada(genre: string | null): string {
  return (genre ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Literal de array de PostgREST: {a,b} -> ['a', 'b']. */
function arrayLiteral(texto: string): string[] {
  if (!/^\{.*\}$/.test(texto)) throw new Error(`literal de array no válido: ${texto}`)
  const dentro = texto.slice(1, -1)
  return dentro === '' ? [] : dentro.split(',')
}

const solapa = (a: readonly string[], b: readonly string[]) => a.some((x) => b.includes(x))

/** Una condición de PostgREST (col.op.valor) evaluada sobre una fila, con semántica SQL. */
function condicion(fila: Fila, texto: string): boolean {
  const m = /^([a-z_]+)\.(ov|gte)\.(.+)$/.exec(texto)
  if (!m) throw new Error(`condición no emulada: ${texto}`)
  const [, col, op, valor] = m
  const v = fila[col as keyof Fila]
  if (op === 'ov') return solapa(v as string[], arrayLiteral(valor))
  // gte: NULL >= N es NULL, que en un WHERE (y dentro de un OR) no cumple.
  return v !== null && (v as number) >= Number(valor)
}

/** Parte "a.ov.{x,y},b.gte.1" por las comas de primer nivel (no las de dentro de {}). */
function partirOr(filtros: string): string[] {
  const partes: string[] = []
  let nivel = 0
  let actual = ''
  for (const c of filtros) {
    if (c === '{') nivel++
    if (c === '}') nivel--
    if (c === ',' && nivel === 0) {
      partes.push(actual)
      actual = ''
    } else actual += c
  }
  partes.push(actual)
  return partes
}

function obra(i: number, epocas: string[], extra: Partial<WorkRow> = {}): WorkRow {
  return {
    id: `w-${String(i).padStart(5, '0')}`,
    title: i % 9 === 0 ? 'Título repetido' : `Obra ${String((i * 7919) % 100000).padStart(5, '0')}`,
    subtitle: null,
    author: 'Autor',
    genre: 'Drama',
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
    epocas,
    ...extra,
  }
}

function ordenEstable(a: WorkRow, b: WorkRow): number {
  if (a.title !== b.title) return a.title < b.title ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

type Resultado = { data: WorkRow[] | null; error: { code?: string; message: string; details?: string } | null; count: number | null }

function emuladorPostgrest(rows: WorkRow[]) {
  const llamadas: string[] = []
  const tabla: Fila[] = rows.map((r) => ({ ...r, genre_normalizado: columnaGenerada(r.genre) }))

  const from = vi.fn(() => {
    let filas = [...tabla]
    let contar = false
    const orden: string[] = []

    const resolver = (desde: number, hasta: number): Promise<Resultado> => {
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
      // La API solo devuelve las columnas pedidas: ni genre_normalizado ni epocas están en WORK_COLUMNS.
      const data = ordenadas.slice(desde, hasta + 1).map((fila) => {
        const r: Partial<Fila> = { ...fila }
        delete r.genre_normalizado
        delete r.epocas
        return r as WorkRow
      })
      return Promise.resolve({ data, error: null, count: contar ? total : null })
    }

    const b = {
      select: (cols: string, opts?: { count?: string }) => {
        llamadas.push(opts?.count === 'exact' ? 'select:count' : 'select')
        if (cols.includes('epocas')) llamadas.push('select:expone-epocas')
        contar = opts?.count === 'exact'
        return b
      },
      eq: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof Fila] === v); return b },
      is: (col: string, v: unknown) => { filas = filas.filter((r) => r[col as keyof Fila] === v); return b },
      ilike: (col: string, patron: string) => {
        llamadas.push(`ilike:${col}:${patron}`)
        const term = patron.replace(/^%|%$/g, '')
        filas = filas.filter((r) => String(r[col as keyof Fila] ?? '').toLowerCase().includes(term.toLowerCase()))
        return b
      },
      gte: (col: string, v: number) => { filas = filas.filter((r) => condicion(r, `${col}.gte.${v}`)); return b },
      lte: (col: string, v: number) => { filas = filas.filter((r) => r[col as keyof Fila] !== null && (r[col as keyof Fila] as number) <= v); return b },
      overlaps: (col: string, valor: string[]) => {
        llamadas.push(`overlaps:${col}:{${valor.join(',')}}`)
        filas = filas.filter((r) => solapa(r[col as keyof Fila] as string[], valor))
        return b
      },
      or: (filtros: string) => {
        llamadas.push(`or:${filtros}`)
        const partes = partirOr(filtros)
        filas = filas.filter((r) => partes.some((p) => condicion(r, p)))
        return b
      },
      order: (col: string) => { llamadas.push(`order:${col}`); orden.push(col); return b },
      range: (desde: number, hasta: number) => { llamadas.push(`range:${desde}-${hasta}`); return resolver(desde, hasta) },
      limit: (n: number) => { llamadas.push(`limit:${n}`); return resolver(0, n - 1) },
    }
    return b
  })

  return { client: { from }, llamadas, from }
}

function usar(rows: WorkRow[]) {
  const emulador = emuladorPostgrest(rows)
  vi.mocked(createClient).mockResolvedValue(emulador.client as never)
  return emulador
}

/** Recorre todas las páginas hasta que no quedan obras y devuelve ids y totales. */
async function recorrer(criteria: WorkSearchCriteria, pagina: number) {
  const ids: string[] = []
  const totales: (number | null)[] = []
  for (let offset = 0; ; offset += pagina) {
    const p: PublishedWorksPage = await listPublishedWorks(criteria, pagina, { offset })
    totales.push(p.total)
    if (p.works.length === 0) break
    ids.push(...p.works.map((w) => w.id))
    if (offset > 100_000) throw new Error('recorrido sin fin')
  }
  return { ids, totales }
}

/**
 * Catálogo de varios miles de obras: combinaciones de épocas (ninguna, una,
 * varias), años con nulos, géneros con y sin acentos, y obras sin publicar o
 * borradas que no deben aparecer nunca.
 */
const COMBINACIONES: string[][] = [
  [], ['siglo_de_oro', 'barroco'], ['contemporaneo'], ['posguerra'], ['isabelino'],
  ['grecolatino'], [], ['barroco'], ['romanticismo'], ['medieval', 'renacimiento'], ['neoclasico'], ['vanguardias'],
]
const GENEROS = ['Comedia', 'Comedia de enredo', 'Drama de honor', 'Tragicomedia', 'Teatro clásico', 'Auto sacramental']

function catalogoGrande(n: number): WorkRow[] {
  return Array.from({ length: n }, (_, i) =>
    obra(i, COMBINACIONES[(i * 7) % COMBINACIONES.length], {
      // Independiente de la época (que depende de i mod 12): toda combinación
      // de época y género aparece en el catálogo.
      genre: GENEROS[Math.floor(i / COMBINACIONES.length) % GENEROS.length],
      year: i % 17 === 3 ? null : 1500 + ((i * 37) % 525),
      is_published: i % 23 !== 4,
      deleted_at: i % 29 === 7 ? '2026-01-01T00:00:00Z' : null,
    })
  )
}

const visibles = (rows: WorkRow[]) => rows.filter((r) => r.is_published && r.deleted_at === null).sort(ordenEstable)
const CLASICO = ['grecolatino', 'renacimiento', 'siglo_de_oro', 'barroco', 'isabelino', 'neoclasico']

describe('listPublishedWorks — criterio epocas (SCENAIA-007 §4.3)', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
    __resetCacheForTests()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('sin epocas, nada cambia', () => {
    it('sin el campo, la consulta no lleva ni overlaps ni or, en los dos modos', async () => {
      const { llamadas } = usar(catalogoGrande(50))
      await listPublishedWorks({}, 10, { offset: 0 })
      await listPublishedWorks({ yearFrom: 1900 }, 20)
      expect(llamadas.some((l) => l.startsWith('overlaps') || l.startsWith('or:'))).toBe(false)
    })

    it('una lista vacía no filtra: mismas llamadas y mismo resultado que sin el campo', async () => {
      const catalogo = catalogoGrande(300)

      const sin = usar(catalogo)
      const pSin = await listPublishedWorks({ yearFrom: 1700 }, 10, { offset: 20 })
      const lSin = await listPublishedWorks({ yearFrom: 1700 }, 20)
      __resetCacheForTests()
      const vacia = usar(catalogo)
      const pVacia = await listPublishedWorks({ yearFrom: 1700, epocas: [] }, 10, { offset: 20 })
      const lVacia = await listPublishedWorks({ yearFrom: 1700, epocas: [] }, 20)

      expect(pVacia).toEqual(pSin)
      expect(lVacia).toEqual(lSin)
      expect(vacia.llamadas).toEqual(sin.llamadas)
    })

    it('epocaYearFrom sin epocas (o con lista vacía) se ignora: no filtra por año', async () => {
      const catalogo = catalogoGrande(300)
      usar(catalogo)
      const pSin = await listPublishedWorks({}, 10, { offset: 0 })
      __resetCacheForTests()
      const solo = usar(catalogo)
      const pSolo = await listPublishedWorks({ epocaYearFrom: 1950 }, 10, { offset: 0 })
      const pVacia = await listPublishedWorks({ epocas: [], epocaYearFrom: 1950 }, 10, { offset: 0 })

      expect(pSolo).toEqual(pSin)
      expect(pVacia).toEqual(pSin)
      expect(solo.llamadas.some((l) => l.startsWith('or:') || l.startsWith('overlaps') || l.startsWith('gte'))).toBe(false)
    })

    it('las obras devueltas nunca exponen la columna epocas ni la piden en el select', async () => {
      const { llamadas } = usar(catalogoGrande(40))
      const p = await listPublishedWorks({ epocas: ['barroco'] }, 10, { offset: 0 })
      expect(p.works.length).toBeGreaterThan(0)
      expect(p.works.every((w) => !('epocas' in w))).toBe(true)
      expect(llamadas).not.toContain('select:expone-epocas')
    })
  })

  describe('modo página', () => {
    it('una sola época: solapamiento en SQL, recorrido completo en páginas de 10 sin solapes ni huecos y recuento exacto (6.000 obras)', async () => {
      const catalogo = catalogoGrande(6000)
      usar(catalogo)
      const esperadas = visibles(catalogo).filter((r) => r.epocas.includes('isabelino')).map((r) => r.id)
      expect(esperadas.length).toBeGreaterThan(100)

      const { ids, totales } = await recorrer({ epocas: ['isabelino'] }, 10)

      expect(ids).toEqual(esperadas)
      expect(new Set(ids).size).toBe(ids.length)
      expect(totales.every((t) => t === esperadas.length)).toBe(true)
    }, 30_000)

    it('varias épocas: basta con compartir UNA (semántica OR de &&), no todas', async () => {
      usar([
        obra(1, ['siglo_de_oro', 'barroco']),
        obra(2, ['barroco']),
        obra(3, ['isabelino']),
        obra(4, ['grecolatino', 'medieval']),
        obra(5, ['contemporaneo']),
        obra(6, []),
        obra(7, ['medieval']),
      ])
      const p = await listPublishedWorks({ epocas: CLASICO }, 10, { offset: 0 })
      expect(p.works.map((w) => w.id).sort()).toEqual(['w-00001', 'w-00002', 'w-00003', 'w-00004'])
      expect(p.total).toBe(4)
    })

    it('varias épocas en un catálogo grande: exactamente las obras que comparten alguna clave de «clásico»', async () => {
      const catalogo = catalogoGrande(6000)
      usar(catalogo)
      const esperadas = visibles(catalogo).filter((r) => solapa(r.epocas, CLASICO)).map((r) => r.id)

      const { ids, totales } = await recorrer({ epocas: CLASICO }, 10)

      expect(ids).toEqual(esperadas)
      expect(totales.every((t) => t === esperadas.length)).toBe(true)
    }, 30_000)

    it('con más de 1.000 coincidencias el recuento es exacto (no null): la época no tiene tope de candidatos', async () => {
      const catalogo = catalogoGrande(6000)
      const { llamadas } = usar(catalogo)
      const esperadas = visibles(catalogo).filter((r) => solapa(r.epocas, CLASICO))
      expect(esperadas.length).toBeGreaterThan(1000)

      const p = await listPublishedWorks({ epocas: CLASICO }, 10, { offset: 1200 })

      expect(p.total).toBe(esperadas.length)
      expect(p.works.map((w) => w.id)).toEqual(esperadas.slice(1200, 1210).map((r) => r.id))
      expect(llamadas).toContain('select:count')
      expect(llamadas.some((l) => l.startsWith('limit:'))).toBe(false)
    })

    it('una sola consulta: overlaps sobre epocas con el literal {a,b}, count exact, orden title e id y range', async () => {
      const { llamadas, from } = usar(catalogoGrande(30))
      await listPublishedWorks({ epocas: ['siglo_de_oro', 'barroco'] }, 10, { offset: 0 })
      expect(from).toHaveBeenCalledTimes(1)
      expect(llamadas).toEqual(['select:count', 'overlaps:epocas:{siglo_de_oro,barroco}', 'order:title', 'order:id', 'range:0-9'])
    })

    it('un desplazamiento más allá del total devuelve una página vacía con el total real', async () => {
      const catalogo = catalogoGrande(200)
      usar(catalogo)
      const n = visibles(catalogo).filter((r) => r.epocas.includes('barroco')).length
      const p = await listPublishedWorks({ epocas: ['barroco'] }, 10, { offset: 5000 })
      expect(p).toEqual({ works: [], total: n })
    })
  })

  describe('epocas + epocaYearFrom (el caso «contemporáneo»)', () => {
    it('OR entre el solapamiento y year >= N; un year nulo no cumple por el año, pero sí puede entrar por la época', async () => {
      const { llamadas } = usar([
        obra(1, ['contemporaneo'], { year: null }), // entra por la época
        obra(2, [], { year: null }), // no entra: sin época y year nulo
        obra(3, [], { year: 1960 }), // entra por el año
        obra(4, ['posguerra'], { year: 1949 }), // no entra: otra época y año anterior
        obra(5, ['contemporaneo'], { year: 1800 }), // entra por la época aunque el año no cumpla
        obra(6, [], { year: 1950 }), // entra: >= incluye el límite
      ])
      const p = await listPublishedWorks({ epocas: ['contemporaneo'], epocaYearFrom: 1950 }, 10, { offset: 0 })

      expect(p.works.map((w) => w.id).sort()).toEqual(['w-00001', 'w-00003', 'w-00005', 'w-00006'])
      expect(p.total).toBe(4)
      expect(llamadas).toContain('or:epocas.ov.{contemporaneo},year.gte.1950')
      expect(llamadas.some((l) => l.startsWith('overlaps'))).toBe(false)
    })

    it('en un catálogo grande, el OR da exactamente la unión, con recorrido completo y recuento exacto', async () => {
      const catalogo = catalogoGrande(6000)
      usar(catalogo)
      const esperadas = visibles(catalogo)
        .filter((r) => r.epocas.includes('contemporaneo') || (r.year !== null && r.year >= 1950))
        .map((r) => r.id)
      expect(esperadas.length).toBeGreaterThan(1000)

      const { ids, totales } = await recorrer({ epocas: ['contemporaneo'], epocaYearFrom: 1950 }, 10)

      expect(ids).toEqual(esperadas)
      expect(new Set(ids).size).toBe(ids.length)
      expect(totales.every((t) => t === esperadas.length)).toBe(true)
    }, 30_000)

    it('el OR se combina con AND con el resto del criterio', async () => {
      usar([
        obra(1, ['contemporaneo'], { cast_size_max: 3 }),
        obra(2, ['contemporaneo'], { cast_size_max: 9 }),
        obra(3, [], { year: 2000, cast_size_max: 2 }),
        obra(4, [], { year: 2000, cast_size_max: 8 }),
      ])
      const p = await listPublishedWorks({ epocas: ['contemporaneo'], epocaYearFrom: 1950, maxCastSize: 4 }, 10, { offset: 0 })
      expect(p.works.map((w) => w.id).sort()).toEqual(['w-00001', 'w-00003'])
    })
  })

  describe('combinación con género', () => {
    it('camino en memoria (SCENAIA_GENERO_SQL_ENABLED apagado): la época se filtra en SQL antes de los candidatos y el género después', async () => {
      // 6.000 obras; las de isabelino o grecolatino (los candidatos que deja la
      // época) quedan por debajo del tope de 1.000 del camino en memoria
      // (Adenda 004A §4.1), de modo que el recuento es exacto y no null.
      const catalogo = catalogoGrande(6000)
      const { llamadas } = usar(catalogo)
      const epocas = ['isabelino', 'grecolatino']
      const candidatas = visibles(catalogo).filter((r) => solapa(r.epocas, epocas))
      const esperadas = candidatas.filter((r) => columnaGenerada(r.genre).includes('comedia')).map((r) => r.id)
      expect(candidatas.length).toBeLessThan(1000)
      expect(esperadas.length).toBeGreaterThan(50)

      const { ids, totales } = await recorrer({ genre: 'comedia', epocas }, 10)

      expect(ids).toEqual(esperadas)
      expect(totales.every((t) => t === esperadas.length)).toBe(true)
      expect(llamadas).toContain('overlaps:epocas:{isabelino,grecolatino}')
      expect(llamadas).toContain('limit:1000')
    }, 30_000)

    it('camino SQL (SCENAIA_GENERO_SQL_ENABLED encendido): género y época en la misma consulta, recuento exacto', async () => {
      vi.stubEnv('SCENAIA_GENERO_SQL_ENABLED', '1')
      const catalogo = catalogoGrande(6000)
      const { llamadas } = usar(catalogo)
      const esperadas = visibles(catalogo)
        .filter((r) => solapa(r.epocas, CLASICO) && columnaGenerada(r.genre).includes('comedia'))
        .map((r) => r.id)

      const { ids, totales } = await recorrer({ genre: 'comedia', epocas: CLASICO }, 10)

      expect(ids).toEqual(esperadas)
      expect(totales.every((t) => t === esperadas.length)).toBe(true)
      expect(llamadas).toContain('ilike:genre_normalizado:%comedia%')
      expect(llamadas).toContain(`overlaps:epocas:{${CLASICO.join(',')}}`)
      expect(llamadas.some((l) => l.startsWith('limit:'))).toBe(false)
    }, 30_000)

    it('«comedias clásicas» con el OR de contemporáneo y género: las tres condiciones a la vez', async () => {
      usar([
        obra(1, ['contemporaneo'], { genre: 'Comedia' }),
        obra(2, ['contemporaneo'], { genre: 'Drama' }),
        obra(3, [], { genre: 'Tragicomedia', year: 1990 }),
        obra(4, [], { genre: 'Comedia', year: 1700 }),
      ])
      const p = await listPublishedWorks({ genre: 'comedia', epocas: ['contemporaneo'], epocaYearFrom: 1950 }, 10, { offset: 0 })
      expect(p.works.map((w) => w.id).sort()).toEqual(['w-00001', 'w-00003'])
    })
  })

  describe('modo sin página', () => {
    it('sin género: la época se filtra en SQL y respeta el límite', async () => {
      const catalogo = catalogoGrande(3000)
      const { llamadas } = usar(catalogo)
      const works = await listPublishedWorks({ epocas: ['isabelino'] }, 20)

      const validas = new Set(visibles(catalogo).filter((r) => r.epocas.includes('isabelino')).map((r) => r.id))
      expect(works).toHaveLength(20)
      expect(works.every((w) => validas.has(w.id))).toBe(true)
      expect(llamadas).toEqual(['select', 'overlaps:epocas:{isabelino}', 'limit:20'])
    })

    it('con género (200 candidatos en memoria): los candidatos ya vienen filtrados por época, así que ninguna obra de la época queda fuera por el tope', async () => {
      // 250 obras «Drama» sin época delante de 30 comedias barrocas: si la época
      // se aplicara en memoria, el tope de 200 candidatos las dejaría fuera.
      const rows = [
        ...Array.from({ length: 250 }, (_, i) => obra(i, [], { genre: 'Comedia' })),
        ...Array.from({ length: 30 }, (_, i) => obra(1000 + i, ['barroco'], { genre: 'Comedia de enredo' })),
      ]
      const { llamadas } = usar(rows)
      const works = await listPublishedWorks({ genre: 'comedia', epocas: ['barroco'] }, 50)

      expect(works.map((w) => w.id).sort()).toEqual(rows.slice(250).map((r) => r.id).sort())
      expect(llamadas).toEqual(['select', 'overlaps:epocas:{barroco}', 'limit:200'])
    })

    it('epocas + epocaYearFrom también usa el OR', async () => {
      const { llamadas } = usar([obra(1, ['contemporaneo'], { year: null }), obra(2, [], { year: null }), obra(3, [], { year: 1999 })])
      const works = await listPublishedWorks({ epocas: ['contemporaneo'], epocaYearFrom: 1950 }, 10)
      expect(works.map((w) => w.id).sort()).toEqual(['w-00001', 'w-00003'])
      expect(llamadas).toContain('or:epocas.ov.{contemporaneo},year.gte.1950')
    })
  })

  describe('invariantes de contrato (solo lo que reabre SCENAIA-007 PR 2)', () => {
    const fuente = (ruta: string) => readFileSync(join(__dirname, '..', '..', '..', ruta), 'utf-8')
    const WORKS = fuente('lib/repository-layer/works.ts')

    it('la época se resuelve solo en applyCriteria, en SQL: nunca se filtra en memoria', () => {
      // Desde su comentario de cabecera hasta la siguiente declaración.
      const cuerpo = WORKS.slice(WORKS.indexOf('Traduce el WorkSearchCriteria'), WORKS.indexOf('export interface PublishedWorksPageOptions'))
      expect(cuerpo).toMatch(/\.overlaps\('epocas'/)
      expect(cuerpo).toMatch(/epocas\.ov\./)
      const fuera = WORKS.replace(cuerpo, '')
      expect(fuera).not.toMatch(/epocas/)
    })

    it('WORK_COLUMNS no incluye epocas: la columna no sale de Repository Layer', () => {
      const columnas = /const WORK_COLUMNS =\s*'([^']+)'/.exec(WORKS)?.[1] ?? ''
      expect(columnas).not.toBe('')
      expect(columnas).not.toMatch(/epocas/)
    })

    // Revisado en SCENAIA-007 PR 3: hasta entonces nadie emitia el criterio.
    // Desde el PR 3 lo emite el interprete -- y solo el --, y el interruptor
    // solo se lee en el Orquestador (adenda al §4.2).
    it('solo el intérprete emite el criterio epocas, y SCENAIA_EPOCA_ENABLED solo se lee en el Orquestador (revisado en el PR 3)', () => {
      expect(fuente('lib/knowledge-assets/interpret-work-query.ts')).toMatch(/criteria\.epocas = /)
      for (const ruta of [
        'lib/knowledge-assets/semantic-retriever.ts',
        'lib/intent-resolver/vocabulary.ts',
        'lib/conversation-state/validate.ts',
        'lib/scenaia-knowledge-model/retrieve-knowledge.ts',
        'lib/scenaia-knowledge-model/knowledge-context-builder.ts',
        'lib/verified/orquestador/coordinate-flow.ts',
        'app/api/scenaia-verified/route.ts',
      ]) {
        expect(fuente(ruta), ruta).not.toMatch(/criteria\.epocas|epocaYearFrom|process\.env\.SCENAIA_EPOCA_ENABLED/)
      }
      expect(fuente('lib/verified/orquestador/epoca.ts')).toMatch(/process\.env\.SCENAIA_EPOCA_ENABLED/)
    })
  })

  describe('caché', () => {
    it('la clave distingue el criterio con y sin epocas (JSON.stringify del criterio completo)', async () => {
      const catalogo = catalogoGrande(200)
      const { from } = usar(catalogo)
      const todas = await listPublishedWorks({}, 10, { offset: 0 })
      const barrocas = await listPublishedWorks({ epocas: ['barroco'] }, 10, { offset: 0 })
      const otraVez = await listPublishedWorks({ epocas: ['barroco'] }, 10, { offset: 0 })

      expect(barrocas.total).not.toBe(todas.total)
      expect(otraVez).toEqual(barrocas)
      expect(from).toHaveBeenCalledTimes(2)
    })
  })
})
