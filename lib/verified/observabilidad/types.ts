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
  /**
   * Dominios que Knowledge Assets pudo cubrir realmente en este turno.
   * Fase 1: es lo unico que separa "no habia ningun dominio que consultar"
   * de "se consulto el dominio y no devolvio nada" -- dos causas opuestas
   * que hasta ahora producian el mismo `retrievedEntityCount` de cero y
   * eran indistinguibles en telemetria.
   */
  readonly coveredDomainCount: number
  readonly knowledgeConfidence: number
  /** Se cubrio algun dominio y aun asi no habia nada que ofrecer. */
  readonly isEmptyResult: boolean
  readonly responseType: string
  readonly durationMs: number
  /**
   * Desviacion de la estimacion (Bloque 4): el coste real supero lo
   * reservado. `null` cuando no ocurrio, que es lo normal.
   *
   * No es un error de la liquidacion -- el coste real es correcto y se
   * registra intacto -- sino de la ESTIMACION, que se quedo corta. Se
   * observa para poder recalibrarla; ocultarla capando el importe
   * convertiria un problema de presupuesto en contabilidad falsa.
   */
  readonly settlementAnomaly: SettlementAnomaly | null
}

export interface SettlementAnomaly {
  readonly reservationId: string
  readonly reservedCredits: number
  readonly settledCredits: number
  readonly providerIdentifier: string | null
  readonly providerModel: string | null
}
