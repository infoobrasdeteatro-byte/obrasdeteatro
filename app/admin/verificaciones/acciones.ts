'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarAviso } from '@/lib/perfiles/verificacion-servidor'

export async function resolverVerificacion(id: string, aprobar: boolean, motivo: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Inicia sesión.' }

  // La base comprueba que quien resuelve es moderación.
  const { error } = await supabase.rpc('resolver_verificacion', { p_id: id, p_aprobar: aprobar, p_motivo: motivo.trim() || undefined })
  if (error) return { error: error.message }

  const servicio = createServiceClient()
  const { data: v } = await servicio.from('verificaciones_profesionales').select('profile_id').eq('id', id).maybeSingle()
  const { data: p } = v ? await servicio.from('profiles').select('email, nombre, slug').eq('id', v.profile_id).maybeSingle() : { data: null }
  if (p?.email) {
    await enviarAviso(
      p.email,
      aprobar ? 'Tu perfil ya está verificado en ObrasDeTeatro®' : 'Sobre tu solicitud de verificación en ObrasDeTeatro®',
      aprobar
        ? `Hola, ${p.nombre ?? ''}:\n\nHemos comprobado tu presencia profesional y tu perfil ya luce el sello «✓ Verificado» en el directorio y en tu ficha${p.slug ? ` (https://www.obrasdeteatro.com/perfil/${p.slug})` : ''}.\n\nYa puedes quitar el código de tu red o tu web.\n\nGracias por formar parte de ObrasDeTeatro®.`
        : `Hola, ${p.nombre ?? ''}:\n\nHemos revisado tu solicitud de verificación y por ahora no hemos podido aprobarla.\n\nMotivo: ${motivo.trim()}\n\nPuedes corregirlo y volver a enviarla desde tu perfil: https://www.obrasdeteatro.com/perfil/bloque/9`,
    )
  }

  revalidatePath('/admin/verificaciones')
  revalidatePath('/directorio')
  return { ok: true }
}
