import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { KnowledgeCompleteness, KnowledgeContext } from './types'
import { isDomainCovered } from './domain-coverage'
import { retrieveKnowledgeForDomain } from './retrieve-knowledge'
import { buildKnowledgeSummary } from './summary'

function estimateCompleteness(requestedCount: number, coveredCount: number): KnowledgeCompleteness {
  if (requestedCount === 0 || coveredCount === 0) return 'vacio'
  return coveredCount === requestedCount ? 'completo' : 'parcial'
}

function completenessToConfidence(completeness: KnowledgeCompleteness): number {
  if (completeness === 'completo') return 1
  if (completeness === 'parcial') return 0.5
  return 0
}

/**
 * Unico punto de entrada del SKM (SC-004.3). ProfessionalContext no forma
 * parte de la interfaz publica en esta version -- ningun comportamiento
 * depende de el todavia (aprobado por la Direccion, 2026-07-16); su
 * consumo futuro para personalizar la recuperacion queda como evolucion
 * posterior, fuera del alcance actual. Objeto efimero: se construye de
 * nuevo en cada invocacion, nunca se cachea ni se reutiliza.
 */
export async function buildKnowledgeContext(normalizedRequest: NormalizedRequest): Promise<KnowledgeContext> {
  // Deduplicado defensivo: NormalizedRequest no garantiza unicidad a nivel de
  // tipos, aunque el unico productor actual (Request Interpreter) nunca la
  // viola -- evita recuperar el mismo dominio dos veces si eso cambiara.
  const requestedDomains = [...new Set(normalizedRequest.requestedKnowledgeDomains)]
  const coveredDomains = requestedDomains.filter(isDomainCovered)
  const notCoveredDomains = requestedDomains.filter((domain) => !isDomainCovered(domain))

  const entitiesByDomain = await Promise.all(coveredDomains.map((domain) => retrieveKnowledgeForDomain(domain)))
  const knowledgeEntities = entitiesByDomain.flat()

  const knowledgeLimitations = notCoveredDomains.map(
    (domain) => `dominio ${domain} solicitado pero no cubierto por Knowledge Assets en esta version`
  )
  if (coveredDomains.length > 0) {
    knowledgeLimitations.push(
      'los dominios cubiertos se enumeran sin relevancia ni relacion con el texto de la peticion -- sin motor de busqueda (IA-003)'
    )
  }

  const knowledgeCompleteness = estimateCompleteness(requestedDomains.length, coveredDomains.length)

  return {
    knowledgeSummary: buildKnowledgeSummary(requestedDomains, coveredDomains, knowledgeEntities),
    knowledgeDomains: coveredDomains,
    knowledgeEntities,
    knowledgeRelations: null,
    knowledgeConfidence: completenessToConfidence(knowledgeCompleteness),
    knowledgeCompleteness,
    knowledgeLimitations,
    knowledgeTimestamp: new Date().toISOString(),
  }
}
