/**
 * Formateadores de presentación compartidos por los módulos que publican
 * contenido con fecha y lugar (Castings, Convocatorias).
 *
 * Son funciones puras y sin dominio: no saben de qué tabla viene el dato. Por
 * eso viven aquí y no en components/castings/publico.tsx, donde nacieron.
 *
 * El criterio común a las dos: la AUSENCIA de dato se dice, no se disimula.
 * Un guion largo es una respuesta; una cadena vacía no lo es.
 */

/** Fecha legible en español. Un valor nulo o ilegible devuelve guion. */
export function fecha(valor: string | null): string {
  if (!valor) return '—'
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Fecha con hora, para colas de moderación donde el minuto importa. */
export function fechaHora(valor: string | null): string {
  if (!valor) return '—'
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** "Madrid, España" · "Madrid" · "—". Nunca deja una coma suelta. */
export function lugar(ciudad: string | null, pais: string | null): string {
  const partes = [ciudad, pais].filter(Boolean)
  return partes.length > 0 ? partes.join(', ') : '—'
}
