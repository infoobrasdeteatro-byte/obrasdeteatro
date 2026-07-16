import type { RequestType } from './types'

/**
 * RECONOCIDA solo declara que la propia tabla de reglas encontro al menos un
 * dominio -- no afirma ninguna categoria de negocio (ver aclaracion de
 * gobernanza del plan tecnico de Request Interpreter).
 */
export function detectRequestType(domainsFound: number): RequestType {
  return domainsFound > 0 ? 'RECONOCIDA' : 'NO_RECONOCIDA'
}
