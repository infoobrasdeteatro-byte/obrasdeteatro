/**
 * Google Analytics 4. Lógica pura del consentimiento; la carga del script
 * está en components/Analitica.tsx.
 *
 * Solo se mide a quien ha aceptado las cookies analíticas en el aviso de
 * cookies (components/CookieBanner.jsx), y solo si lo aceptó cuando el aviso
 * ya decía que se usa Google Analytics: un «aceptar» anterior se dio leyendo
 * «hoy no utilizamos cookies analíticas» y no vale como consentimiento.
 */

/** ID de medición del flujo web (público: viaja en el HTML de cada página). */
export const GA_ID = 'G-EM80JBEPP6'

/**
 * Momento desde el que el aviso de cookies informa de Google Analytics.
 * Los consentimientos guardados antes se vuelven a pedir.
 */
export const ANALITICA_DESDE = '2026-11-16T00:00:00.000Z'

/** Evento que lanza el aviso de cookies al guardar una elección. */
export const EVENTO_COOKIES = 'odt:cookies'

/** ¿Hay que volver a mostrar el aviso? Sin fecha, o anterior a ANALITICA_DESDE. */
export function consentimientoAnterior(fecha: string | null): boolean {
  if (!fecha) return true
  const t = Date.parse(fecha)
  return Number.isNaN(t) || t < Date.parse(ANALITICA_DESDE)
}

/**
 * ¿Ha consentido las cookies analíticas, sabiendo que existen?
 * `preferencias` y `fecha` son los valores crudos de localStorage.
 */
export function analiticaConsentida(preferencias: string | null, fecha: string | null): boolean {
  if (!preferencias || consentimientoAnterior(fecha)) return false
  try {
    return (JSON.parse(preferencias) as { analytics?: unknown }).analytics === true
  } catch {
    return false
  }
}
