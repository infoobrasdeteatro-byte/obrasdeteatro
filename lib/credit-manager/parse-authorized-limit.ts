/**
 * Representacion explicita de un limite ya autorizado (IA-AUTH-001,
 * PRD-001) -- union discriminada, mismo patron ya usado en Accounting
 * Engine (ReservationOutcome). Sustituye la representacion implicita que
 * `Infinity` habria supuesto para "sin limite".
 */
export type AuthorizedLimit = { readonly kind: 'LIMITADO'; readonly value: number } | { readonly kind: 'ILIMITADO' }

const UNLIMITED_MARKER = 'ILIMITADO'

/**
 * Acepta cadenas numericas planas, o el literal exacto 'ILIMITADO'
 * (IA-AUTH-001, PRD-001) -- unica codificacion que Credit Manager sabe
 * interpretar hoy, no la que se presupone definitiva. Cualquier otra
 * representacion (p.ej. nombre de plan como "premium") deniega de forma
 * segura hasta que este componente se actualice para entenderla -- no se
 * intenta adivinar el formato.
 */
export function parseAuthorizedLimit(usageLimits: string | null): AuthorizedLimit | null {
  // Number('') y Number('   ') se coaccionan a 0 en JavaScript -- una cadena
  // vacia no es un limite real de "cero", es ausencia de dato, igual que null.
  if (usageLimits === null || usageLimits.trim() === '') return null
  if (usageLimits.trim() === UNLIMITED_MARKER) return { kind: 'ILIMITADO' }
  const parsed = Number(usageLimits)
  return Number.isFinite(parsed) && parsed >= 0 ? { kind: 'LIMITADO', value: parsed } : null
}
