/**
 * Correo entrante: se conserva 12 meses en la web. Lo más antiguo se borra
 * cada día (cron /api/cron/correo-entrante); el buzón original no se toca.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const MESES_CONSERVACION = 12

/** Fecha límite: lo recibido antes se borra. */
export function limiteConservacion(ahora: Date): Date {
  const d = new Date(ahora)
  d.setUTCMonth(d.getUTCMonth() - MESES_CONSERVACION)
  return d
}

export async function borrarCorreosAntiguos(servicio: SupabaseClient, ahora = new Date()) {
  const antesDe = limiteConservacion(ahora).toISOString()
  const { count, error } = await servicio
    .from('correos_entrantes')
    .delete({ count: 'exact' })
    .lt('recibido_at', antesDe)
  return { borrados: count ?? 0, antesDe, error: error?.message ?? null }
}
