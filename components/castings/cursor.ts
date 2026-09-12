/**
 * Cursor de paginación keyset, compartido por la bandeja del organizador y la
 * pantalla de postulaciones del actor. Las dos paginan por
 * (applied_at desc, id desc), así que codifican y leen lo mismo.
 *
 * Viaja en la URL en base64url: la página es enlazable y compartible, y el
 * cursor no queda como un par de parámetros sueltos invitando a que alguien
 * los toque a mano.
 */

export type Cursor = { appliedAt: string; id: string }

export function leerCursor(valor?: string): Cursor | null {
  if (!valor) return null
  try {
    const [appliedAt, id] = Buffer.from(valor, 'base64url').toString('utf8').split('|')
    return appliedAt && id ? { appliedAt, id } : null
  } catch {
    // Un cursor manipulado o truncado no es un error: es simplemente ausencia
    // de cursor, y la página vuelve a empezar por el principio.
    return null
  }
}

export function escribirCursor(appliedAt: string, id: string): string {
  return Buffer.from(`${appliedAt}|${id}`, 'utf8').toString('base64url')
}
