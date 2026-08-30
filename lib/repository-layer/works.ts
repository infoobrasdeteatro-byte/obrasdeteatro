import { createClient } from '@/lib/supabase/server'
import { withCache } from '@/lib/verified/sistemas-cache'
import type { Work, WorkSearchCriteria } from './types'

const WORK_COLUMNS =
  'id, title, subtitle, author, genre, synopsis, language, year, slug, min_age, duration_minutes, cast_size_max, source_name, source_url'
const CACHE_TTL_MS = 60_000

const DIACRITICS = /\p{Diacritic}/gu

/**
 * EXCEPCION DOCUMENTADA (microexpediente correctivo, SCENAIA-002C, Punto 2).
 *
 * El texto de una consulta real llega siempre sin diacriticos (normalizeText(),
 * Request Interpreter), mientras que los valores reales de "genre" en Supabase
 * conservan los suyos (p.ej. "Teatro clasico"). Un ILIKE de PostgreSQL no
 * ignora diacriticos, por lo que ese campo no puede compararse correctamente
 * en SQL sin modificar la plataforma (extension unaccent, colacion ICU,
 * funcion o columna generada) -- todas ellas fuera del alcance autorizado
 * para este microexpediente. Por eso, y solo para este campo, la comparacion
 * se resuelve en memoria con la misma normalizacion mecanica ya aprobada en
 * interpret-work-query.ts (duplicada aqui localmente por la misma razon: no
 * hay una capa comun de la que importarla sin cruzar fronteras).
 *
 * Esto NO es un cambio del patron de Repository Layer ni sienta precedente
 * para otros criterios -- el resto de campos de WorkSearchCriteria se siguen
 * resolviendo en SQL. La solucion definitiva de plataforma (normalizacion en
 * base de datos) queda pendiente de un expediente futuro; esta excepcion no
 * la sustituye.
 */
function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '')
}

function matchesGenre(rowGenre: string | null, criteriaGenre: string): boolean {
  if (rowGenre === null) return false
  return stripDiacritics(rowGenre.toLowerCase()).includes(stripDiacritics(criteriaGenre.toLowerCase()))
}

/**
 * Limite de candidatos a traer de Supabase cuando el criterio incluye
 * "genre" -- al resolverse ese campo en memoria (excepcion documentada
 * arriba), no puede aplicarse el limit real hasta despues de filtrar, o se
 * truncarian resultados validos antes de evaluarlos. 200 es el mismo margen
 * ya usado en listPublishedWorkAuthors() para el catalogo real actual.
 */
const GENRE_FILTER_CANDIDATE_LIMIT = 200

function toWork(row: {
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
}): Work {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    author: row.author,
    genre: row.genre,
    synopsis: row.synopsis,
    language: row.language,
    year: row.year,
    slug: row.slug,
    minAge: row.min_age,
    durationMinutes: row.duration_minutes,
    castSizeMax: row.cast_size_max,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
  }
}

export async function getPublishedWorkById(workId: string): Promise<Work | null> {
  return withCache(`work:${workId}`, CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('works')
      .select(WORK_COLUMNS)
      .eq('id', workId)
      .eq('is_published', true)
      .is('deleted_at', null)
      .single()

    if (error || !data) return null

    return toWork(data)
  })
}

/**
 * Traduce el WorkSearchCriteria ya resuelto (SCENAIA-002C) a clausulas
 * reales -- unicamente traduce campos ya decididos, nunca interpreta
 * texto ni decide que significa un criterio (esa responsabilidad es de
 * Knowledge Assets, ADR SCENAIA-002C.1). Ausencia de un campo en el
 * criterio significa "sin filtrar por el", nunca se asume un valor por
 * defecto. Generico sobre el tipo real del query builder de Supabase --
 * evita nombrar su tipo interno, que cambia con cada clausula encadenada.
 * "genre" queda deliberadamente fuera de esta funcion: se resuelve en
 * memoria via matchesGenre() (excepcion documentada mas arriba).
 */
function applyCriteria<
  T extends {
    ilike: (column: string, pattern: string) => T
    gte: (column: string, value: number) => T
    lte: (column: string, value: number) => T
  }
>(query: T, criteria: Omit<WorkSearchCriteria, 'genre'>): T {
  let filtered = query

  if (criteria.author !== undefined) filtered = filtered.ilike('author', `%${criteria.author}%`)
  if (criteria.maxAge !== undefined) filtered = filtered.lte('min_age', criteria.maxAge)
  if (criteria.maxDurationMinutes !== undefined) filtered = filtered.lte('duration_minutes', criteria.maxDurationMinutes)
  if (criteria.minDurationMinutes !== undefined) filtered = filtered.gte('duration_minutes', criteria.minDurationMinutes)
  if (criteria.yearFrom !== undefined) filtered = filtered.gte('year', criteria.yearFrom)
  if (criteria.maxCastSize !== undefined) filtered = filtered.lte('cast_size_max', criteria.maxCastSize)

  return filtered
}

export async function listPublishedWorks(criteria: WorkSearchCriteria = {}, limit = 20): Promise<Work[]> {
  const cacheKey = `works:published:${JSON.stringify(criteria)}:${limit}`

  return withCache(cacheKey, CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const { genre, ...sqlCriteria } = criteria
    const fetchLimit = genre !== undefined ? GENRE_FILTER_CANDIDATE_LIMIT : limit

    const baseQuery = supabase.from('works').select(WORK_COLUMNS).eq('is_published', true).is('deleted_at', null)

    const { data, error } = await applyCriteria(baseQuery, sqlCriteria).limit(fetchLimit)

    if (error || !data) return []

    const rows = genre !== undefined ? data.filter((row) => matchesGenre(row.genre, genre)) : data

    return rows.slice(0, limit).map(toWork)
  })
}

/**
 * Lista de autores reales ya publicados -- usada exclusivamente por el
 * motor de interpretacion de Obras (SCENAIA-002C) para reconocer
 * referencias a autores en el texto de la peticion, sin necesitar ningun
 * vocabulario externo. Solo lectura, mismo patron de cache ya usado en
 * el resto de este archivo.
 */
export async function listPublishedWorkAuthors(): Promise<string[]> {
  return withCache('works:authors', CACHE_TTL_MS, async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('works')
      .select('author')
      .eq('is_published', true)
      .is('deleted_at', null)
      .limit(200)

    if (error || !data) return []

    const authors = data.map((row) => row.author).filter((author): author is string => author !== null)

    return [...new Set(authors)]
  })
}
