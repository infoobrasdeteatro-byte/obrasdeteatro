import { listMetrics } from '@/lib/telemetria'
import type { MetricEntry } from '@/lib/telemetria'
import type { MetricGroup, TechnicalTrace } from './types'

function groupByName(entries: MetricEntry[]): MetricGroup[] {
  const groups = new Map<string, MetricEntry[]>()

  for (const entry of entries) {
    const existing = groups.get(entry.name)
    if (existing) {
      existing.push(entry)
    } else {
      groups.set(entry.name, [entry])
    }
  }

  return Array.from(groups.entries()).map(([name, groupEntries]) => {
    const values = groupEntries.map((entry) => entry.value)
    return {
      name,
      count: groupEntries.length,
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      averageValue: values.reduce((sum, value) => sum + value, 0) / values.length,
      unit: groupEntries[0].unit,
    }
  })
}

/**
 * Unico punto de entrada del componente (Plan Tecnico, confirmado). Misión:
 * construir una representacion estructurada de la telemetria del perfil --
 * las estadisticas (conteo, minimo, maximo, promedio) son una consecuencia
 * de esa representacion, no la mision en si, y podran ampliarse en el
 * futuro sin alterarla. Nunca marca nada como procesado (no aplica: las
 * metricas son hechos inmutables) ni persiste nada nuevo.
 */
export async function buildTechnicalTrace(profileId: string): Promise<TechnicalTrace> {
  const entries = await listMetrics(profileId)
  const groups = groupByName(entries)

  return {
    profileId,
    groups,
    totalEntries: entries.length,
    generatedAt: new Date().toISOString(),
  }
}
