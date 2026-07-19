import type { ResponseType } from '@/lib/response-composer'

export type { ResponseType }

export interface ActivityRecord {
  readonly profileId: string
  readonly responseType: ResponseType
}

/**
 * Una entrada del registro de actividad, comun a las dos capacidades
 * publicas de lectura del Servicio de Plataforma:
 *   - listPendingActivity(): semantica de cola, solo lo no procesado.
 *   - listActivityHistory(): semantica de historial, todo lo registrado.
 * Ambas devuelven el mismo orden cronologico ascendente garantizado por
 * Repository Layer (occurred_at ASC). Se lee siempre dentro de una sesion
 * real del propio profesional (modelo "diferido a sesion", investigacion
 * cerrada 2026-07-17) -- nunca en segundo plano sin sesion.
 */
export interface ActivityLogEntry {
  readonly id: string
  readonly profileId: string
  readonly responseType: ResponseType
  readonly occurredAt: string
}
