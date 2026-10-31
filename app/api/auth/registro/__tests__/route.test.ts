import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase: comprobación de email existente (service) y signUp (sesión) ──
const mockSignUp = vi.fn()
const mockServicioRpc = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
    rpc: (...a: unknown[]) => mockServicioRpc(...a),
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

describe('POST /api/auth/registro — Embajadores de Escena', () => {
  const TOKEN = '372ede63068e4b46bf06d147ecc83444'
  const datos = () => mockSignUp.mock.calls[0][0].options.data

  it('desde una invitación, la guarda con la cuenta (vale aunque se confirme en otro navegador)', async () => {
    await POST(peticion({ next: `/invitacion/${TOKEN}` }))
    expect(datos().invitacion_embajador).toBe(TOKEN)
  })

  it('con el enlace de un/a embajador/a, guarda el código con la cuenta', async () => {
    const { NextRequest } = await import('next/server')
    const req = new NextRequest('https://app.test/api/auth/registro', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'odt_ref=ab12cd34' },
      body: JSON.stringify({ email: 'n@example.com', password: 'Segura123', nombre: 'N', website: '', turnstileToken: 't' }),
    })
    await POST(req)
    expect(datos().codigo_referido).toBe('AB12CD34')
  })

  it('sin invitación ni código, no añade nada', async () => {
    await POST(peticion({ next: '/precios' }))
    expect(datos()).not.toHaveProperty('invitacion_embajador')
    expect(datos()).not.toHaveProperty('codigo_referido')
  })
})

describe('POST /api/auth/registro — vuelta al confirmar en otro aparato', () => {
  const datos = () => mockSignUp.mock.calls[0][0].options.data

  it('guarda el next interno con la cuenta (lo usa /auth/confirm, donde no hay cookie)', async () => {
    await POST(peticion({ next: '/precios?plan=premium' }))
    expect(datos().next_registro).toBe('/precios?plan=premium')
  })

  it.each(['https://evil.example.com', '//evil.example.com', undefined])('no guarda un next no válido (%s)', async (next) => {
    await POST(peticion({ next }))
    expect(datos()).not.toHaveProperty('next_registro')
  })
})

describe('POST /api/auth/registro — «¿Te invitó alguien del Elenco Fundador?»', () => {
  const atribuciones = () => mockServicioRpc.mock.calls.filter(c => c[0] === 'elenco_atribuir').map(c => c[1])
  beforeEach(() => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockServicioRpc.mockResolvedValue({ data: 'ok', error: null })
  })
  async function conCookie(cookie: string, extra: Record<string, unknown> = {}) {
    const { NextRequest } = await import('next/server')
    return POST(new NextRequest('https://app.test/api/auth/registro', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ email: 'n@example.com', password: 'Segura123', nombre: 'N', website: '', turnstileToken: 't', ...extra }),
    }))
  }

  it('el número escrito se atribuye a la cuenta, como el enlace', async () => {
    const res = await POST(peticion({ numeroElenco: 'nº 007' }))
    expect(res.status).toBe(200)
    expect(atribuciones()).toEqual([{ p_perfil: 'u1', p_numero: 7 }])
  })

  it('si el número no corresponde a ningún fundador, no bloquea el registro', async () => {
    mockServicioRpc.mockResolvedValue({ data: 'no_valido', error: null })
    const res = await POST(peticion({ numeroElenco: '042' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('un número imposible se ignora sin llamar a la base', async () => {
    const res = await POST(peticion({ numeroElenco: '999' }))
    expect(res.status).toBe(200)
    expect(atribuciones()).toEqual([])
  })

  it('llega por /elenco/<nº>: campo y cookie con el mismo número, una sola atribución; la cookie se borra', async () => {
    const res = await conCookie('odt_elenco=007', { numeroElenco: '007' })
    expect(atribuciones()).toEqual([{ p_perfil: 'u1', p_numero: 7 }])
    expect(res.cookies.get('odt_elenco')?.value).toBe('')
  })

  it('el número escrito manda; si no es válido, se usa el del enlace', async () => {
    mockServicioRpc.mockResolvedValueOnce({ data: 'no_valido', error: null }).mockResolvedValueOnce({ data: 'ok', error: null })
    await conCookie('odt_elenco=007', { numeroElenco: '42' })
    expect(atribuciones()).toEqual([{ p_perfil: 'u1', p_numero: 42 }, { p_perfil: 'u1', p_numero: 7 }])
  })

  it('una vez atribuida (o ya atribuida), no se prueba otro número', async () => {
    mockServicioRpc.mockResolvedValue({ data: 'ya_atribuida', error: null })
    await conCookie('odt_elenco=007', { numeroElenco: '42' })
    expect(atribuciones()).toEqual([{ p_perfil: 'u1', p_numero: 42 }])
  })

  it('un fallo de la base no bloquea el registro', async () => {
    mockServicioRpc.mockRejectedValue(new Error('caída'))
    const res = await POST(peticion({ numeroElenco: '7' }))
    expect(res.status).toBe(200)
  })
})
