import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * SEC-001 Fase 3: única puerta de entrada al registro público. El cliente ya
 * no llama a supabase.auth.signUp() directamente -- pasa siempre por aquí,
 * donde se valida el honeypot y el token de Turnstile antes de crear la cuenta.
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

export async function POST(req: NextRequest) {
  const { email, password, nombre, website, turnstileToken } = await req.json()

  // Honeypot: verificado también en servidor, no solo en el cliente.
  if (typeof website === 'string' && website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  if (typeof email !== 'string' || typeof password !== 'string' || typeof nombre !== 'string') {
    return NextResponse.json({ ok: false, code: 'invalid_input' }, { status: 400 })
  }

  const remoteIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  // Fail-closed: sin verificación válida de Turnstile, no se crea la cuenta.
  const turnstileOk = await verifyTurnstile(turnstileToken, remoteIp)
  if (!turnstileOk) {
    return NextResponse.json({ ok: false, code: 'turnstile_failed' }, { status: 400 })
  }

  const origin = new URL(req.url).origin
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
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
