import { listWorkKnowledge } from './works-knowledge'
import { listOrganizationKnowledge } from './organizations-knowledge'
import type { StructuredKnowledgeItem } from './types'

/**
 * Combines every currently implemented structured domain (Obras, Organizaciones)
 * into a single coherent set. Domains with no implementation yet (Personas,
 * Oportunidades, Editorial, Relaciones, Trayectoria, Inteligencia) are not
 * included — see IA-003.
 */
export async function listStructuredKnowledge(limitPerDomain?: number): Promise<StructuredKnowledgeItem[]> {
  const [works, organizations] = await Promise.all([
    listWorkKnowledge({}, limitPerDomain),
    listOrganizationKnowledge(limitPerDomain),
  ])

  return [...works, ...organizations]
}
