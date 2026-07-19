import { listActivityHistory } from '@/lib/procesos-asincronos'
import type { ProfessionalTrajectory } from './types'
import { interpretActivity } from './interpret-activity'

/**
 * Unico punto de entrada del dominio (especificacion Fase 1, congelada). Se
 * invoca dentro de una sesion real del propio profesional -- nunca marca
 * nada como procesado, porque no aplica a este consumidor (semantica de
 * historial, no de cola).
 *
 * Nota de alcance real: la interpretacion se basa exclusivamente en la
 * evidencia que el Nucleo ya registro en nucleo_activity_log. No representa
 * la totalidad de la trayectoria profesional del usuario -- solo patrones
 * de uso de ScenaIA observados hasta la fecha. Ese alcance podra ampliarse
 * en el futuro conforme aparezcan nuevas fuentes de evidencia en el
 * ecosistema, sin modificar el diseno de este dominio.
 */
export async function buildTrajectory(profileId: string): Promise<ProfessionalTrajectory> {
  const history = await listActivityHistory(profileId)
  const { entries, summary } = interpretActivity(history)

  return {
    profileId,
    entries,
    summary,
    generatedAt: new Date().toISOString(),
  }
}
