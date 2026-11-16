import type { MetadataRoute } from 'next'
import { SITIO } from '@/lib/convocatorias/resumen-semanal'
import { espaciosPublicados } from '@/lib/espacios/datos'
import { municipiosConEspacios, rutaFicha, rutaMunicipio } from '@/lib/espacios/espacios'
import { perfilesPublicos } from '@/lib/perfiles/publicos'
import { SECCIONES_SITEMAP, convocatoriasPublicadas, obrasPublicadas } from '@/lib/seo/sitemap-datos'

/**
 * /sitemap.xml. Hasta ahora el proyecto no tenía sitemap; nace con la
 * portada y el catálogo de espacios escénicos (buscador, fichas publicadas y
 * páginas por municipio con al menos un espacio publicado), y después los
 * perfiles públicos (/perfil/[slug]). En noviembre de 2026 se añaden las
 * portadas de sección, las fichas de la biblioteca (/obras/[slug]) y las
 * convocatorias publicadas (/convocatoria/[id]). Noticias, cartelera,
 * formación y mediateca entran de momento solo con su portada.
 *
 * Si la lectura falla (o la tabla aún no existe, durante el build de un
 * preview antes de aplicar la migración), salen solo las entradas fijas y se
 * vuelve a intentar al revalidar, cada hora: un fallo no rompe el build.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [espacios, perfiles, obras, convocatorias] = await Promise.all([
    espaciosPublicados(),
    perfilesPublicos(),
    obrasPublicadas(),
    convocatoriasPublicadas(),
  ])

  return [
    { url: SITIO, changeFrequency: 'daily', priority: 1 },
    { url: `${SITIO}/espacios`, changeFrequency: 'weekly', priority: 0.8 },
    ...SECCIONES_SITEMAP.map(sec => ({
      url: `${SITIO}${sec.ruta}`,
      changeFrequency: sec.frecuencia,
      priority: sec.prioridad,
    })),
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
    ...perfiles.map(p => ({
      url: `${SITIO}/perfil/${encodeURIComponent(p.slug)}`,
      ...(p.updated_at ? { lastModified: p.updated_at } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...convocatorias.map(c => ({
      url: `${SITIO}/convocatoria/${encodeURIComponent(c.clave)}`,
      ...(c.modificado ? { lastModified: c.modificado } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...obras.map(o => ({
      url: `${SITIO}/obras/${encodeURIComponent(o.clave)}`,
      ...(o.modificado ? { lastModified: o.modificado } : {}),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ]
}
