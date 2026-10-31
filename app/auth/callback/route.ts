import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import {
  aplicarEmbajadores, notifyWelcomeIfFirstConfirmation, redirigirTrasConfirmar, urlResultado, verifierEsDeRecuperacion,
} from '@/lib/auth/confirmacion'

/**
 * Vuelta de los correos de confirmación antiguos (enlace de Supabase con
 * PKCE) y de los de recuperación anteriores a /auth/callback/recovery.
 * Los correos nuevos de registro van a /auth/confirm, que no depende del
 * aparato. Si algo falla aquí en una confirmación de REGISTRO, nunca se
 * muestra el error de recuperación de contraseña:
 * - llegó un `code`: Supabase ya había confirmado el correo antes de
 *   redirigir, solo falta la sesión (p. ej. se abrió en el móvil y el code
 *   verifier está en el ordenador) → «Tu cuenta está confirmada»;
 * - sin `code` (enlace caducado o ya usado) → aviso del enlace, con la
 *   opción de pedir otro.
 * Solo una recuperación (verifier «/recovery» o type=recovery) vuelve, como
 * siempre, a /auth/recuperar?expired=true.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabase = await createClient()
  const esRecuperacion = type === 'recovery' || verifierEsDeRecuperacion(request)

  // Flujo PKCE: @supabase/ssr envía un code que intercambiamos por sesión
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await notifyWelcomeIfFirstConfirmation(supabase)
      return redirigirTrasConfirmar(request, origin, {
        forzado: await aplicarEmbajadores(request, supabase), porDefecto: '/auth/update-password',
      })
    }
    if (!esRecuperacion) return NextResponse.redirect(urlResultado(origin, 'confirmada'))
  }

  // Flujo Email OTP (fallback): token_hash + type en la URL
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      await notifyWelcomeIfFirstConfirmation(supabase)
      return redirigirTrasConfirmar(request, origin, {
        forzado: await aplicarEmbajadores(request, supabase), porDefecto: '/auth/update-password',
      })
    }
  }

  if (esRecuperacion) return NextResponse.redirect(`${origin}/auth/recuperar?expired=true`)
  return NextResponse.redirect(urlResultado(origin, 'enlace'))
}
