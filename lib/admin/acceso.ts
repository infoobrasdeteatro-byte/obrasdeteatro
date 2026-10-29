/**
 * Master Control: quién entra y qué ve.
 *
 * Mismo criterio que el resto de /admin: entran los roles admin y moderator;
 * lo que hoy es solo de administración (Embajadores, Avisos de perfil,
 * Recordatorio de confirmación) solo lo ve admin. Como en las demás páginas,
 * este guard solo explica: la seguridad la ponen la RLS y las funciones de la
 * base, que vuelven a exigir el rol.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const ROLES_ADMINISTRACION = ['admin', 'moderator'] as const

export type Acceso = { permitido: boolean; esAdmin: boolean }

/** Puro: decide a partir de los roles de la cuenta. */
export function accesoDesdeRoles(roles: readonly (string | null | undefined)[]): Acceso {
  const esAdmin = roles.includes('admin')
  return { permitido: esAdmin || roles.includes('moderator'), esAdmin }
}

/** Lee los roles con la sesión de la cuenta (la política solo deja ver los propios). */
export async function leerAcceso(supabase: SupabaseClient, userId: string): Promise<Acceso> {
  const { data } = await supabase
    .from('profile_roles')
    .select('role')
    .eq('profile_id', userId)
    .in('role', [...ROLES_ADMINISTRACION])
  return accesoDesdeRoles(((data ?? []) as { role: string }[]).map(r => r.role))
}
