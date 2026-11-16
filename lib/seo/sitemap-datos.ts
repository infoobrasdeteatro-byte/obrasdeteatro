import { unstable_cache } from 'next/cache'
import { clienteAnonimo } from '@/lib/supabase/anonimo'
import { leerTodasLasPaginas } from '@/lib/espacios/paginar'

/**
 * Lecturas para /sitemap.xml de las secciones que no tenían una propia:
 * las fichas de la biblioteca (/obras/[slug]) y las convocatorias publicadas
 * (/convocatoria/[id]). Con el cliente anónimo y los mismos filtros que las
 * páginas públicas, para no listar nada que luego responda 404.
 *
 * Cacheadas una hora, como el propio sitemap. Un fallo deja la lista vacía
 * esa vez (el sitemap sale con el resto) y se reintenta al revalidar.
 */
export type EntradaSitemap = { clave: string; modificado: string | null }

export async function leerObrasPublicadas(): Promise<EntradaSitemap[]> {
  const cliente = clienteAnonimo()
  const { data, error } = await leerTodasLasPaginas<{ slug: string | null; updated_at: string | null }>((desde, hasta) =>
    cliente
      .from('works')
      .select('slug, updated_at')
      .eq('is_published', true)
      .is('deleted_at', null)
      .not('slug', 'is', null)
      .order('slug', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, hasta),
  )
  if (error) throw new Error(`sitemap: no se pudieron leer las obras: ${error.message}`)
  return data.filter(o => !!o.slug).map(o => ({ clave: o.slug as string, modificado: o.updated_at }))
}

export async function leerConvocatoriasPublicadas(): Promise<EntradaSitemap[]> {
  const cliente = clienteAnonimo()
  const { data, error } = await leerTodasLasPaginas<{ id: string; updated_at: string | null }>((desde, hasta) =>
    cliente
      .from('calls')
      .select('id, updated_at')
      .eq('estado', 'publicado')
      .is('deleted_at', null)
      .order('id', { ascending: true })
      .range(desde, hasta),
  )
  if (error) throw new Error(`sitemap: no se pudieron leer las convocatorias: ${error.message}`)
  return data.map(c => ({ clave: c.id, modificado: c.updated_at }))
}

const obrasCacheadas = unstable_cache(leerObrasPublicadas, ['sitemap-obras'], { revalidate: 3600, tags: ['obras'] })
const convocatoriasCacheadas = unstable_cache(leerConvocatoriasPublicadas, ['sitemap-convocatorias'], { revalidate: 3600, tags: ['convocatorias'] })

async function oVacio(lectura: () => Promise<EntradaSitemap[]>): Promise<EntradaSitemap[]> {
  try {
    return await lectura()
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    return []
  }
}

export const obrasPublicadas = () => oVacio(obrasCacheadas)
export const convocatoriasPublicadas = () => oVacio(convocatoriasCacheadas)

/**
 * Portadas de sección públicas, con su prioridad. No entran las que piden
 * sesión (ScenaIA, panel, administración) ni las páginas legales.
 */
export const SECCIONES_SITEMAP: { ruta: string; frecuencia: 'daily' | 'weekly' | 'monthly'; prioridad: number }[] = [
  { ruta: '/obras', frecuencia: 'weekly', prioridad: 0.9 },
  { ruta: '/directorio', frecuencia: 'daily', prioridad: 0.9 },
  { ruta: '/convocatoria', frecuencia: 'daily', prioridad: 0.8 },
  { ruta: '/castings', frecuencia: 'daily', prioridad: 0.8 },
  { ruta: '/cartelera', frecuencia: 'daily', prioridad: 0.7 },
  { ruta: '/noticias', frecuencia: 'daily', prioridad: 0.7 },
  { ruta: '/formacion', frecuencia: 'weekly', prioridad: 0.6 },
  { ruta: '/mediateca', frecuencia: 'weekly', prioridad: 0.6 },
  { ruta: '/colaboradores', frecuencia: 'monthly', prioridad: 0.4 },
  { ruta: '/precios', frecuencia: 'monthly', prioridad: 0.5 },
  { ruta: '/app', frecuencia: 'monthly', prioridad: 0.3 },
]
