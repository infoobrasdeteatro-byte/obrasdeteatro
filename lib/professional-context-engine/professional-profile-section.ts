import { getProfessionalProfilePublic, getIndividualProfileData, getOrganizationalProfileData } from '@/lib/repository-layer'
import type { IndividualProfileData, OrganizationalProfileData } from '@/lib/repository-layer'
import type { ProfessionalProfileSection } from './types'

const INDIVIDUAL_TYPES = ['actor', 'director', 'dramaturgo']
const ORGANIZATIONAL_TYPES = ['compania', 'productora', 'teatro', 'festival', 'escuela']

function joinOrNull(items: string[]): string | null {
  return items.length > 0 ? items.join(', ') : null
}

function fromIndividual(data: IndividualProfileData) {
  return {
    specialty: joinOrNull(data.specializations),
    disciplines: joinOrNull(data.availability),
    experience: data.trajectory ?? data.biography,
  }
}

function fromOrganizational(data: OrganizationalProfileData) {
  return {
    specialty: joinOrNull(data.activityCategories),
    disciplines: joinOrNull(data.services),
    experience: data.description ?? data.history,
  }
}

/**
 * IA-002 resuelta (Decision de Direccion + Plan Tecnico aprobados
 * 2026-07-22): specialty/disciplines/experience se derivan del contrato de
 * familia (Individual u Organizacional) de Repository Layer segun
 * profileType. El contrato publico de ProfessionalProfileSection se
 * mantiene sin cambios de forma -- la adaptacion es un detalle de
 * implementacion (Plan Tecnico S5), no una decision de gobernanza.
 */
export async function buildProfessionalProfileSection(
  userId: string,
  profileType: string | null
): Promise<ProfessionalProfileSection> {
  const publicProfile = await getProfessionalProfilePublic(userId)

  if (profileType && INDIVIDUAL_TYPES.includes(profileType)) {
    const data = await getIndividualProfileData(userId, profileType)
    if (data) return { ...fromIndividual(data), publicProfile }
  }

  if (profileType && ORGANIZATIONAL_TYPES.includes(profileType)) {
    const data = await getOrganizationalProfileData(userId, profileType)
    if (data) return { ...fromOrganizational(data), publicProfile }
  }

  return { specialty: null, disciplines: null, experience: null, publicProfile }
}
