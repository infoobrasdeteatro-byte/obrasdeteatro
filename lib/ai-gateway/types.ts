/**
 * Alcanzables en esta version (todas describen por que NO se ejecuto nada):
 *   - NO_AUTORIZADO: AuthorizationStatus distinto de AUTHORIZED.
 *   - NO_REQUERIDO: DecisionContext.needsAI es false (guarda defensiva).
 *   - SIN_PROVEEDOR: sin integracion tecnica real de proveedores (IA-006).
 *
 * Reservados para una futura integracion real, ningun codigo de esta
 * version los produce todavia:
 *   - EJECUTADO: la llamada al proveedor se completo con exito.
 *   - ERROR_COMUNICACION: timeout o fallo de comunicacion con el proveedor.
 * (mismo tratamiento ya validado para ProfessionalContextLevel.FULL en PCE:
 * valor reconocido por el tipo, no alcanzable hoy, documentado como tal.)
 */
export type ExecutionStatus = 'EJECUTADO' | 'ERROR_COMUNICACION' | 'NO_AUTORIZADO' | 'NO_REQUERIDO' | 'SIN_PROVEEDOR'

export interface AIExecutionResult {
  readonly executionStatus: ExecutionStatus
  readonly generatedContent: string | null
  readonly executionWarnings: string[]
  readonly executionTimestamp: string
}

/**
 * Se produce siempre, en paralelo a AIExecutionResult -- incluso cuando no
 * hay ejecucion real (toda esta version). Los campos tecnicos son `null`
 * cuando no aplican, nunca se omiten ni se sustituyen por un valor
 * inventado. Fuera del flujo funcional (SC-004.7): no lo consume Response
 * Composer, no se muestra al usuario. AI Gateway lo produce y lo devuelve
 * como valor -- no lo entrega activamente a ningun consumidor (IA-007: la
 * responsabilidad de iniciar la liquidacion de Accounting Engine a partir
 * de este objeto no esta asignada a AI Gateway ni a ningun componente).
 */
export interface ExecutionAudit {
  readonly providerIdentifier: string | null
  readonly providerModel: string | null
  readonly executionLatencyMs: number | null
  readonly tokensConsumed: number | null
  readonly realExecutionCost: number | null
  readonly technicalMetadata: string | null
}
