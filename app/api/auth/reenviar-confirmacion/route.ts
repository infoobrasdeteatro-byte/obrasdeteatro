import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { translateAuthError } from '@/lib/auth-errors'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Envía un enlace de confirmación nuevo a una cuenta registrada que aún no ha
 * confirmado su correo (el del registro caduca). Usa el correo de
 * confirmación de Supabase de siempre, con la misma vuelta a /auth/callback.
 *
 * Responde igual exista o no la cuenta (no revela qué correos están
 * registrados). Supabase limita los envíos por dirección; ese límite sí se
 * comunica, para que la persona sepa que debe esperar.
 */
export async function POST(req: NextRequest) {
  const cuerpo = await req.json().catch(() => ({})) as { email?: unknown }
  const email = typeof cuerpo.email === 'string' ? cuerpo.email.trim().toLowerCase() : ''
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, code: 'email_invalido', message: 'Escribe un correo válido.' }, { status: 400 })
  }

  const origin = new URL(req.url).origin
  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error && /rate limit|security purposes|only request this after/i.test(error.message)) {
    return NextResponse.json({ ok: false, code: 'espera', message: translateAuthError(error.message, error.code) }, { status: 429 })
  }
  return NextResponse.json({ ok: true })
}
