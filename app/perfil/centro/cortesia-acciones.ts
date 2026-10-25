'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** Renunciar a la membresía de cortesía: termina hoy y el plan vuelve al que corresponda. */
export async function renunciarCortesia(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('renunciar_cortesia')
  revalidatePath('/perfil/centro')
  revalidatePath('/perfil')
  return { ok: !error && data === true }
}
