import { recordActivity as persistActivity } from '@/lib/repository-layer'
import type { ActivityRecord } from './types'

/**
 * Unica operacion publica de esta version (SC-005, Servicio de Plataforma).
 * Punto oficial de integracion (gobernanza, 2026-07-17): dentro del flujo
 * estandar de ScenaIA, solo el SPO -- coordinando esta llamada como un paso
 * mas de la secuencia, sin mantener el mismo ningun estado -- debe
 * invocarla. Ningun componente del Nucleo (Response Composer, Decision
 * Engine, AI Gateway, Credit Manager, PCE, SKM, Request Interpreter) debe
 * conocerla ni invocarla directamente.
 *
 * Nunca debe interrumpir el flujo sincrono del Nucleo: un fallo al
 * registrar actividad no es motivo para negar una respuesta ya construida
 * correctamente -- se captura el error y se devuelve un booleano, en vez de
 * relanzar. Decision de diseno explicita, no un descuido.
 */
export async function recordActivity(activity: ActivityRecord): Promise<boolean> {
  try {
    await persistActivity(activity.profileId, activity.responseType)
    return true
  } catch {
    return false
  }
}
