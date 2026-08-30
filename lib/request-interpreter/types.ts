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
  /**
   * Texto sobre el que se ejecuta la recuperacion de conocimiento. Coincide
   * con `normalizedIntent` en todo turno que nombra su propio dominio. Solo
   * difiere en un turno de continuacion -- aquel que por si mismo no nombra
   * ningun dominio -- donde incorpora los turnos previos del usuario para
   * que la peticion siga siendo interpretable en su contexto. Campo
   * explicito por PRD-001: el estado "esta peticion se interpreta sobre la
   * conversacion" se representa en el contrato, nunca por convencion
   * implicita sobre otro campo.
   */
  retrievalQuery: string
  requestType: RequestType
  requestedKnowledgeDomains: KnowledgeDomain[]
  estimatedComplexity: EstimatedComplexity
  professionalContextLevel: ProfessionalContextLevel
  detectedAmbiguities: string[]
  interpretationConfidence: number
  timestamp: string
}
