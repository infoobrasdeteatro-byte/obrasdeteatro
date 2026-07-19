import type { ActivityLogEntry as RepositoryActivityLogEntry } from '@/lib/repository-layer'
import type { ActivityLogEntry, ResponseType } from './types'

/**
 * Repository Layer devuelve response_type como string (columna generica);
 * el CHECK de la migracion ya garantiza que solo contiene uno de los 5
 * valores de ResponseType -- se estrecha aqui, en el unico punto de
 * conversion entre la capa de persistencia y este Servicio de Plataforma.
 */
export function narrowActivityLogEntry(row: RepositoryActivityLogEntry): ActivityLogEntry {
  return { ...row, responseType: row.responseType as ResponseType }
}
