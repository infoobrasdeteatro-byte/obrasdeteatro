import { recordMetric as persistMetric, recordMetrics as persistMetrics } from '@/lib/repository-layer'
import type { MetricInput } from './types'

/**
 * Mecanismo general de instrumentacion (SC-005, Servicio de Plataforma) --
 * cualquier componente autorizado puede invocarla para registrar una
 * metrica propia, sin que Telemetria conozca su forma ni su origen.
 *
 * Nunca debe interrumpir el flujo que la invoca: mismo principio ya
 * aplicado a recordActivity() de Procesos Asincronos -- un fallo al
 * registrar una metrica no es motivo para negar ni degradar una respuesta
 * ya construida correctamente. Se captura el error y se devuelve un
 * booleano, en vez de relanzar.
 */
export async function recordMetric(profileId: string, metric: MetricInput): Promise<boolean> {
  try {
    await persistMetric(profileId, metric)
    return true
  } catch {
    return false
  }
}

/**
 * Varias metricas del mismo perfil en una sola escritura. Misma garantia
 * que `recordMetric`: nunca interrumpe el flujo que la invoca -- captura el
 * error y devuelve un booleano.
 */
export async function recordMetrics(profileId: string, metrics: readonly MetricInput[]): Promise<boolean> {
  try {
    await persistMetrics(profileId, metrics)
    return true
  } catch {
    return false
  }
}
