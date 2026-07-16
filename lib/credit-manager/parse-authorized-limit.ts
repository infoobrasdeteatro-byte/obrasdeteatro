/**
 * Acepta unicamente cadenas numericas planas -- la unica codificacion que
 * Credit Manager sabe interpretar hoy, no la que se presupone definitiva.
 * Cualquier otra representacion futura de IA-001 (p.ej. nombre de plan como
 * "premium") tambien deniega de forma segura hasta que este componente se
 * actualice para entenderla -- no se intenta adivinar el formato.
 */
export function parseAuthorizedLimit(usageLimits: string | null): number | null {
  // Number('') y Number('   ') se coaccionan a 0 en JavaScript -- una cadena
  // vacia no es un limite real de "cero", es ausencia de dato, igual que null.
  if (usageLimits === null || usageLimits.trim() === '') return null
  const parsed = Number(usageLimits)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}
