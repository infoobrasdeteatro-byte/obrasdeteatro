import type { ExecutionAudit } from '@/lib/ai-gateway'

export type { ExecutionAudit }

export interface TechnicalMetricSummary {
  readonly name: string
  readonly count: number
  readonly min: number
  readonly max: number
  readonly average: number
}

export interface TechnicalTrace {
  readonly profileId: string
  readonly metrics: TechnicalMetricSummary[]
  readonly generatedAt: string
}

/**
 * Contexto tecnico de una ejecucion concreta de proveedor. Permite
 * distinguir las dos ejecuciones que puede tener un mismo turno -- la del
 * resolutor de vocabulario y la de la respuesta -- que hasta ahora
 * producian metricas indistinguibles entre si.
 */
export interface ExecutionTraceContext {
  readonly requestId: string
  readonly stage: 'resolver' | 'response'
}

/**
 * Lo que ScenaIA entendio, recupero y respondio en un turno. Solo
 * vocabulario cerrado del sistema y recuentos: ningun texto de la persona
 * ni del modelo (ver record-turn-metrics.ts).
 */
export interface TurnObservation {
  /** `NormalizedRequest.requestId` -- correlaciona todas las metricas del turno. */
  readonly requestId: string
  readonly domains: readonly string[]
  readonly isContinuation: boolean
  readonly resolvedTerms: readonly string[]
  readonly retrievedEntityCount: number
  readonly knowledgeConfidence: number
  /** Se cubrio algun dominio y aun asi no habia nada que ofrecer. */
  readonly isEmptyResult: boolean
  readonly responseType: string
  readonly durationMs: number
}
