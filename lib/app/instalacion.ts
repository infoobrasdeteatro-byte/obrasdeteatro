/**
 * Instalación de la web como aplicación (ver app/manifest.ts).
 *
 * Lógica pura, sin React: qué puede hacer este navegador para instalar la web.
 * La parte de navegador (eventos, almacenamiento) vive en
 * components/app/useInstalacion.ts.
 */

/**
 * - instalada:  ya se está usando como aplicación (pantalla completa).
 * - disponible: el navegador ofrece instalarla con un toque (Chrome, Edge…).
 * - ios:        iPhone o iPad; se instala a mano desde el botón de compartir.
 * - manual:     el resto; se instala desde el menú del navegador.
 */
export type EstadoInstalacion = 'instalada' | 'disponible' | 'ios' | 'manual'

export interface EntornoInstalacion {
  /** display-mode: standalone, o navigator.standalone en iOS. */
  enPantallaCompleta: boolean
  /** El navegador ha lanzado beforeinstallprompt y lo tenemos guardado. */
  hayAvisoDelNavegador: boolean
  userAgent: string
  /** navigator.platform y maxTouchPoints: el iPad se presenta como un Mac. */
  plataforma: string
  puntosTactiles: number
}

export function esIOS(userAgent: string, plataforma: string, puntosTactiles: number): boolean {
  if (/iphone|ipad|ipod/i.test(userAgent)) return true
  return plataforma === 'MacIntel' && puntosTactiles > 1
}

export function estadoInstalacion(e: EntornoInstalacion): EstadoInstalacion {
  if (e.enPantallaCompleta) return 'instalada'
  if (e.hayAvisoDelNavegador) return 'disponible'
  if (esIOS(e.userAgent, e.plataforma, e.puntosTactiles)) return 'ios'
  return 'manual'
}

/** Clave de localStorage: el usuario cerró la tarjeta de su panel. */
export const CLAVE_TARJETA_OCULTA = 'odt-instalar-oculta'

/** Ruta de la página de ayuda. */
export const RUTA_APP = '/app'
