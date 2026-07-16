import type { KnowledgeDomain } from '@/lib/knowledge-assets'

/**
 * Senal puramente mecanica sobre el propio proceso de interpretacion: si la
 * tabla de reglas de Request Interpreter encontro o no una coincidencia.
 * No es una taxonomia de negocio (ver aclaracion de gobernanza, R-01/plan
 * tecnico de Request Interpreter): esa clasificacion queda diferida.
 */
export type RequestType = 'RECONOCIDA' | 'NO_RECONOCIDA'

/**
 * FULL nunca se produce en esta implementacion: afirmar "contexto completo
 * disponible" exige conocer que contiene el PCE, y Request Interpreter no
 * accede al PCE (ADR-001). Vacio diferido, no bloqueante.
 */
export type ProfessionalContextLevel = 'MINIMAL' | 'STANDARD' | 'FULL'

export type EstimatedComplexity = 'baja' | 'media' | 'alta'

export interface NormalizedRequest {
  requestId: string
  originalRequest: string
  normalizedIntent: string
  requestType: RequestType
  requestedKnowledgeDomains: KnowledgeDomain[]
  estimatedComplexity: EstimatedComplexity
  professionalContextLevel: ProfessionalContextLevel
  detectedAmbiguities: string[]
  interpretationConfidence: number
  timestamp: string
}
