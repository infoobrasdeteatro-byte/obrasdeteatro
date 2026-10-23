import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * AEC-003 Fase 4 (DA-002): callback dedicado para la confirmación de cambio
 * de correo -- separado de app/auth/callback/route.ts a propósito, para no
 * tocar el flujo de registro/recuperación ya certificado en SEC-001/AEC-001.
 * La sincronización de profiles.email ocurre en el trigger de base de datos
 * (on_auth_user_email_changed), no aquí -- este callback solo redirige.
 */
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
      return NextResponse.redirect(`${origin}/cuenta/correo?confirmado=true`)
    }
  }

  // Flujo Email OTP (fallback): token_hash + type en la URL
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}/cuenta/correo?confirmado=true`)
    }
  }

  // Cambio de correo seguro: al confirmar el primero de los dos enlaces,
  // Supabase redirige aquí sin code ni token, con un «message» de enlace
  // aceptado. No es un error: falta confirmar el enlace del otro correo.
  const mensaje = searchParams.get('message') ?? ''
  if (!searchParams.get('error') && /confirmation link accepted/i.test(mensaje)) {
    return NextResponse.redirect(`${origin}/cuenta/correo?pendiente=true`)
  }

  return NextResponse.redirect(`${origin}/cuenta/correo?expirado=true`)
}
