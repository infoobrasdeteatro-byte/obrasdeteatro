'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ERRORES: Record<string, string> = {
  no_valida: 'Esta invitación ya no es válida.',
  usada: 'Esta invitación ya ha sido aceptada desde otra cuenta.',
  ya_fundador: 'Esta cuenta ya forma parte del Elenco Fundador.',
}

/** Acepta la invitación con la sesión actual. Las reglas están en aceptar_invitacion_elenco. */
export async function aceptarInvitacionElenco(token: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Hace falta iniciar sesión para aceptar la invitación.' }
  const { data, error } = await supabase.rpc('aceptar_invitacion_elenco', { p_token: token })
  if (error) return { ok: false, error: 'No se pudo aceptar la invitación en este momento.' }
  if (data !== 'ok') return { ok: false, error: ERRORES[data ?? ''] ?? 'Esta invitación ya no es válida.' }
  revalidatePath('/perfil/red')
  return { ok: true }
}
