import { listMetrics } from '@/lib/telemetria'
import type { TechnicalTrace } from './types'
import { interpretMetrics } from './interpret-metrics'

/**
 * Unico punto de entrada de lectura (Plan Tecnico congelado, revision R-02).
 * Alcance por perfil: el unico que puede demostrarse hoy sobre el modelo de
 * sesion auth.uid() = profile_id ya verificado -- no se infiere ni se cierra
 * ningun otro alcance futuro.
 */
export async function buildTechnicalTrace(profileId: string): Promise<TechnicalTrace> {
  const entries = await listMetrics(profileId)
  const metrics = interpretMetrics(entries)

  return {
    profileId,
    metrics,
    generatedAt: new Date().toISOString(),
  }
}
