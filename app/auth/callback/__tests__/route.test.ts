import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockExchange = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mockExchange,
      verifyOtp: vi.fn(),
      // Sin usuario: el email de bienvenida no se envía en estos tests.
      getUser: async () => ({ data: { user: null } }),
    },
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

    expect(res.headers.get('location')).toBe('https://app.test/auth/recuperar?expired=true')
  })
})
