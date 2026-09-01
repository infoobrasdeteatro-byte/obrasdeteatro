export type AuthorizationStatus = 'AUTHORIZED' | 'DENIED'

/**
 * Causa de una denegacion, en forma legible por maquina (Bloque 5).
 *
 * `authorizationReason` es texto para un humano que audita: lleva las
 * cifras exactas del presupuesto y cambia cuando cambian. Decidir sobre el
 * exigiria compararlo por substring, que es precisamente la convencion
 * implicita que PRD-001 prohibe. Este codigo es el estado del dominio.
 *
 * Los tres valores corresponden UNO A UNO con las tres ramas de denegacion
 * que existen hoy en `buildAuthorizationContext` -- ninguno es preventivo:
 *
 *  - `insufficient_ai_credits`: se verifico contra el presupuesto del
 *    periodo y no hay cupo para esta operacion. Es la unica denegacion que
 *    significa "cuota de IA agotada", y la unica que un mensaje de producto
 *    puede traducir a "Has alcanzado tu cuota de IA". Un plan sin techo no
 *    puede producirla.
 *  - `plan_quota_unknown`: no se sabe que cuota tiene este usuario. No es
 *    cuota agotada -- es ausencia de dato, y el usuario no ha consumido
 *    nada.
 *  - `estimated_cost_unknown`: no se pudo estimar el coste. Tampoco es
 *    consumo: no se llego a verificar presupuesto alguno.
 *
 * Confundirlos haria que un fallo de datos se le contase al usuario como
 * cuota agotada, y le empujase a pagar por algo que no ha gastado.
 */
export type DenialCode = 'insufficient_ai_credits' | 'plan_quota_unknown' | 'estimated_cost_unknown'

/**
 * availableCredits/estimatedCost/remainingQuota son `null` salvo en los
 * casos donde realmente se verifico algo (VERIFICADO / VERIFICACION_NEGATIVA)
 * -- nunca se sustituyen por 0 cuando lo correcto es "no disponible".
 */
export interface AuthorizationContext {
  readonly authorizationStatus: AuthorizationStatus
  readonly authorizationReason: string
  /**
   * Causa de la denegacion cuando la hubo; `null` siempre que
   * `authorizationStatus` sea AUTHORIZED. No sustituye a
   * `authorizationReason`: la razon explica, el codigo clasifica.
   */
  readonly denialCode: DenialCode | null
  /**
   * Reserva economica creada por esta autorizacion, cuando la hubo. `null`
   * en todos los demas casos: plan ilimitado (no consume cupo), peticion
   * que no requiere IA, o autorizacion denegada.
   *
   * Explicito en el contrato por PRD-001: quien deba cerrar el ciclo
   * economico -- liquidar o liberar -- necesita saber QUE reserva cerrar, y
   * ese dato no puede deducirse de ningun otro campo.
   */
  readonly reservationId: string | null
  readonly availableCredits: number | null
  readonly estimatedCost: number | null
  readonly remainingQuota: number | null
  readonly timestamp: string
}
