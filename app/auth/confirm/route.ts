import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import {
  aplicarEmbajadores, notifyWelcomeIfFirstConfirmation, redirigirTrasConfirmar, urlResultado,
} from '@/lib/auth/confirmacion'

/**
 * Confirmación del registro que funciona en cualquier aparato.
 *
 * 1. Enlace del correo «Confirma tu cuenta»:
 *    /auth/confirm?token_hash=…&type=signup[&next=/ruta]
 *    verifyOtp se hace aquí, en el servidor, sin code verifier: confirma el
 *    correo y crea la sesión en el aparato donde se pulsa el enlace.
 *
 * 2. Pestaña del registro que estaba esperando (sin token_hash): ya ha
 *    iniciado sesión con la contraseña que acababa de escribir y viene aquí
 *    para salir por el mismo destino. Los pasos de después de confirmar solo
 *    se repiten si la confirmación es reciente; todos son idempotentes.
 *
 * Destino: Embajadores › next › cookie del registro › next guardado en la
 * cuenta › panel. Si el enlace no vale, nunca se muestra el error de
 * recuperación de contraseña.
 */
const TIPOS = new Set(['signup', 'email'])
/** Ventana en la que la pestaña del registro aún aplica los pasos de confirmar. */
const CONFIRMACION_RECIENTE_MS = 24 * 60 * 60 * 1000

function reciente(confirmadoAt: string | null | undefined): boolean {
  const t = confirmadoAt ? Date.parse(confirmadoAt) : NaN
  return Number.isFinite(t) && Date.now() - t <= CONFIRMACION_RECIENTE_MS
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next')

  const supabase = await createClient()

  const continuar = async () => {
    await notifyWelcomeIfFirstConfirmation(supabase)
    const forzado = await aplicarEmbajadores(request, supabase)
    const { data: { user } } = await supabase.auth.getUser()
    return redirigirTrasConfirmar(request, origin, {
      forzado, next, metaNext: user?.user_metadata?.next_registro, porDefecto: '/dashboard',
    })
  }

  if (tokenHash) {
    if (type && TIPOS.has(type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'signup' | 'email' })
      if (!error) return continuar()
    }
    // Enlace usado o caducado. Si este aparato ya tiene la sesión de una
    // cuenta confirmada (p. ej. segundo clic en el mismo enlace), se entra.
    const { data: { user } } = await supabase.auth.getUser()
    if (user && reciente(user.email_confirmed_at)) return continuar()
    return NextResponse.redirect(urlResultado(origin, 'enlace'))
  }

  // Sin token: la pestaña del registro, ya con sesión.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/auth/login`)
  if (reciente(user.email_confirmed_at)) return continuar()
  return redirigirTrasConfirmar(request, origin, { next, porDefecto: '/dashboard' })
}
