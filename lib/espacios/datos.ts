import { unstable_cache } from 'next/cache'
import { clienteAnonimo } from '@/lib/supabase/anonimo'
import type { EspacioFicha, EspacioTarjeta } from './espacios'

/**
 * Lecturas públicas de espacios escénicos, con el cliente anónimo: la RLS solo
 * deja ver los publicados, y aquí se vuelve a filtrar para que la consulta
 * diga lo que quiere.
 *
 * CACHEADAS 10 MINUTOS (unstable_cache, etiqueta «espacios»). Publicar,
 * retirar o editar una ficha tarda como mucho eso en verse.
 *
 * El buscador lee TODAS las tarjetas publicadas (columnas ligeras) y filtra
 * en memoria (filtrarEspacios): con cientos de fichas es lo más simple y
 * cabe de sobra en la caché. Cuando el catálogo crezca por países hasta
 * varios miles, el filtro tendrá que bajar a la consulta.
 *
 * Un error NO se cachea: la función cacheada lanza y quien llama recibe una
 * lista vacía (o null) solo esa vez.
 */
export const REVALIDAR_ESPACIOS = 600

const COLUMNAS_TARJETA =
  'id, slug, nombre, tipo, pais_code, region, isla, municipio, municipio_slug, nombre_normalizado, lat, lon, aforo, accesibilidad, verificado, imagen_url'
const COLUMNAS_FICHA =
  'id, slug, nombre, tipo, pais_code, region, provincia, isla, municipio, municipio_slug, direccion, codigo_postal, lat, lon, web, telefono, email, redes, aforo, num_salas, accesibilidad, anio_inauguracion, arquitecto, titularidad, descripcion, imagen_url, imagen_autor, imagen_licencia, imagen_fuente_url, verificado'

export async function leerTarjetasPublicadas(): Promise<EspacioTarjeta[]> {
  const { data, error } = await clienteAnonimo()
    .from('espacios_escenicos')
    .select(COLUMNAS_TARJETA)
    .eq('estado', 'publicado')
    .order('nombre', { ascending: true })
    .limit(5000)

  if (error) throw new Error(`espacios: no se pudieron leer: ${error.message}`)
  return data ?? []
}

const tarjetasCacheadas = unstable_cache(leerTarjetasPublicadas, ['espacios-publicados'], {
  revalidate: REVALIDAR_ESPACIOS,
  tags: ['espacios'],
})

/**
 * Igual que espaciosPublicados pero un fallo lanza. Para las páginas por
 * municipio: una lista vacía por error sería un 404 cacheado.
 */
export async function espaciosPublicadosOLanza(): Promise<EspacioTarjeta[]> {
  return tarjetasCacheadas()
}

/** Para el buscador: un fallo deja la lista vacía esa vez, sin romper la página. */
export async function espaciosPublicados(): Promise<EspacioTarjeta[]> {
  try {
    return await tarjetasCacheadas()
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    return []
  }
}

export async function leerFicha(slug: string): Promise<EspacioFicha | null> {
  const { data, error } = await clienteAnonimo()
    .from('espacios_escenicos')
    .select(COLUMNAS_FICHA)
    .eq('estado', 'publicado')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(`espacios: no se pudo leer la ficha: ${error.message}`)
  return data
}

const fichaCacheada = unstable_cache(leerFicha, ['espacio-ficha'], {
  revalidate: REVALIDAR_ESPACIOS,
  tags: ['espacios'],
})

/**
 * Ficha publicada por slug, o null si no existe o no está publicada. Un fallo
 * de lectura SÍ lanza: devolver null daría un 404 que se quedaría cacheado y
 * haría desaparecer de los buscadores una ficha que existe.
 */
export async function fichaPublicada(slug: string): Promise<EspacioFicha | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null
  return fichaCacheada(slug)
}
