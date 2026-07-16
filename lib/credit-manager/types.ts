export type AuthorizationStatus = 'AUTHORIZED' | 'DENIED'

/**
 * availableCredits/estimatedCost/remainingQuota son `null` salvo en los
 * casos donde realmente se verifico algo (VERIFICADO / VERIFICACION_NEGATIVA)
 * -- nunca se sustituyen por 0 cuando lo correcto es "no disponible".
 */
export interface AuthorizationContext {
  readonly authorizationStatus: AuthorizationStatus
  readonly authorizationReason: string
  readonly availableCredits: number | null
  readonly estimatedCost: number | null
  readonly remainingQuota: number | null
  readonly timestamp: string
}
