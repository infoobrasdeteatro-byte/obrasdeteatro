import { getPublishedWorkById, listPublishedWorks } from '@/lib/repository-layer'
import type { Work, WorkSearchCriteria } from '@/lib/repository-layer'
import type { WorkKnowledgeItem, WorksPage, WorksPageRequest } from './types'
import { catalogProvenance } from './provenance'

function toWorkKnowledgeItem(data: Work): WorkKnowledgeItem {
  return { domain: 'Obras' as const, data, provenance: catalogProvenance(data), functions: [] }
}

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
export function listWorkKnowledge(
  criteria: WorkSearchCriteria | undefined,
  limit: number | undefined,
  page: WorksPageRequest
): Promise<{ items: WorkKnowledgeItem[]; worksPage: WorksPage }>
// La firma sin pagina va la ultima a proposito: es la que TypeScript toma al
// inferir el tipo de la funcion (vi.mocked en las pruebas de quienes la
// llaman hoy), que asi sigue siendo exactamente la de siempre.
export function listWorkKnowledge(criteria?: WorkSearchCriteria, limit?: number): Promise<WorkKnowledgeItem[]>
export async function listWorkKnowledge(
  criteria: WorkSearchCriteria = {},
  limit?: number,
  page?: WorksPageRequest
): Promise<WorkKnowledgeItem[] | { items: WorkKnowledgeItem[]; worksPage: WorksPage }> {
  // SCENAIA-004B §4.4: con pagina, el tamano llega como dato y el recuento
  // vuelve junto a las obras. Sin pagina, la llamada es la de siempre.
  if (page !== undefined) {
    const { works, total } = await listPublishedWorks(criteria, page.pageSize, { offset: page.offset })
    return {
      items: works.map(toWorkKnowledgeItem),
      worksPage: { offset: page.offset, pageSize: page.pageSize, returned: works.length, total },
    }
  }

  const works = await listPublishedWorks(criteria, limit)
  return works.map(toWorkKnowledgeItem)
}
