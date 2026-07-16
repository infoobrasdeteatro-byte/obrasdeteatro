import { getIdentity } from '@/lib/repository-layer'
import type { IdentitySection } from './types'

/**
 * Si no existe fila de `profiles` para el userId recibido, se degrada de
 * forma segura (regla anti-invencion, SC-004.1) -- esto NO significa que la
 * ausencia de perfil sea una situacion esperada, solo que el componente
 * responde conforme a su contrato sin bloquear el flujo (aclaracion de
 * gobernanza expresa de la Direccion del Proyecto, 2026-07-16). La deteccion
 * de esa anomalia corresponde a Observabilidad, no al PCE.
 */
export async function buildIdentitySection(userId: string): Promise<IdentitySection> {
  const identity = await getIdentity(userId)

  if (!identity) {
    return {
      userId,
      profileType: null,
      language: null,
      country: null,
      timezone: null,
      authenticationStatus: 'autenticado',
    }
  }

  return {
    userId: identity.userId,
    profileType: identity.profileType,
    language: identity.language,
    country: identity.country,
    timezone: identity.timezone,
    authenticationStatus: 'autenticado',
  }
}
