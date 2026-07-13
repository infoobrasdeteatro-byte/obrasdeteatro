import { getPublishedWorkById, listPublishedWorks } from '@/lib/repository-layer'
import type { WorkKnowledgeItem } from './types'

export async function getWorkKnowledge(workId: string): Promise<WorkKnowledgeItem | null> {
  const work = await getPublishedWorkById(workId)
  if (!work) return null
  return { domain: 'Obras', data: work }
}

export async function listWorkKnowledge(limit?: number): Promise<WorkKnowledgeItem[]> {
  const works = await listPublishedWorks(limit)
  return works.map((data) => ({ domain: 'Obras' as const, data }))
}
