import type { KnowledgeDomain } from '@/lib/knowledge-assets'
import type { EstimatedComplexity, NormalizedRequest, ProfessionalContextLevel, RequestType } from './types'
import { normalizeText } from './normalize-text'
import { detectKnowledgeDomains } from './domain-rules'
import { detectRequestType } from './request-type-rules'

function estimateComplexity(domainsFound: number, textLength: number): EstimatedComplexity {
  if (domainsFound >= 2 || textLength > 200) return 'alta'
  if (domainsFound === 1 || textLength > 60) return 'media'
  return 'baja'
}

/**
 * FULL nunca se produce (ver types.ts): Request Interpreter no accede al PCE
 * (ADR-001) y ningun documento define un criterio textual para "contexto
 * completo disponible" independiente de lo que el PCE contiene.
 */
function estimateProfessionalContextLevel(requestType: RequestType): ProfessionalContextLevel {
  return requestType === 'NO_RECONOCIDA' ? 'MINIMAL' : 'STANDARD'
}

function detectAmbiguities(originalRequest: string, domains: KnowledgeDomain[], requestType: RequestType): string[] {
  const ambiguities: string[] = []

  if (originalRequest.trim().length === 0) {
    ambiguities.push('peticion vacia')
  }
  if (requestType === 'NO_RECONOCIDA') {
    ambiguities.push('no se reconoce ningun patron de dominio en la peticion')
  }
  if (domains.length > 1) {
    ambiguities.push('la peticion coincide con multiples dominios de conocimiento simultaneamente')
  }

  return ambiguities
}

/**
 * Un unico dominio detectado siempre implica cero ambiguedades (las tres
 * reglas de detectAmbiguities son mutuamente excluyentes con ese caso), por
 * lo que la confianza depende solo del numero de dominios encontrados.
 */
function estimateConfidence(domains: KnowledgeDomain[]): number {
  if (domains.length === 0) return 0
  if (domains.length === 1) return 1
  return 0.5
}

/**
 * Unico punto de entrada de Request Interpreter (SC-004.4): funcion pura y
 * sincrona, sin I/O -- no consulta la capa de persistencia, el contexto
 * profesional ni el conocimiento del ecosistema. `locale` y la informacion
 * de sesion son entradas disponibles segun el contrato, pero ninguna regla
 * de esta v1 depende todavia de ellas (vacio diferido: reglas multi-idioma
 * futuras).
 */
export function normalizeRequest(originalRequest: string): NormalizedRequest {
  const normalizedIntent = normalizeText(originalRequest)
  const requestedKnowledgeDomains = detectKnowledgeDomains(normalizedIntent)
  const requestType = detectRequestType(requestedKnowledgeDomains.length)
  const detectedAmbiguities = detectAmbiguities(originalRequest, requestedKnowledgeDomains, requestType)

  return {
    requestId: crypto.randomUUID(),
    originalRequest,
    normalizedIntent,
    requestType,
    requestedKnowledgeDomains,
    estimatedComplexity: estimateComplexity(requestedKnowledgeDomains.length, originalRequest.length),
    professionalContextLevel: estimateProfessionalContextLevel(requestType),
    detectedAmbiguities,
    interpretationConfidence: estimateConfidence(requestedKnowledgeDomains),
    timestamp: new Date().toISOString(),
  }
}
