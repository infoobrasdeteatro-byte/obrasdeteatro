'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ERRORES: Record<string, string> = {
  no_valida: 'Esta invitación ya no es válida.',
  caducada: 'Esta invitación ha caducado. Escríbenos y te enviamos una nueva.',
  usada: 'Esta invitación ya ha sido aceptada desde otra cuenta.',
  ya_embajador: 'Ya eres Embajador/a de Escena con esta cuenta.',
}

/** Acepta la invitación con la sesión actual. Las reglas están en aceptar_invitacion_embajador. */
export async function aceptarInvitacion(token: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Inicia sesión para aceptar la invitación.' }
  const { data, error } = await supabase.rpc('aceptar_invitacion_embajador', { p_token: token })
  if (error) return { ok: false, error: 'No se pudo aceptar la invitación. Inténtalo de nuevo.' }
  if (data !== 'ok') return { ok: false, error: ERRORES[data ?? ''] ?? 'Esta invitación ya no es válida.' }
  revalidatePath('/perfil/centro')
  return { ok: true }
}
