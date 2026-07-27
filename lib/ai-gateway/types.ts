import type { DecisionContext } from '@/lib/decision-engine'
import type { AuthorizationContext } from '@/lib/credit-manager'

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

/**
 * Ampliacion controlada del contrato de entrada (Aprobacion de Direccion,
 * IA-OPENAI-002, 2026-07-23). Construido exclusivamente por el Orquestador,
 * reutilizando el `NormalizedRequest` ya existente en su ambito local --
 * ningun objeto intermedio del Nucleo lo transporta ni lo modifica.
 * Completamente agnostico de proveedor: ningun identificador de proveedor,
 * modelo, SDK ni estructura especifica de ningun proveedor concreto.
 */
export interface NormalizedAIRequest {
  readonly userPrompt: string
}

/**
 * Unico parametro de entrada de `executeAIRequest()` (Aprobacion de
 * Direccion, IA-OPENAI-002). `decisionContext` y `authorizationContext`
 * mantienen exactamente su semantica ya congelada -- esta ampliacion no la
 * modifica, solo agrupa las tres entradas en un unico objeto.
 */
export interface AIExecutionInput {
  readonly decisionContext: DecisionContext
  readonly authorizationContext: AuthorizationContext
  readonly normalizedAIRequest: NormalizedAIRequest
}
