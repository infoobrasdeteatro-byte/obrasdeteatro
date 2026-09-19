import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase: comprobación de email existente (service) y signUp (sesión) ──
const mockSignUp = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signUp: mockSignUp } }),
}))

import { POST } from '../route'
import { NEXT_TRAS_REGISTRO_COOKIE } from '@/lib/auth/next-param'

function peticion(extra: Record<string, unknown> = {}) {
  const body = {
    email: 'nueva@example.com',
    password: 'Segura123',
    nombre: 'Nueva',
    website: '',
    turnstileToken: 'token-ok',
    ...extra,
  }
  return new Request('https://app.test/api/auth/registro', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.TURNSTILE_SECRET_KEY = 'secreto'
  mockSignUp.mockResolvedValue({ error: null })
  // Turnstile siempre valida en estos tests.
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ success: true }) })))
})

describe('POST /api/auth/registro — vuelta tras el registro (next)', () => {
  it('con un next interno válido, guarda la cookie de vuelta', async () => {
    const res = await POST(peticion({ next: '/precios' }))

    expect(res.status).toBe(200)
    const cookie = res.cookies.get(NEXT_TRAS_REGISTRO_COOKIE)
    expect(cookie?.value).toBe('/precios')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.path).toBe('/')
  })

  it('sin next, no guarda ninguna cookie de vuelta', async () => {
    const res = await POST(peticion())

    expect(res.status).toBe(200)
    expect(res.cookies.get(NEXT_TRAS_REGISTRO_COOKIE)).toBeUndefined()
  })

  it.each(['https://evil.example.com', '//evil.example.com', 'precios'])(
    'con un next no válido (%s), no guarda la cookie',
    async (next) => {
      const res = await POST(peticion({ next }))

      expect(res.status).toBe(200)
      expect(res.cookies.get(NEXT_TRAS_REGISTRO_COOKIE)).toBeUndefined()
    }
  )

  it('si el registro falla, no guarda la cookie', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'boom' } })

    const res = await POST(peticion({ next: '/precios' }))

    expect(res.status).toBe(400)
    expect(res.cookies.get(NEXT_TRAS_REGISTRO_COOKIE)).toBeUndefined()
  })
})
