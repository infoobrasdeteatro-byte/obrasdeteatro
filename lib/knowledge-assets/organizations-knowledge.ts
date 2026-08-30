import { getPublicOrganizationById, listPublicOrganizations, listPublicOrganizationProfiles } from '@/lib/repository-layer'
import type { OrganizationSearchCriteria } from '@/lib/repository-layer'
import type { OrganizationKnowledgeItem } from './types'
import { catalogProvenance } from './provenance'
import { deriveInstitutionFunctions, derivePersonFunctions } from './theatrical-function'

export async function getOrganizationKnowledge(organizationId: string): Promise<OrganizationKnowledgeItem | null> {
  const organization = await getPublicOrganizationById(organizationId)
  if (!organization) return null
  return { domain: 'Organizaciones', data: organization, provenance: catalogProvenance(), functions: deriveInstitutionFunctions(organization.type) }
}

export async function listOrganizationKnowledge(
  criteria: OrganizationSearchCriteria = {},
  limit?: number
): Promise<OrganizationKnowledgeItem[]> {
  // Dos poblaciones complementarias, nunca duplicadas: organizaciones sin
  // cuenta de usuario (`institutions`) y organizaciones con cuenta
  // (`profiles` con tipo_perfil organizativo). Estas ultimas entraban antes
  // como Personas -- un teatro se presentaba como persona.
  const [institutions, organizationProfiles] = await Promise.all([
    listPublicOrganizations(criteria, limit),
    listPublicOrganizationProfiles(criteria, limit),
  ])

  // La funcion se deriva segun el ORIGEN del dato: `institutions.type` y
  // `profiles.tipo_perfil` son vocabularios distintos, cada uno con su
  // propia regla ya probada. Nunca se traduce uno al otro.
  const desdeInstituciones = institutions.map((data) => ({
    domain: 'Organizaciones' as const,
    data,
    provenance: catalogProvenance(),
    functions: deriveInstitutionFunctions(data.type),
  }))

  const desdePerfiles = organizationProfiles.map((data) => ({
    domain: 'Organizaciones' as const,
    data,
    provenance: catalogProvenance(),
    functions: derivePersonFunctions(data.type),
  }))

  return [...desdeInstituciones, ...desdePerfiles]
}
