/**
 * Destacados de la cartelera: cuentas del cupo y orden de la portada.
 * Funciones puras (sin red); el cupo de verdad lo comprueba la base
 * (cartelera_destacar), esto solo sirve para enseñarlo.
 */

export type Destacado = { id: string; espectaculo_id: string; desde: string; hasta: string; origen: string }

/** Semanas del plan gastadas en un mes («AAAA-MM»), contando por el primer día de cada semana. */
export function semanasUsadas(destacados: Destacado[], mes: string): number {
  return destacados.filter(d => d.origen === 'plan' && d.desde.slice(0, 7) === mes).length
}

/** Lo que tiene un espectáculo: la semana en curso (si hay) y las que vienen. */
export function destacadosDe(destacados: Destacado[], espectaculoId: string, hoy: string): { enCurso: Destacado | null; proximos: Destacado[] } {
  const suyos = destacados.filter(d => d.espectaculo_id === espectaculoId && d.hasta >= hoy).sort((a, b) => a.desde.localeCompare(b.desde))
  return { enCurso: suyos.find(d => d.desde <= hoy) ?? null, proximos: suyos.filter(d => d.desde > hoy) }
}

/** Día que propone el selector: el de la próxima función si cae en los próximos 60 días; si no, hoy. */
export function diaSugerido(proximaDia: string | null, hoy: string, maxDia: string): string {
  return proximaDia && proximaDia >= hoy && proximaDia <= maxDia ? proximaDia : hoy
}

/** «17 oct» a partir de «AAAA-MM-DD». */
export function diaCorto(dia: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${dia}T12:00:00Z`)).replace(/\./g, '')
}

export const MAX_DESTACADOS_PORTADA = 4

/** Número estable a partir de un texto (para rotar sin aleatorio). */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/**
 * Orden de la franja de la portada: primero hasta `maxDest` destacados (los
 * del ámbito «portada», puestos por moderación, van delante; si hay más de
 * los que caben, rotan según `semilla`, p. ej. la hora), y después el resto
 * por fecha. `fichas` ya viene ordenado por fecha.
 */
export function ordenPortada<T extends { id: string }>(
  fichas: T[], ambitos: Map<string, string[]>, semilla: string, max = 8, maxDest = MAX_DESTACADOS_PORTADA,
): { fichas: T[]; destacados: Set<string> } {
  const dest = fichas.filter(f => ambitos.has(f.id))
  const prioridad = (f: T) => (ambitos.get(f.id)!.includes('portada') ? 0 : 1)
  const elegidos = [...dest]
    .sort((a, b) => prioridad(a) - prioridad(b) || hash(semilla + a.id) - hash(semilla + b.id))
    .slice(0, maxDest)
  const ids = new Set(elegidos.map(f => f.id))
  const resto = fichas.filter(f => !ids.has(f.id))
  return { fichas: [...elegidos, ...resto].slice(0, max), destacados: ids }
}
