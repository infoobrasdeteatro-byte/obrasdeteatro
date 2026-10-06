'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginUrlWithNext } from '@/lib/auth/next-param'
import { MOTIVO_RECHAZO_RESUMEN, verificarToken } from '@/lib/convocatorias/token-moderacion'

const RUTA = '/admin/convocatorias/moderar'

/**
 * POST del botón de confirmación. Es lo ÚNICO que modera: el enlace del correo
 * (GET) solo abre la página.
 *
 * Escribe con la sesión del moderador, nunca con la clave de servicio: la
 * política «Moderación gestiona convocatorias» y el trigger calls_sync_estado()
 * deciden igual que en el panel. Solo toca filas que siguen en
 * pendiente_revision; si otra persona ya la resolvió, no cambia nada.
 */
export async function confirmarModeracion(formData: FormData): Promise<void> {
  const token = String(formData.get('t') ?? '')
  const verificado = verificarToken(token)
  if (!verificado.ok) redirect(`${RUTA}?error=${verificado.motivo}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(loginUrlWithNext(`${RUTA}?t=${encodeURIComponent(token)}`))

  const cambios = verificado.accion === 'aprobar'
    ? { estado: 'publicado' }
    : { estado: 'rechazado', motivo_rechazo: MOTIVO_RECHAZO_RESUMEN }

  const { data, error } = await supabase
    .from('calls')
    .update(cambios)
    .eq('id', verificado.callId)
    .eq('estado', 'pendiente_revision')
    .select('estado')
    .maybeSingle()

  const volver = `${RUTA}?t=${encodeURIComponent(token)}`
  if (error) redirect(`${volver}&hecho=error&msg=${encodeURIComponent(error.message.slice(0, 300))}`)
  if (!data) redirect(`${volver}&hecho=sin_cambio`)
  redirect(`${volver}&hecho=${data.estado === 'publicado' ? 'publicada' : data.estado === 'rechazado' ? 'rechazada' : 'sin_cambio'}`)
}
