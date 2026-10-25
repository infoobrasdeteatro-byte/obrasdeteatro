import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email/welcome-email'
import { safeNextPath, NEXT_TRAS_REGISTRO_COOKIE } from '@/lib/auth/next-param'
import { COOKIE_REFERIDO, codigoValido } from '@/lib/embajadores/textos'

/**
 * AEC-001: tras un intercambio de código/OTP exitoso, esta es la confirmación
 * efectiva del correo. Es el único punto que dispara el email de bienvenida --
 * nunca el momento del registro. `welcome_email_sent_at` garantiza el envío
 * como mucho una vez por cuenta, aunque este callback se visite más de una vez.
 */
async function notifyWelcomeIfFirstConfirmation(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return

  const { data } = await supabase
    .from('profiles')
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('welcome_email_sent_at', null)
    .select('nombre')
    .maybeSingle()

  if (data) {
    await sendWelcomeEmail({ email: user.email, nombre: data.nombre })
  }
}

/**
 * Destino tras confirmar: la ruta que el usuario traía al registrarse (cookie
 * NEXT_TRAS_REGISTRO_COOKIE, p. ej. /precios), si es una ruta interna válida;
 * si no, el de siempre. La cookie se borra en cualquier caso: sirve una vez.
 */
function redirigirTrasConfirmar(request: NextRequest, origin: string): NextResponse {
  const destino = safeNextPath(request.cookies.get(NEXT_TRAS_REGISTRO_COOKIE)?.value) ?? '/auth/update-password'
  const respuesta = NextResponse.redirect(`${origin}${destino}`)
  respuesta.cookies.delete(NEXT_TRAS_REGISTRO_COOKIE)
  respuesta.cookies.delete(COOKIE_REFERIDO)
  return respuesta
}

/**
 * Embajadores de Escena: si la persona llegó con el enlace personal de un/a
 * embajador/a, se canjea su mes de Premium. Las reglas (solo cuentas nuevas,
 * una vez por persona) las aplica canjear_referido. Un fallo no bloquea.
 */
async function canjearReferido(request: NextRequest, supabase: Awaited<ReturnType<typeof createClient>>): Promise<void> {
  const codigo = codigoValido(request.cookies.get(COOKIE_REFERIDO)?.value)
  if (!codigo) return
  try { await supabase.rpc('canjear_referido', { p_codigo: codigo }) } catch { /* no bloquea la confirmación */ }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabase = await createClient()

  // Flujo PKCE: @supabase/ssr envía un code que intercambiamos por sesión
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await notifyWelcomeIfFirstConfirmation(supabase)
      await canjearReferido(request, supabase)
      return redirigirTrasConfirmar(request, origin)
    }
  }

  // Flujo Email OTP (fallback): token_hash + type en la URL
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      await notifyWelcomeIfFirstConfirmation(supabase)
      await canjearReferido(request, supabase)
      return redirigirTrasConfirmar(request, origin)
    }
  }

  return NextResponse.redirect(`${origin}/auth/recuperar?expired=true`)
}
