import { listWorkKnowledge } from './works-knowledge'
import { listOrganizationKnowledge } from './organizations-knowledge'
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
 * -- degrada a la misma enumeracion por dominio ya existente, ignorando
 * `query` (ningun motor real capaz de usarla todavia). Nunca lanza
 * excepcion. Sustituible en el futuro por una implementacion tecnologica
 * real sin cambiar esta interfaz (independencia tecnologica, Decision de
 * Direccion, Puntos 2 y 3).
 */
async function baseRetrieve(
  domain: KnowledgeDomain,
  _query: string,
  limit?: number
): Promise<StructuredKnowledgeItem[]> {
  switch (domain) {
    case 'Obras':
      return listWorkKnowledge(limit)
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
