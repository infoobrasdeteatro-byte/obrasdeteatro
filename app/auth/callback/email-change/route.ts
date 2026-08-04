import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/cuenta/correo?confirmado=true`)
    }
  }

  return NextResponse.redirect(`${origin}/cuenta/correo?expirado=true`)
}
