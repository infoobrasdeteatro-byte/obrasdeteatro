'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { importarPrograma, type ResultadoImportacion } from '@/lib/mediateca/importar'

/**
 * «Importar ahora» desde /admin/mediateca: la misma importación que el cron
 * diario, para un programa. Comprueba primero que quien la pide es
 * moderador (con su sesión) y solo entonces usa la clave de servicio.
 */
export async function importarAhora(programaId: string): Promise<ResultadoImportacion | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Inicia sesión.' }
  const { data: roles } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).in('role', ['admin', 'moderator'])
  if (!roles?.length) return { error: 'Solo el equipo de moderación puede importar.' }

  const servicio = createServiceClient()
  const { data: p, error } = await servicio.from('mediateca_programas')
    .select('id, nombre, youtube_channel_id, rss_url, imagen_url, filtro_titulo').eq('id', programaId).maybeSingle()
  if (error || !p) return { error: 'Programa no encontrado.' }

  const r = await importarPrograma(servicio, p)
  revalidatePath('/admin/mediateca')
  return r
}
