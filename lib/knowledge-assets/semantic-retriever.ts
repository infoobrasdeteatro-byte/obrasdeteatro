import { listPublishedWorkAuthors } from '@/lib/repository-layer'
import { listWorkKnowledge } from './works-knowledge'
import { listOrganizationKnowledge } from './organizations-knowledge'
import { interpretWorkQuery } from './interpret-work-query'
import type { KnowledgeDomain, StructuredKnowledgeItem } from './types'

/**
 * Contrato interno de recuperacion semantica (IA-003, Plan Tecnico
 * aprobado 2026-07-22). Nunca se exporta fuera de este modulo -- Knowledge
 * Assets es el unico responsable de proporcionar conocimiento al resto del
 * sistema (Decision de Direccion, Punto 4). La interfaz garantiza
 * estabilidad de contrato, no la existencia de relevancia: la ordenacion
 * por relevancia depende de las capacidades de la implementacion concreta.
 */
export interface SemanticRetriever {
  retrieve(domain: KnowledgeDomain, query: string, limit?: number): Promise<StructuredKnowledgeItem[]>
}

/**
 * Implementacion base (v1): sin tecnologia de recuperacion semantica real
 * (embeddings/vectores/RAG). Para Obras, `query` ya se usa desde
 * SCENAIA-002C -- se interpreta mediante reglas declarativas sobre el
 * modelo relacional existente (ADR SCENAIA-002C.1), nunca mediante IA.
 * Organizaciones sigue degradando a la misma enumeracion de siempre,
 * ignorando `query` (sin motor propio todavia). Nunca lanza excepcion.
 * Sustituible en el futuro por una implementacion tecnologica real sin
 * cambiar esta interfaz (independencia tecnologica, Decision de Direccion,
 * Puntos 2 y 3).
 */
async function baseRetrieve(
  domain: KnowledgeDomain,
  query: string,
  limit?: number
): Promise<StructuredKnowledgeItem[]> {
  switch (domain) {
    case 'Obras': {
      const knownAuthors = await listPublishedWorkAuthors()
      console.log('[DIAG-CASO2] query:', JSON.stringify(query))
      console.log('[DIAG-CASO2] knownAuthors:', JSON.stringify(knownAuthors))
      const criteria = interpretWorkQuery(query, knownAuthors)
      console.log('[DIAG-CASO2] criteria:', JSON.stringify(criteria))
      const items = await listWorkKnowledge(criteria, limit)
      console.log(
        '[DIAG-CASO2] items:',
        JSON.stringify(items.map((item) => ({ title: item.data.title, author: item.data.author })))
      )
      return items
    }
    case 'Organizaciones':
      return listOrganizationKnowledge(limit)
    default:
      return []
  }
}

const baseSemanticRetriever: SemanticRetriever = { retrieve: baseRetrieve }

/**
 * Unico punto de acceso publico a la capacidad de recuperacion semantica.
 * Delega en la implementacion activa (base, v1) sin exponerla.
 */
export async function retrieveRelevantKnowledge(
  domain: KnowledgeDomain,
  query: string,
  limit?: number
): Promise<StructuredKnowledgeItem[]> {
  return baseSemanticRetriever.retrieve(domain, query, limit)
}
