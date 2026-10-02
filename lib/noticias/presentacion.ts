import { getCountryByCode } from '@/lib/geo/countries'

/**
 * Utilidades de presentación del módulo Noticias, compartidas por el panel y
 * la sección pública.
 */

/** Límite diario de publicaciones. Lo impone el trigger noticias_guarda(); aquí solo se muestra. */
export const LIMITE_DIARIO_NOTICIAS = 3

/**
 * Día natural en hora de Madrid ('YYYY-MM-DD'), el mismo criterio que usa el
 * trigger para el límite diario: (publicado_at at time zone 'Europe/Madrid')::date.
 */
export function diaMadrid(valor: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(valor))
}

/** Nombre del país; si el código no está en la tabla, el propio código. */
export function nombrePais(code: string | null): string {
  if (!code) return '—'
  return getCountryByCode(code)?.name ?? code
}

/** Solo http(s): lo que se pinta como enlace externo nunca es javascript: ni data:. */
export function enlaceSeguro(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}
