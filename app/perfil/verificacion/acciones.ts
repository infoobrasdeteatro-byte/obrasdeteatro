'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validarEnlace } from '@/lib/perfiles/verificacion'
import { comprobarCodigoEnEnlace, enviarAviso } from '@/lib/perfiles/verificacion-servidor'

const CORREO_MODERACION = 'hola@obrasdeteatro.com'

export async function solicitarVerificacion(tipo: string, enlace: string): Promise<{ ok: true; aprobada?: boolean } | { error: string }> {
  const valido = validarEnlace(tipo, enlace)
  if (!valido.ok) return { error: valido.error }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Inicia sesión.' }

  // La base vuelve a comprobar plan, ficha y que no haya otra en revisión.
  const { data: id, error } = await supabase.rpc('solicitar_verificacion', { p_tipo: tipo, p_enlace: valido.url })
  if (error || !id) return { error: error?.message ?? 'No se pudo enviar la solicitud.' }

  const { data: codigo } = await supabase.rpc('codigo_verificacion', { p_profile: user.id })
  const detectado = codigo ? await comprobarCodigoEnEnlace(valido.url, codigo) : null
  const servicio = createServiceClient()

  // Aprobación automática: si el código aparece en el enlace, no hace falta
  // que moderación intervenga. El sello sigue exigiendo plan de pago (la
  // solicitud ya lo comprobó y el trigger lo retira si deja de pagar).
  if (detectado === true) {
    await servicio.from('verificaciones_profesionales')
      .update({ codigo_detectado: true, estado: 'aprobada', motivo: 'Aprobada automáticamente: código encontrado en el enlace', resuelta_at: new Date().toISOString() })
      .eq('id', id).eq('estado', 'pendiente')
    await servicio.from('profiles').update({ verificado_profesional: true }).eq('id', user.id).neq('plan', 'gratuito')
    const { data: p } = await servicio.from('profiles').select('email, nombre, slug').eq('id', user.id).maybeSingle()
    if (p?.email) {
      await enviarAviso(
        p.email,
        'Tu perfil ya está verificado en ObrasDeTeatro®',
        `Hola, ${p.nombre ?? ''}:\n\nHemos encontrado tu código en ${valido.url} y tu perfil ya luce el sello «✓ Verificado» en el directorio y en tu ficha${p.slug ? ` (https://www.obrasdeteatro.com/perfil/${p.slug})` : ''}.\n\nYa puedes quitar el código de tu red o tu web.\n\nGracias por formar parte de ObrasDeTeatro®.`,
      )
    }
    revalidatePath('/perfil/bloque/9')
    revalidatePath('/perfil')
    revalidatePath('/directorio')
    return { ok: true, aprobada: true }
  }

  if (detectado === false) {
    await servicio.from('verificaciones_profesionales').update({ codigo_detectado: false }).eq('id', id)
  }

  await enviarAviso(
    CORREO_MODERACION,
    'Nueva solicitud de verificación profesional',
    `Hay una solicitud de verificación pendiente de revisión manual.\n\nEnlace: ${valido.url}\nCódigo: ${codigo ?? '—'}\nComprobación automática: ${detectado === false ? 'código NO encontrado' : 'no se pudo comprobar'}\n\nRevísala en https://www.obrasdeteatro.com/admin/verificaciones`,
  )

  revalidatePath('/perfil/bloque/9')
  revalidatePath('/perfil')
  return { ok: true }
}
