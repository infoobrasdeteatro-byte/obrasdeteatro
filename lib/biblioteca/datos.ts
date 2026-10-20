import { unstable_cache } from 'next/cache'
import { clienteAnonimo } from '@/lib/supabase/anonimo'
import { leerTodasLasPaginas } from '@/lib/espacios/paginar'
import { OBRAS_POR_PAGINA, patronBusqueda, rangoPagina, type FiltrosCatalogo } from './catalogo'

/**
 * Lecturas públicas de /obras con el cliente anónimo (la RLS solo deja ver
 * obras publicadas y no borradas; aquí se vuelve a filtrar para que cada
 * consulta diga lo que quiere). Lo que no depende de la búsqueda se cachea
 * 10 minutos con la etiqueta «obras».
 */
export const REVALIDAR_OBRAS = 600

export type ObraCard = {
  id: string
  title: string
  author: string | null
  slug: string | null
  genre: string | null
  year: number | null
}

export type AutorDestacado = { nombre: string; obras: number; iniciales: string }

const COLUMNAS_CARD = 'id, title, author, slug, genre, year'

/** Una página del catálogo, con el total de resultados de la búsqueda. */
export async function paginaCatalogo(f: FiltrosCatalogo): Promise<{ obras: ObraCard[]; total: number }> {
  const [desde, hasta] = rangoPagina(f.pagina)
  let q = clienteAnonimo()
    .from('works')
    .select(COLUMNAS_CARD, { count: 'exact' })
    .eq('is_published', true)
    .is('deleted_at', null)
  const patron = patronBusqueda(f.q)
  if (patron) q = q.ilike('busqueda_normalizada', patron)
  // Primero los autores más antiguos (Siglo de Oro), luego por título: así la
  // primera página abre con los clásicos y no con títulos que empiezan por «¡».
  const { data, count, error } = await q
    .order('author_death_year', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true })
    .order('id', { ascending: true })
    .range(desde, hasta)
  if (error) throw new Error(`obras: no se pudo leer el catálogo: ${error.message}`)
  return { obras: (data ?? []).slice(0, OBRAS_POR_PAGINA), total: count ?? 0 }
}

async function leerResumen(): Promise<{ total: number; recientes: ObraCard[]; autores: AutorDestacado[] }> {
  const cliente = clienteAnonimo()
  const [{ data: recientes, error: e1 }, autoresLeidos] = await Promise.all([
    cliente.from('works').select(COLUMNAS_CARD)
      .eq('is_published', true).is('deleted_at', null)
      .order('created_at', { ascending: false }).order('id', { ascending: true }).limit(4),
    leerTodasLasPaginas<{ author: string | null }>((desde, hasta) =>
      cliente.from('works').select('author')
        .eq('is_published', true).is('deleted_at', null)
        .order('id', { ascending: true }).range(desde, hasta)),
  ])
  if (e1) throw new Error(`obras: no se pudieron leer las recientes: ${e1.message}`)
  if (autoresLeidos.error) throw new Error(`obras: no se pudieron leer los autores: ${autoresLeidos.error.message}`)
  return {
    total: autoresLeidos.data.length,
    recientes: recientes ?? [],
    autores: listaDramaturgos(autoresLeidos.data),
  }
}

/** Total, últimas incorporaciones y todos los dramaturgos (cacheado). */
export const resumenBiblioteca = unstable_cache(leerResumen, ['obras-resumen-v2'], {
  revalidate: REVALIDAR_OBRAS,
  tags: ['obras'],
})

/**
 * Todos los dramaturgos con obras públicas, de más a menos obras (a igualdad,
 * por nombre). «Anónimo» no es un autor y las obras sin autor no cuentan.
 */
export function listaDramaturgos(obras: { author: string | null }[]): AutorDestacado[] {
  const recuento = new Map<string, number>()
  for (const o of obras) {
    const nombre = o.author?.trim()
    if (nombre && nombre !== 'Anónimo') recuento.set(nombre, (recuento.get(nombre) ?? 0) + 1)
  }
  return [...recuento]
    .sort(([a, na], [b, nb]) => nb - na || a.localeCompare(b, 'es'))
    .map(([nombre, obras]) => {
      const palabras = nombre.split(/\s+/)
      const iniciales = (palabras[0][0] + (palabras.length > 1 ? palabras[palabras.length - 1][0] : '')).toUpperCase()
      return { nombre, obras, iniciales }
    })
}
