import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { PASSWORD_POLICY } from '@/lib/auth/password-policy'

/**
 * SEC-001 Fase 3: única puerta de entrada al registro público. El cliente ya
 * no llama a supabase.auth.signUp() directamente -- pasa siempre por aquí,
 * donde se valida el honeypot y el token de Turnstile antes de crear la cuenta.
 *
 * AEC-001: además valida la política mínima de contraseñas y rechaza
 * correos ya registrados, sin crear cuenta ni enviar ningún email en ese caso.
 * AEC-003 DA-003: la política de contraseñas pasa a vivir en
 * lib/auth/password-policy.ts como fuente única -- sin cambio de comportamiento.
 */

async function verifyTurnstile(token: unknown, remoteIp: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret || typeof token !== 'string' || token.length === 0) return false

  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

async function emailAlreadyRegistered(email: string): Promise<boolean> {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()
  return !!data
}

export async function POST(req: NextRequest) {
  const { email, password, nombre, website, turnstileToken } = await req.json()

  // Honeypot: verificado también en servidor, no solo en el cliente.
  if (typeof website === 'string' && website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  if (typeof email !== 'string' || typeof password !== 'string' || typeof nombre !== 'string') {
    return NextResponse.json({ ok: false, code: 'invalid_input' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  if (!PASSWORD_POLICY.test(password)) {
    return NextResponse.json({ ok: false, code: 'weak_password' }, { status: 400 })
  }

  const remoteIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  // Fail-closed: sin verificación válida de Turnstile, no se crea la cuenta.
  // Se comprueba antes que la existencia del email para no convertir este
  // endpoint en un oráculo de enumeración de correos sin fricción.
  const turnstileOk = await verifyTurnstile(turnstileToken, remoteIp)
  if (!turnstileOk) {
    return NextResponse.json({ ok: false, code: 'turnstile_failed' }, { status: 400 })
  }

  if (await emailAlreadyRegistered(normalizedEmail)) {
    return NextResponse.json({ ok: false, code: 'email_exists' }, { status: 400 })
  }

  const origin = new URL(req.url).origin
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { nombre },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return NextResponse.json({ ok: false, code: 'signup_error', message: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
