import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * /auth/confirm: el enlace nuevo del correo «Confirma tu cuenta». verifyOtp
 * en el servidor, sin code verifier: vale en cualquier aparato.
 */
type Usuario = { email?: string; email_confirmed_at?: string | null; user_metadata: Record<string, unknown> }
const mockVerify = vi.fn()
const mockRpc = vi.fn()
const mockBienvenida = vi.fn()
const mockUpdate = vi.fn()
let usuario: Usuario | null = null
// Simula la sesión del aparato: verifyOtp correcto la crea.
let usuarioTrasVerificar: Usuario | null = null

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      verifyOtp: async (args: unknown) => {
        const r = await mockVerify(args)
        if (!r.error) usuario = usuarioTrasVerificar
        return r
      },
      getUser: async () => ({ data: { user: usuario } }),
    },
    rpc: mockRpc,
    from: () => ({
      update: (v: unknown) => {
        mockUpdate(v)
        return { eq: () => ({ is: () => ({ select: () => ({ maybeSingle: async () => ({ data: { nombre: 'Lucía' } }) }) }) }) }
      },
    }),
  }),
}))
vi.mock('@/lib/email/welcome-email', () => ({ sendWelcomeEmail: (...a: unknown[]) => mockBienvenida(...a) }))

import { GET } from '../route'
import { NEXT_TRAS_REGISTRO_COOKIE } from '@/lib/auth/next-param'

const AHORA = new Date()
const recien = () => new Date(AHORA.getTime() - 60_000).toISOString()

function pedir(query: string, cookies: Record<string, string> = {}) {
  const headers = new Headers()
  const c = Object.entries(cookies).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ')
  if (c) headers.set('cookie', c)
  return new NextRequest(`https://app.test/auth/confirm${query}`, { headers })
}
const destino = (r: Response) => r.headers.get('location')

beforeEach(() => {
  vi.clearAllMocks()
  usuario = null
  usuarioTrasVerificar = { email: 'nueva@example.com', email_confirmed_at: recien(), user_metadata: {} }
  mockVerify.mockResolvedValue({ error: null })
  mockRpc.mockResolvedValue({ data: 'ok', error: null })
})

describe('GET /auth/confirm — mismo aparato del registro', () => {
  it('verifica el token_hash en el servidor y entra al panel', async () => {
    const res = await GET(pedir('?token_hash=hash123&type=signup'))

    expect(mockVerify).toHaveBeenCalledWith({ token_hash: 'hash123', type: 'signup' })
    expect(destino(res)).toBe('https://app.test/dashboard')
    expect(mockBienvenida).toHaveBeenCalledWith({ email: 'nueva@example.com', nombre: 'Lucía' })
  })

  it('respeta la cookie de vuelta del registro y la borra', async () => {
    const res = await GET(pedir('?token_hash=h&type=signup', { [NEXT_TRAS_REGISTRO_COOKIE]: '/precios' }))

    expect(destino(res)).toBe('https://app.test/precios')
    expect(res.cookies.get(NEXT_TRAS_REGISTRO_COOKIE)?.value).toBe('')
  })

  it('el next del enlace manda sobre la cookie (p. ej. una invitación del Elenco)', async () => {
    const token = 'a'.repeat(32)
    const res = await GET(pedir(`?token_hash=h&type=signup&next=${encodeURIComponent(`/elenco/invitacion/${token}`)}`, { [NEXT_TRAS_REGISTRO_COOKIE]: '/precios' }))

    expect(destino(res)).toBe(`https://app.test/elenco/invitacion/${token}`)
  })

  it.each(['https://evil.example.com', '//evil.example.com', '/auth/login'])('ignora un next no válido (%s)', async (next) => {
    const res = await GET(pedir(`?token_hash=h&type=signup&next=${encodeURIComponent(next)}`))

    expect(destino(res)).toBe('https://app.test/dashboard')
  })
})

describe('GET /auth/confirm — otro aparato (sin cookies del registro)', () => {
  it('crea la sesión en este aparato y usa el next guardado en la cuenta', async () => {
    usuarioTrasVerificar = { ...usuarioTrasVerificar!, user_metadata: { next_registro: '/precios?plan=premium' } }

    const res = await GET(pedir('?token_hash=h&type=signup'))

    expect(destino(res)).toBe('https://app.test/precios?plan=premium')
  })

  it('aplica Embajadores de Escena como el callback de siempre', async () => {
    const TOKEN = '372ede63068e4b46bf06d147ecc83444'
    usuarioTrasVerificar = { ...usuarioTrasVerificar!, user_metadata: { invitacion_embajador: TOKEN, next_registro: `/invitacion/${TOKEN}` } }

    const res = await GET(pedir('?token_hash=h&type=signup'))

    expect(mockRpc).toHaveBeenCalledWith('aceptar_invitacion_embajador', { p_token: TOKEN })
    expect(destino(res)).toBe('https://app.test/perfil/centro?embajador=1')
  })

  it('enlace usado o caducado: aviso del enlace, nunca el error de recuperación', async () => {
    mockVerify.mockResolvedValue({ error: { message: 'Email link is invalid or has expired' } })

    const res = await GET(pedir('?token_hash=h&type=signup'))

    expect(destino(res)).toBe('https://app.test/auth/confirmada?estado=enlace')
    expect(mockBienvenida).not.toHaveBeenCalled()
  })

  it('segundo clic en el mismo aparato, ya con sesión: entra', async () => {
    mockVerify.mockResolvedValue({ error: { message: 'Email link is invalid or has expired' } })
    usuario = { email: 'nueva@example.com', email_confirmed_at: recien(), user_metadata: {} }

    const res = await GET(pedir('?token_hash=h&type=signup'))

    expect(destino(res)).toBe('https://app.test/dashboard')
  })

  it('solo acepta tipos de confirmación de registro (no recovery ni otros)', async () => {
    const res = await GET(pedir('?token_hash=h&type=recovery'))

    expect(mockVerify).not.toHaveBeenCalled()
    expect(destino(res)).toBe('https://app.test/auth/confirmada?estado=enlace')
  })
})

describe('GET /auth/confirm — pestaña original del registro (ya ha iniciado sesión)', () => {
  it('sale por el mismo destino que el enlace del correo', async () => {
    usuario = { email: 'nueva@example.com', email_confirmed_at: recien(), user_metadata: {} }

    const res = await GET(pedir(`?next=${encodeURIComponent('/precios')}`))

    expect(mockVerify).not.toHaveBeenCalled()
    expect(destino(res)).toBe('https://app.test/precios')
  })

  it('aplica Embajadores si la confirmación es reciente', async () => {
    const TOKEN = '372ede63068e4b46bf06d147ecc83444'
    usuario = { email: 'n@example.com', email_confirmed_at: recien(), user_metadata: { invitacion_embajador: TOKEN } }
    mockRpc.mockResolvedValue({ data: 'ya_embajador', error: null })

    const res = await GET(pedir(''))

    expect(destino(res)).toBe('https://app.test/perfil/centro?embajador=1')
  })

  it('con una cuenta confirmada hace tiempo, no repite los pasos de confirmar', async () => {
    usuario = { email: 'n@example.com', email_confirmed_at: '2025-01-01T00:00:00Z', user_metadata: { invitacion_embajador: '372ede63068e4b46bf06d147ecc83444' } }

    const res = await GET(pedir(''))

    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockBienvenida).not.toHaveBeenCalled()
    expect(destino(res)).toBe('https://app.test/dashboard')
  })

  it('sin sesión, al login', async () => {
    const res = await GET(pedir(''))

    expect(destino(res)).toBe('https://app.test/auth/login')
  })
})
