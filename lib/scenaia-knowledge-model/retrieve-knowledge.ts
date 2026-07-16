import { listWorkKnowledge, listOrganizationKnowledge } from '@/lib/knowledge-assets'
import type { KnowledgeDomain, StructuredKnowledgeItem } from '@/lib/knowledge-assets'

/**
 * Enumeracion acotada por dominio -- no hay ningun mecanismo de busqueda ni
 * relevancia disponible en Knowledge Assets (recuperacion semantica fuera
 * de alcance, IA-003): el resultado nunca esta filtrado por el contenido
 * de la peticion, solo por el dominio solicitado.
 */
export async function retrieveKnowledgeForDomain(domain: KnowledgeDomain): Promise<StructuredKnowledgeItem[]> {
  switch (domain) {
    case 'Obras':
      return listWorkKnowledge()
    case 'Organizaciones':
      return listOrganizationKnowledge()
    default:
      return []
  }
}
