import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { coordinateFlow } from '@/lib/verified/orquestador'
import { POST } from '../route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/verified/orquestador', () => ({
  coordinateFlow: vi.fn(),
}))

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/scenaia-verified', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function mockAuthenticatedUser(userId: string | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
  } as never)
}

beforeEach(() => {
  vi.mocked(createClient).mockReset()
  vi.mocked(coordinateFlow).mockReset()
})

describe('POST /api/scenaia-verified', () => {
  it('devuelve 401 si no hay sesión autenticada', async () => {
    mockAuthenticatedUser(null)

    const response = await POST(buildRequest({ message: 'hola' }))

    expect(response.status).toBe(401)
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('devuelve 400 si falta el campo "message"', async () => {
    mockAuthenticatedUser('profile-1')

    const response = await POST(buildRequest({}))

    expect(response.status).toBe(400)
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('invoca coordinateFlow con el userId autenticado, el mensaje y un SessionInput con locale por defecto "es"', async () => {
    mockAuthenticatedUser('profile-1')
    vi.mocked(coordinateFlow).mockResolvedValue({ responseType: 'RESPONSE_DIRECT' } as never)

    await POST(buildRequest({ message: 'hola ScenaIA' }))

    expect(coordinateFlow).toHaveBeenCalledWith(
      'profile-1',
      { route: null, module: null, locale: 'es' },
      'hola ScenaIA'
    )
  })

  it('propaga route/module/locale cuando se proporcionan', async () => {
    mockAuthenticatedUser('profile-1')
    vi.mocked(coordinateFlow).mockResolvedValue({ responseType: 'RESPONSE_DIRECT' } as never)

    await POST(buildRequest({ message: 'hola', route: '/perfil', module: 'perfil', locale: 'en' }))

    expect(coordinateFlow).toHaveBeenCalledWith(
      'profile-1',
      { route: '/perfil', module: 'perfil', locale: 'en' },
      'hola'
    )
  })

  it('devuelve el ResponseContext producido por coordinateFlow', async () => {
    mockAuthenticatedUser('profile-1')
    const responseContext = { responseType: 'RESPONSE_SUCCESS', responseContent: 'contenido' }
    vi.mocked(coordinateFlow).mockResolvedValue(responseContext as never)

    const response = await POST(buildRequest({ message: 'hola' }))
    const json = await response.json()

    expect(json).toEqual(responseContext)
  })
})
