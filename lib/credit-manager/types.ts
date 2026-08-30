export type AuthorizationStatus = 'AUTHORIZED' | 'DENIED'

/**
 * availableCredits/estimatedCost/remainingQuota son `null` salvo en los
 * casos donde realmente se verifico algo (VERIFICADO / VERIFICACION_NEGATIVA)
 * -- nunca se sustituyen por 0 cuando lo correcto es "no disponible".
 */
export interface AuthorizationContext {
  readonly authorizationStatus: AuthorizationStatus
  readonly authorizationReason: string
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
