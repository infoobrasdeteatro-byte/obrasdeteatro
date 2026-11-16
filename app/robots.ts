import type { MetadataRoute } from 'next'
import { SITIO } from '@/lib/convocatorias/resumen-semanal'

/**
 * /robots.txt. Todo el sitio público es rastreable; se excluyen las zonas
 * privadas (piden sesión y solo devolverían la pantalla de acceso), la API y
 * las rutas de autenticación. Indica dónde está el mapa del sitio.
 *
 * Esto orienta a los buscadores, no protege nada: el acceso a esas zonas lo
 * controlan el middleware y los permisos de la base de datos.
 */
export const RUTAS_NO_RASTREABLES = [
  '/admin',
  '/api/',
  '/auth/',
  '/dashboard',
  '/cuenta',
  // «/perfil» a secas es el editor del perfil propio; las fichas públicas
  // (/perfil/[slug]) sí se rastrean. El $ ancla el final de la ruta.
  '/perfil$',
  '/perfil/centro',
  '/perfil/bloque',
  '/mis-',
  // Enlaces personales de invitación y referido.
  '/r/',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: RUTAS_NO_RASTREABLES }],
    sitemap: `${SITIO}/sitemap.xml`,
    host: SITIO,
  }
}
