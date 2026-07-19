import type { MetricEntry } from '@/lib/telemetria'
import type { TechnicalMetricSummary } from './types'

/**
 * Funcion pura, sin I/O: agrupa por nombre de metrica y calcula
 * count/min/max/average -- la consolidacion que el propio Plan Tecnico de
 * Telemetria le atribuye en exclusiva a Observabilidad ("obtener y
 * consolidar la informacion tecnica que necesita").
 */
export function interpretMetrics(entries: MetricEntry[]): TechnicalMetricSummary[] {
  const byName = new Map<string, number[]>()
  for (const entry of entries) {
    const values = byName.get(entry.name) ?? []
    values.push(entry.value)
    byName.set(entry.name, values)
  }

  return Array.from(byName.entries()).map(([name, values]) => ({
    name,
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
  }))
}
