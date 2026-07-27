import type { ProfessionalContext } from './types'
import type { SessionInput } from './session-section'
import { buildIdentitySection } from './identity-section'
import { buildSubscriptionSection } from './subscription-section'
import { buildProfessionalProfileSection } from './professional-profile-section'
import { buildSessionSection } from './session-section'

/**
 * Unico constructor publico de ProfessionalContext (SC-004.1). Se construye
 * de nuevo en cada invocacion -- nunca se cachea ni se reutiliza entre
 * peticiones. Inmutabilidad garantizada a nivel de tipos (todas las
 * secciones son `readonly`), no por congelado en tiempo de ejecucion.
 */
export async function buildProfessionalContext(
  userId: string,
  session: SessionInput
): Promise<ProfessionalContext> {
  const [identity, subscription] = await Promise.all([
    buildIdentitySection(userId),
    buildSubscriptionSection(userId),
  ])
  // profileType determina la tabla especializada a consultar (IA-002) --
  // no puede resolverse en paralelo con identity, depende de su resultado.
  const professionalProfile = await buildProfessionalProfileSection(userId, identity.profileType)

  return {
    identity,
    subscription,
    professionalProfile,
    session: buildSessionSection(session),
  }
}
