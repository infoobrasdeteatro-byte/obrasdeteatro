import { getPublicOrganizationById, listPublicOrganizations } from '@/lib/repository-layer'
import type { OrganizationKnowledgeItem } from './types'

export async function getOrganizationKnowledge(organizationId: string): Promise<OrganizationKnowledgeItem | null> {
  const organization = await getPublicOrganizationById(organizationId)
  if (!organization) return null
  return { domain: 'Organizaciones', data: organization }
}

export async function listOrganizationKnowledge(limit?: number): Promise<OrganizationKnowledgeItem[]> {
  const organizations = await listPublicOrganizations(limit)
  return organizations.map((data) => ({ domain: 'Organizaciones' as const, data }))
}
