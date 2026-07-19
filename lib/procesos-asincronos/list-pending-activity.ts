import { listPendingActivity as fetchPendingActivity } from '@/lib/repository-layer'
import type { ActivityLogEntry } from './types'
import { narrowActivityLogEntry } from './narrow-entry'

/**
 * Semantica de cola: solo actividad no procesada. Se invoca dentro de una
 * sesion real del propio profesional (modelo "diferido a sesion",
 * investigacion cerrada 2026-07-17) -- nunca en segundo plano sin sesion.
 * A diferencia de recordActivity(), sí puede lanzar: se llama fuera de la
 * ruta critica del Nucleo, un fallo aqui es un error de aplicacion normal,
 * no algo que deba silenciarse para proteger una respuesta ya construida.
 */
export async function listPendingActivity(profileId: string, limit?: number): Promise<ActivityLogEntry[]> {
  const rows = await fetchPendingActivity(profileId, limit)
  return rows.map(narrowActivityLogEntry)
}
