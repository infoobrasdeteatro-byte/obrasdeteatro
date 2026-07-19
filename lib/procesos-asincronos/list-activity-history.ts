import { listActivityHistory as fetchActivityHistory } from '@/lib/repository-layer'
import type { ActivityLogEntry } from './types'
import { narrowActivityLogEntry } from './narrow-entry'

/**
 * Semantica de historial: segunda capacidad publica de Procesos Asincronos,
 * no una ampliacion hecha para ningun consumidor concreto -- Mi Trayectoria
 * es simplemente su primer consumidor. Devuelve toda la actividad del
 * profesional, procesada o no, en orden cronologico ascendente. Misma
 * sesion real del propio profesional que el resto de operaciones de este
 * modulo.
 */
export async function listActivityHistory(profileId: string, limit?: number): Promise<ActivityLogEntry[]> {
  const rows = await fetchActivityHistory(profileId, limit)
  return rows.map(narrowActivityLogEntry)
}
