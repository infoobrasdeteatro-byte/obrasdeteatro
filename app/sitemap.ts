import type { MetadataRoute } from 'next'
import { SITIO } from '@/lib/convocatorias/resumen-semanal'
import { espaciosPublicados } from '@/lib/espacios/datos'
import { municipiosConEspacios, rutaFicha, rutaMunicipio } from '@/lib/espacios/espacios'

/**
 * /sitemap.xml. Hasta ahora el proyecto no tenía sitemap; nace con la
 * portada y el catálogo de espacios escénicos (buscador, fichas publicadas y
 * páginas por municipio con al menos un espacio publicado). El resto de
 * secciones se añadirán aquí cuando Dirección lo decida.
 *
 * Si la lectura falla (o la tabla aún no existe, durante el build de un
 * preview antes de aplicar la migración), salen solo las entradas fijas y se
 * vuelve a intentar al revalidar, cada hora: un fallo no rompe el build.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const espacios = await espaciosPublicados()

  return [
    { url: SITIO, changeFrequency: 'daily', priority: 1 },
    { url: `${SITIO}/espacios`, changeFrequency: 'weekly', priority: 0.8 },
    ...municipiosConEspacios(espacios).map(m => ({
      url: `${SITIO}${rutaMunicipio(m.pais_code, m.municipio_slug)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...espacios.map(e => ({
      url: `${SITIO}${rutaFicha(e.slug)}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ]
}
