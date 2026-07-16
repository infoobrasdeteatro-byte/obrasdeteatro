import type { EstimatedComplexity } from '@/lib/request-interpreter'

export type ExecutionMode = 'DIRECTO' | 'IA'

/** Alias directo de EstimatedComplexity: PriorityLevel se deriva 1:1 de ella (ver priority.ts), sin taxonomia propia. */
export type PriorityLevel = EstimatedComplexity

/**
 * RecommendedAgent/RecommendedProvider/ExecutionPolicy siempre `null` en
 * esta version: ningun documento congelado enumera agentes, proveedores ni
 * politicas de ejecucion concretas -- inventarlos repetiria el error ya
 * corregido de RequestType en Request Interpreter.
 */
export interface ExecutionStrategy {
  readonly executionMode: ExecutionMode
  readonly recommendedAgent: string | null
  readonly recommendedProvider: string | null
  readonly priorityLevel: PriorityLevel
  readonly executionPolicy: string | null
}

/**
 * estimatedCost siempre `null` en esta version -- IA-004, sin politica
 * oficial de estimacion de coste definida en ningun documento (resolucion
 * expresa de la Direccion, 2026-07-16: "no disponible", no una heuristica).
 */
export interface DecisionContext {
  readonly executionStrategy: ExecutionStrategy
  readonly needsAI: boolean
  readonly estimatedCost: number | null
  readonly decisionConfidence: number
  readonly decisionRationale: string
}
