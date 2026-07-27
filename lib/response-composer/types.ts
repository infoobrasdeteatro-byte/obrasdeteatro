/**
 * Alcanzables en esta version:
 *   - RESPONSE_DENIED: AuthorizationContext.authorizationStatus === 'DENIED'.
 *   - RESPONSE_DIRECT: DecisionContext.needsAI === false. `responseContent`
 *     es el `directContent` recibido (IA-008, Plan Tecnico aprobado
 *     2026-07-22) -- `null` solo cuando ese contenido no esta disponible.
 *   - RESPONSE_ERROR: AIExecutionResult en cualquier estado de "no
 *     ejecutado", o ningun caso anterior aplica (degradacion segura por
 *     defecto, nunca una excepcion).
 *
 * Reservados para cuando exista integracion real de proveedores de IA
 * (IA-006) -- ningun codigo de esta version los produce todavia:
 *   - RESPONSE_SUCCESS: AIExecutionResult.executionStatus === 'EJECUTADO' sin advertencias.
 *   - RESPONSE_PARTIAL: igual, pero con advertencias de ejecucion.
 * (mismo tratamiento ya validado para ExecutionStatus.EJECUTADO en AI
 * Gateway y ProfessionalContextLevel.FULL en el PCE: valores reconocidos
 * por el tipo, no alcanzables hoy, documentados como tales.)
 */
export type ResponseType = 'RESPONSE_SUCCESS' | 'RESPONSE_DIRECT' | 'RESPONSE_DENIED' | 'RESPONSE_PARTIAL' | 'RESPONSE_ERROR'

/**
 * Se produce siempre, en toda invocacion de composeResponse(), sin
 * excepcion -- ninguna rama puede terminar sin devolver un ResponseContext
 * valido (garantia explicita de gobernanza, 2026-07-16).
 */
export interface ResponseContext {
  readonly responseType: ResponseType
  readonly responseContent: string | null
  readonly responseMetadata: Record<string, string>
  readonly responseWarnings: string[]
  readonly responseTimestamp: string
}
