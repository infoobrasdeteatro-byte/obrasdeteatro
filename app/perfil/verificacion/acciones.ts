'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validarEnlace } from '@/lib/perfiles/verificacion'
import { comprobarCodigoEnEnlace, enviarAviso } from '@/lib/perfiles/verificacion-servidor'

const CORREO_MODERACION = 'hola@obrasdeteatro.com'

export async function solicitarVerificacion(tipo: string, enlace: string): Promise<{ ok: true } | { error: string }> {
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
  if (detectado !== null) {
    await createServiceClient().from('verificaciones_profesionales').update({ codigo_detectado: detectado }).eq('id', id)
  }

  await enviarAviso(
    CORREO_MODERACION,
    'Nueva solicitud de verificación profesional',
    `Hay una solicitud de verificación pendiente.\n\nEnlace: ${valido.url}\nCódigo: ${codigo ?? '—'}\nComprobación automática: ${detectado === true ? 'código encontrado' : detectado === false ? 'código NO encontrado' : 'no se pudo comprobar'}\n\nRevísala en https://www.obrasdeteatro.com/admin/verificaciones`,
  )

  revalidatePath('/perfil/bloque/9')
  revalidatePath('/perfil')
  return { ok: true }
}
