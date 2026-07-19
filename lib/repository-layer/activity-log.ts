import { createClient } from '@/lib/supabase/server'

/**
 * Unica operacion de escritura del registro de actividad -- no generica: solo
 * inserta exactamente una fila de nucleo_activity_log con los dos datos que
 * necesita recibir. Coherente con el invariante general de Repository Layer
 * (toda mutacion mediante una operacion nombrada, con contrato propio). No
 * requiere una funcion atomica en base de datos (a diferencia de Accounting
 * Engine): cada insercion es independiente, sin condicion de carrera que
 * cerrar entre lecturas y escrituras concurrentes.
 */
export async function recordActivity(profileId: string, responseType: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('nucleo_activity_log').insert({
    profile_id: profileId,
    response_type: responseType,
  })

  if (error) {
    throw new Error(`recordActivity failed: ${error.message}`)
  }
}

export interface ActivityLogEntry {
  id: string
  profileId: string
  responseType: string
  occurredAt: string
}

// row.profile_id es `string | null` a nivel de columna (la FK admite SET
// NULL), pero el filtro `.eq('profile_id', profileId)` de ambas consultas
// de este archivo ya garantiza que toda fila devuelta tiene ese mismo
// profileId no nulo -- se usa el parametro de entrada, ya conocido, en vez
// de una asercion no nula.
function toActivityLogEntry(
  row: { id: string; profile_id: string | null; response_type: string; occurred_at: string },
  profileId: string
): ActivityLogEntry {
  return {
    id: row.id,
    profileId: row.profile_id ?? profileId,
    responseType: row.response_type,
    occurredAt: row.occurred_at,
  }
}

/**
 * Semantica de cola: solo actividad pendiente (processed_at IS NULL), en
 * orden cronologico ascendente (occurred_at ASC) -- garantiza que cualquier
 * consumidor de tipo cola procese en el mismo orden determinista. Diseñada
 * para invocarse dentro de una sesion real del propio profesional (modelo
 * "diferido a sesion" ya congelado), nunca en segundo plano sin sesion.
 */
export async function listPendingActivity(profileId: string, limit = 20): Promise<ActivityLogEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('nucleo_activity_log')
    .select('id, profile_id, response_type, occurred_at')
    .eq('profile_id', profileId)
    .is('processed_at', null)
    .order('occurred_at', { ascending: true })
    .limit(limit)

  if (error || !data) return []

  return data.map((row) => toActivityLogEntry(row, profileId))
}

/**
 * Semantica de historial: toda la actividad del profesional, procesada o
 * no, en orden cronologico ascendente -- segunda capacidad publica de
 * Procesos Asincronos (no una ampliacion hecha "para" ningun consumidor
 * concreto). Reutiliza la misma politica RLS de SELECT ya existente
 * ("Ver actividad propia"), que nunca restringio por processed_at -- sin
 * migracion nueva.
 */
export async function listActivityHistory(profileId: string, limit = 50): Promise<ActivityLogEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('nucleo_activity_log')
    .select('id, profile_id, response_type, occurred_at')
    .eq('profile_id', profileId)
    .order('occurred_at', { ascending: true })
    .limit(limit)

  if (error || !data) return []

  return data.map((row) => toActivityLogEntry(row, profileId))
}

/**
 * Idempotente: si el registro ya estaba marcado como procesado, la
 * actualizacion no afecta a ninguna fila (WHERE processed_at IS NULL) y no
 * se considera un error -- la garantia post-condicion ("queda marcada como
 * procesada") ya se cumplia antes de la llamada.
 */
export async function markActivityProcessed(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('nucleo_activity_log')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', id)
    .is('processed_at', null)

  if (error) {
    throw new Error(`markActivityProcessed failed: ${error.message}`)
  }
}
