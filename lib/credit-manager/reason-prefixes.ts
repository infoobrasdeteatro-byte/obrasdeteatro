/**
 * Cuatro prefijos deterministas y mutuamente excluyentes -- distinguen, sin
 * anadir ningun campo al contrato ya congelado de AuthorizationContext:
 *  - NO_APLICA: no habia ninguna operacion economica que autorizar (needsAI=false).
 *  - VERIFICADO: se verifico contra Accounting Engine y hay fondos reales.
 *  - SIN_DATOS_VERIFICABLES: no se llego a verificar por falta de un dato de entrada (IA-001/IA-004).
 *  - VERIFICACION_NEGATIVA: se verifico contra Accounting Engine y no hay fondos suficientes.
 */
const REASON_PREFIXES = {
  NO_APLICA: 'NO_APLICA',
  VERIFICADO: 'VERIFICADO',
  SIN_DATOS_VERIFICABLES: 'SIN_DATOS_VERIFICABLES',
  VERIFICACION_NEGATIVA: 'VERIFICACION_NEGATIVA',
} as const

export type ReasonPrefix = keyof typeof REASON_PREFIXES

export function formatReason(prefix: ReasonPrefix, detail: string): string {
  return `${REASON_PREFIXES[prefix]}: ${detail}`
}
