import type { EstimatedComplexity } from '@/lib/request-interpreter'

export type ExecutionMode = 'DIRECTO' | 'IA'

/** Alias directo de EstimatedComplexity: PriorityLevel se deriva 1:1 de ella (ver priority.ts), sin taxonomia propia. */
export type PriorityLevel = EstimatedComplexity

/**
 * RecommendedAgent/ExecutionPolicy siguen siempre `null`: ningun documento
 * congelado los define, fuera del alcance de IA-006. RecommendedProvider
 * se selecciona exclusivamente del catalogo oficial de proveedores de IA
 * (Decision de Direccion, cierre de IA-006) -- ver recommended-provider.ts;
 * `null` hoy porque el catalogo esta vacio.
 */
export interface ExecutionStrategy {
  readonly executionMode: ExecutionMode
  readonly recommendedAgent: string | null
  readonly recommendedProvider: string | null
  readonly priorityLevel: PriorityLevel
  readonly executionPolicy: string | null
}

/**
 * estimatedCost: unidad interna ScenaIA, estrategia inicial fija de IA-004
 * (Complemento al Plan Tecnico, aprobado por Decision de Direccion
 * 2026-07-21) -- ver estimated-cost.ts. `null` unicamente cuando
 * needsAI=false (no aplica ninguna operacion economica).
 */
export interface DecisionContext {
  readonly executionStrategy: ExecutionStrategy
  readonly needsAI: boolean
  readonly estimatedCost: number | null
  readonly decisionConfidence: number
  readonly decisionRationale: string
}
