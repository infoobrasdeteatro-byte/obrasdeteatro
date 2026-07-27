import { retrieveRelevantKnowledge } from '@/lib/knowledge-assets'
import type { KnowledgeDomain, StructuredKnowledgeItem } from '@/lib/knowledge-assets'

/**
 * IA-003 (Plan Tecnico aprobado 2026-07-22): transporta el texto de la
 * peticion hasta Knowledge Assets a traves de su interfaz publica
 * `retrieveRelevantKnowledge`. La implementacion base activa hoy no tiene
 * motor de recuperacion semantica real -- el resultado sigue siendo la
 * misma enumeracion por dominio de siempre, sin relevancia -- pero el
 * contrato ya transporta `query`, sin exigir un cambio de firma cuando en
 * el futuro exista un motor real (independencia tecnologica).
 */
export async function retrieveKnowledgeForDomain(
  domain: KnowledgeDomain,
  query: string
): Promise<StructuredKnowledgeItem[]> {
  return retrieveRelevantKnowledge(domain, query)
}
