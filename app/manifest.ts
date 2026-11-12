import type { MetadataRoute } from 'next'

/**
 * /manifest.webmanifest. Hace que la web se pueda instalar en el móvil o en el
 * ordenador («Instalar aplicación» / «Añadir a pantalla de inicio») y que,
 * una vez instalada, se abra a pantalla completa con su icono.
 *
 * Etapa 1: solo instalación. No hay service worker ni notificaciones, así que
 * nada se guarda en caché y la versión instalada muestra siempre la web real.
 * Quien no la instala no nota ningún cambio.
 *
 * Los colores son los de la interfaz (blanco de la cabecera y --off del
 * fondo): la barra del sistema y la pantalla de arranque no desentonan.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'ObrasDeTeatro®',
    short_name: 'ObrasDeTeatro',
    description:
      'Plataforma profesional de las artes escénicas en español: obras, espacios, castings, convocatorias y profesionales de los 20 países de habla hispana.',
    lang: 'es',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fafafa',
    theme_color: '#ffffff',
    categories: ['entertainment', 'business', 'social'],
    icons: [
      { src: '/icons/app-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/app-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/app-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
