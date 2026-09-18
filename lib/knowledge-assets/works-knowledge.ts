import { getPublishedWorkById, listPublishedWorks } from '@/lib/repository-layer'
import type { WorkSearchCriteria } from '@/lib/repository-layer'
import type { WorkKnowledgeItem } from './types'
import { catalogProvenance } from './provenance'

export async function getWorkKnowledge(workId: string): Promise<WorkKnowledgeItem | null> {
  const work = await getPublishedWorkById(workId)
  if (!work) return null
  return { domain: 'Obras', data: work, provenance: catalogProvenance(work), functions: [] }
}

/**
 * criteria (SCENAIA-002C): ya resuelto por quien orquesta (Knowledge
 * Assets, ver semantic-retriever.ts) -- este archivo sigue sin interpretar
 * nada, solo traslada el criterio a Repository Layer y etiqueta el
 * resultado con el dominio. Valor por defecto {} preserva exactamente el
 * comportamiento anterior (sin filtrar) para cualquier llamador que no
 * proporcione criterio.
 */
export async function listWorkKnowledge(
  criteria: WorkSearchCriteria = {},
  limit?: number
): Promise<WorkKnowledgeItem[]> {
  const works = await listPublishedWorks(criteria, limit)
  return works.map((data) => ({ domain: 'Obras' as const, data, provenance: catalogProvenance(data), functions: [] }))
}
