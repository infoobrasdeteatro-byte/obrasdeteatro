import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email/welcome-email'

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

export async function GET(request: Request) {
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
      return NextResponse.redirect(`${origin}/auth/update-password`)
    }
  }

  // Flujo Email OTP (fallback): token_hash + type en la URL
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      await notifyWelcomeIfFirstConfirmation(supabase)
      return NextResponse.redirect(`${origin}/auth/update-password`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/recuperar?expired=true`)
}
