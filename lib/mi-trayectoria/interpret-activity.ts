import type { ActivityLogEntry, ResponseType } from '@/lib/procesos-asincronos'
import type { TrajectoryEntry, TrajectorySummary } from './types'

/**
 * Funcion pura: nunca marca actividad como procesada ni realiza I/O -- solo
 * reorganiza lo que listActivityHistory ya devuelve en orden cronologico
 * ascendente. `summary` es estrictamente estructural (conteos, primera y
 * ultima fecha), nunca evaluativo ni recomendativo (invariante 5 de la
 * especificacion congelada: no invade a Decision Engine).
 */
export function interpretActivity(logEntries: ActivityLogEntry[]): {
  entries: TrajectoryEntry[]
  summary: TrajectorySummary
} {
  const entries: TrajectoryEntry[] = logEntries.map((entry) => ({
    occurredAt: entry.occurredAt,
    category: entry.responseType,
  }))

  const countByCategory: Partial<Record<ResponseType, number>> = {}
  for (const entry of entries) {
    countByCategory[entry.category] = (countByCategory[entry.category] ?? 0) + 1
  }

  const summary: TrajectorySummary = {
    totalEntries: entries.length,
    firstActivityAt: entries.length > 0 ? entries[0].occurredAt : null,
    lastActivityAt: entries.length > 0 ? entries[entries.length - 1].occurredAt : null,
    countByCategory,
  }

  return { entries, summary }
}
