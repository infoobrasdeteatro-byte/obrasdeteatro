'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ERRORES: Record<string, string> = {
  no_fundador: 'Esta cuenta no forma parte del Elenco Fundador.',
  ya_activado: 'El bono ya está activado.',
  caducado: 'El plazo para activar el bono ha terminado.',
}

/** «Activar mis 3 meses»: las reglas (plazo, una sola vez, nunca bajar el plan) están en elenco_activar_bono. */
export async function activarBonoElenco(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('elenco_activar_bono')
  if (error) return { ok: false, error: 'No se pudo activar en este momento.' }
  revalidatePath('/perfil/red')
  revalidatePath('/perfil')
  return data === 'ok' ? { ok: true } : { ok: false, error: ERRORES[data ?? ''] ?? 'No se pudo activar.' }
}
