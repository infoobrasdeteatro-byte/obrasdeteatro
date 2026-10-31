import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockExchange = vi.fn()
const mockRpc = vi.fn()
let usuario: { email?: string; user_metadata: Record<string, unknown> } | null = null
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mockExchange,
      verifyOtp: async () => ({ error: { message: 'Token has expired or is invalid' } }),
      // Sin email: el email de bienvenida no se envía en estos tests.
      getUser: async () => ({ data: { user: usuario } }),
    },
    rpc: mockRpc,
  }),
}))
vi.mock('@/lib/email/welcome-email', () => ({ sendWelcomeEmail: vi.fn() }))

import { GET } from '../route'
import { NEXT_TRAS_REGISTRO_COOKIE } from '@/lib/auth/next-param'

function confirmacion(cookie?: string) {
  const headers = new Headers()
  if (cookie !== undefined) headers.set('cookie', `${NEXT_TRAS_REGISTRO_COOKIE}=${encodeURIComponent(cookie)}`)
  return new NextRequest('https://app.test/auth/callback?code=abc', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockExchange.mockResolvedValue({ error: null })
  usuario = null
})

describe('GET /auth/callback — vuelta tras confirmar el registro', () => {
  it('con la cookie de vuelta, redirige a esa ruta y la borra', async () => {
    const res = await GET(confirmacion('/precios'))

    expect(res.headers.get('location')).toBe('https://app.test/precios')
    // Borrada: se reenvía vacía y caducada.
    const borrada = res.cookies.get(NEXT_TRAS_REGISTRO_COOKIE)
    expect(borrada?.value).toBe('')
  })

  it('sin cookie, mantiene el destino de siempre', async () => {
    const res = await GET(confirmacion())

    expect(res.headers.get('location')).toBe('https://app.test/auth/update-password')
  })

  it.each(['//evil.example.com', 'https://evil.example.com'])(
    'con una cookie que no es ruta interna (%s), usa el destino de siempre',
    async (cookie) => {
      const res = await GET(confirmacion(cookie))

      expect(res.headers.get('location')).toBe('https://app.test/auth/update-password')
    }
  )

  it('si la confirmación falla, no usa la cookie', async () => {
    mockExchange.mockResolvedValue({ error: { message: 'expirado' } })

    const res = await GET(confirmacion('/precios'))

    expect(res.headers.get('location')).toBe('https://app.test/auth/confirmada?estado=confirmada')
  })
})

describe('GET /auth/callback — registro confirmado en otro aparato (enlace antiguo)', () => {
  const pedir = (url: string, cookie?: string) => {
    const headers = new Headers()
    if (cookie) headers.set('cookie', cookie)
    return new NextRequest(url, { headers })
  }
  const VERIFIER = 'sb-ref-auth-token-code-verifier'
  const enBase64 = (v: string) => 'base64-' + Buffer.from(JSON.stringify(v)).toString('base64url')

  it('sin code verifier en este aparato: «Tu cuenta está confirmada», nunca el error de recuperación', async () => {
    mockExchange.mockResolvedValue({ error: { message: 'invalid request: both auth code and code verifier should be non-empty' } })

    const res = await GET(pedir('https://app.test/auth/callback?code=abc'))

    expect(res.headers.get('location')).toBe('https://app.test/auth/confirmada?estado=confirmada')
  })

  it('con el verifier de un registro (no de recuperación), tampoco muestra recuperación', async () => {
    mockExchange.mockResolvedValue({ error: { message: 'invalid flow state' } })

    const res = await GET(pedir('https://app.test/auth/callback?code=abc', `${VERIFIER}=${enBase64('verifier123')}`))

    expect(res.headers.get('location')).toBe('https://app.test/auth/confirmada?estado=confirmada')
  })

  it('enlace caducado (Supabase vuelve sin code): aviso del enlace con opción de pedir otro', async () => {
    const res = await GET(pedir('https://app.test/auth/callback?error=access_denied&error_code=otp_expired'))

    expect(res.headers.get('location')).toBe('https://app.test/auth/confirmada?estado=enlace')
  })

  it('recuperación de contraseña (verifier «/recovery»): sin cambios, a /auth/recuperar?expired=true', async () => {
    mockExchange.mockResolvedValue({ error: { message: 'expirado' } })

    for (const valor of [enBase64('verifier123/recovery'), encodeURIComponent(JSON.stringify('verifier123/recovery'))]) {
      const res = await GET(pedir('https://app.test/auth/callback?code=abc', `${VERIFIER}=${valor}`))
      expect(res.headers.get('location')).toBe('https://app.test/auth/recuperar?expired=true')
    }
  })

  it('recuperación por token_hash fallida: sin cambios, a /auth/recuperar?expired=true', async () => {
    const res = await GET(pedir('https://app.test/auth/callback?token_hash=x&type=recovery'))

    expect(res.headers.get('location')).toBe('https://app.test/auth/recuperar?expired=true')
  })
})

describe('GET /auth/callback — Embajadores de Escena', () => {
  const TOKEN = '372ede63068e4b46bf06d147ecc83444'

  it('registrada desde su invitación: la acepta al confirmar, sin cookie (otro navegador)', async () => {
    usuario = { user_metadata: { invitacion_embajador: TOKEN } }
    mockRpc.mockResolvedValue({ data: 'ok', error: null })

    const res = await GET(confirmacion())

    expect(mockRpc).toHaveBeenCalledWith('aceptar_invitacion_embajador', { p_token: TOKEN })
    expect(res.headers.get('location')).toBe('https://app.test/perfil/centro?embajador=1')
  })

  it('si la invitación ya no vale, vuelve a su página para ver el motivo', async () => {
    usuario = { user_metadata: { invitacion_embajador: TOKEN } }
    mockRpc.mockResolvedValue({ data: 'caducada', error: null })

    const res = await GET(confirmacion())

    expect(res.headers.get('location')).toBe(`https://app.test/invitacion/${TOKEN}`)
  })

  it('referido que confirma en otro navegador: canjea el código guardado en la cuenta', async () => {
    usuario = { user_metadata: { codigo_referido: 'AB12CD34' } }
    mockRpc.mockResolvedValue({ data: 'ok', error: null })

    await GET(confirmacion())

    expect(mockRpc).toHaveBeenCalledWith('canjear_referido', { p_codigo: 'AB12CD34' })
  })

  it('sin nada de embajadores, no llama a la base', async () => {
    usuario = { user_metadata: {} }
    await GET(confirmacion())
    expect(mockRpc).not.toHaveBeenCalled()
  })
})

describe('GET /auth/callback — Elenco Fundador (enlaces ya enviados)', () => {
  it('registrado desde su invitación del Elenco: la acepta y va a Mi red', async () => {
    const TOKEN = 'b'.repeat(32)
    usuario = { user_metadata: { invitacion_elenco: TOKEN } }
    mockRpc.mockResolvedValue({ data: 'ok', error: null })

    const res = await GET(confirmacion())

    expect(mockRpc).toHaveBeenCalledWith('aceptar_invitacion_elenco', { p_token: TOKEN })
    expect(res.headers.get('location')).toBe('https://app.test/perfil/red?elenco=1')
  })
})
