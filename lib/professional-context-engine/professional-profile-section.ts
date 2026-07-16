import { getProfessionalProfilePublic } from '@/lib/repository-layer'
import type { ProfessionalProfileSection } from './types'

/**
 * specialty/disciplines/experience: siempre "no disponible" -- IA-002 sigue
 * abierta (el accessor de perfil especializado fue retirado de Repository
 * Layer en RA-001 por exponer estructura fisica de la tabla especializada).
 */
export async function buildProfessionalProfileSection(userId: string): Promise<ProfessionalProfileSection> {
  const publicProfile = await getProfessionalProfilePublic(userId)

  return {
    specialty: null,
    disciplines: null,
    experience: null,
    publicProfile,
  }
}
