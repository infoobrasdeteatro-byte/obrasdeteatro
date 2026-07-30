import { listPublishedWorkAuthors } from '@/lib/repository-layer'
import { listWorkKnowledge } from './works-knowledge'
import { listOrganizationKnowledge } from './organizations-knowledge'
import { interpretWorkQuery } from './interpret-work-query'
import type { KnowledgeDomain, StructuredKnowledgeItem } from './types'

/**
 * Resultado de recuperar un dominio (SCENAIA-002, correccion definitiva de
 * Caso 1). `requestWasNarrowed` es el mismo booleano real ya calculado en el
 * momento de interpretar la peticion -- true solo cuando el motor de
 * interpretacion del dominio reconocio al menos un criterio explicito en el
 * texto y acoto la recuperacion en funcion de el (hoy, solo Obras
 * interpreta; Organizaciones y cualquier dominio sin motor propio siempre
 * devuelven false, porque nunca derivan ningun criterio del texto). Nombrado
 * de forma neutra respecto al mecanismo concreto (reglas declarativas sobre
 * WorkSearchCriteria hoy; cualquier otro mecanismo futuro manana) --
 * representa el hecho de dominio "la peticion acoto el resultado", no la
 * tecnica que lo logro. Nunca se reconstruye a partir del numero de
 * resultados en ninguna capa posterior -- Decision de Direccion, SCENAIA-002
 * Caso 1: la informacion real debe preservarse, no reinferirse.
 */
export interface KnowledgeRetrievalResult {
  readonly items: readonly StructuredKnowledgeItem[]
  readonly requestWasNarrowed: boolean
}

/**
 * Contrato interno de recuperacion semantica (IA-003, Plan Tecnico
 * aprobado 2026-07-22). Nunca se exporta fuera de este modulo -- Knowledge
 * Assets es el unico responsable de proporcionar conocimiento al resto del
 * sistema (Decision de Direccion, Punto 4). La interfaz garantiza
 * estabilidad de contrato, no la existencia de relevancia: la ordenacion
 * por relevancia depende de las capacidades de la implementacion concreta.
 */
export interface SemanticRetriever {
  retrieve(domain: KnowledgeDomain, query: string, limit?: number): Promise<KnowledgeRetrievalResult>
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
async function baseRetrieve(domain: KnowledgeDomain, query: string, limit?: number): Promise<KnowledgeRetrievalResult> {
  switch (domain) {
    case 'Obras': {
      const knownAuthors = await listPublishedWorkAuthors()
      const criteria = interpretWorkQuery(query, knownAuthors)
      const items = await listWorkKnowledge(criteria, limit)
      return { items, requestWasNarrowed: Object.keys(criteria).length > 0 }
    }
    case 'Organizaciones':
      return { items: await listOrganizationKnowledge(limit), requestWasNarrowed: false }
    default:
      return { items: [], requestWasNarrowed: false }
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
): Promise<KnowledgeRetrievalResult> {
  return baseSemanticRetriever.retrieve(domain, query, limit)
}
