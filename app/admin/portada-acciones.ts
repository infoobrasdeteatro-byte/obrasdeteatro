'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Actualiza al momento las páginas públicas cacheadas (la portada se
 * regenera cada 10 minutos) después de que moderación cambie algo que se ve
 * en ellas: colaboradores o noticias. Solo moderación puede pedirlo; para el
 * resto no hace nada.
 */
export async function refrescarPortada(que: 'colaboradores' | 'noticias'): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: roles } = await supabase.from('profile_roles').select('role').eq('profile_id', user.id).in('role', ['admin', 'moderator'])
  if (!roles?.length) return

  if (que === 'colaboradores') {
    revalidateTag('colaboradores')
    revalidatePath('/colaboradores')
  }
  revalidatePath('/')
}
