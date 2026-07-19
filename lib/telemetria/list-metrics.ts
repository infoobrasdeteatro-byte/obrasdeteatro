import { listMetrics as fetchMetrics } from '@/lib/repository-layer'
import type { MetricEntry, MetricFilter } from './types'

/**
 * Unica capacidad de lectura, de uso exclusivo de Observabilidad (frontera
 * ya congelada en el cierre de Bloque II -- Analitica no esta autorizada a
 * invocarla). Devuelve entradas crudas, en el mismo orden cronologico
 * ascendente que ya expone Repository Layer -- Telemetria nunca consolida
 * ni agrega, ese verbo pertenece a Observabilidad.
 */
export async function listMetrics(profileId: string, filter?: MetricFilter): Promise<MetricEntry[]> {
  return fetchMetrics(profileId, filter)
}
