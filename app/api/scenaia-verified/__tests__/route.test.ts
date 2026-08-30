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

/** Estado que el Orquestador devuelve al cerrar el turno (Fase 3). */
const ESTADO_NUEVO = { conversationId: 'c1', activeDomain: null, occupancyByDomain: [], stateVersion: 1, updatedAt: 'T' }


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
    vi.mocked(coordinateFlow).mockResolvedValue({
      responseContext: { responseType: 'RESPONSE_DIRECT' },
      conversationState: ESTADO_NUEVO,
    } as never)

    await POST(buildRequest({ message: 'hola ScenaIA' }))

    expect(coordinateFlow).toHaveBeenCalledWith(
      'profile-1',
      { route: null, module: null, locale: 'es' },
      'hola ScenaIA',
      [],
      null
    )
  })

  it('propaga route/module/locale cuando se proporcionan', async () => {
    mockAuthenticatedUser('profile-1')
    vi.mocked(coordinateFlow).mockResolvedValue({
      responseContext: { responseType: 'RESPONSE_DIRECT' },
      conversationState: ESTADO_NUEVO,
    } as never)

    await POST(buildRequest({ message: 'hola', route: '/perfil', module: 'perfil', locale: 'en' }))

    expect(coordinateFlow).toHaveBeenCalledWith(
      'profile-1',
      { route: '/perfil', module: 'perfil', locale: 'en' },
      'hola',
      [],
      null
    )
  })

  it('UX-001A: propaga un historial valido tal cual', async () => {
    mockAuthenticatedUser('profile-1')
    vi.mocked(coordinateFlow).mockResolvedValue({
      responseContext: { responseType: 'RESPONSE_DIRECT' },
      conversationState: ESTADO_NUEVO,
    } as never)
    const history = [
      { role: 'user', content: 'obras de lope de vega' },
      { role: 'assistant', content: 'Resultados encontrados: El caballero de Olmedo.' },
    ]

    await POST(buildRequest({ message: 'hola', history }))

    expect(coordinateFlow).toHaveBeenCalledWith('profile-1', { route: null, module: null, locale: 'es' }, 'hola', history, null)
  })

  it('UX-001A: descarta en silencio entradas de historial con forma invalida, sin lanzar excepcion', async () => {
    mockAuthenticatedUser('profile-1')
    vi.mocked(coordinateFlow).mockResolvedValue({
      responseContext: { responseType: 'RESPONSE_DIRECT' },
      conversationState: ESTADO_NUEVO,
    } as never)
    const history = [
      { role: 'user', content: 'valido' },
      { role: 'otro', content: 'rol invalido' },
      { role: 'assistant' },
      'no es un objeto',
      42,
    ]

    await POST(buildRequest({ message: 'hola', history }))

    expect(coordinateFlow).toHaveBeenCalledWith('profile-1', { route: null, module: null, locale: 'es' }, 'hola', [
      { role: 'user', content: 'valido' },
    ], null)
  })

  it('UX-001A: historial ausente o de forma incorrecta degrada a array vacío, nunca lanza', async () => {
    mockAuthenticatedUser('profile-1')
    vi.mocked(coordinateFlow).mockResolvedValue({
      responseContext: { responseType: 'RESPONSE_DIRECT' },
      conversationState: ESTADO_NUEVO,
    } as never)

    await POST(buildRequest({ message: 'hola', history: 'no es un array' }))

    expect(coordinateFlow).toHaveBeenCalledWith('profile-1', { route: null, module: null, locale: 'es' }, 'hola', [], null)
  })

  it('devuelve el ResponseContext producido por coordinateFlow, con el estado conversacional junto a el', async () => {
    mockAuthenticatedUser('profile-1')
    const responseContext = { responseType: 'RESPONSE_SUCCESS', responseContent: 'contenido' }
    vi.mocked(coordinateFlow).mockResolvedValue({ responseContext, conversationState: ESTADO_NUEVO } as never)

    const response = await POST(buildRequest({ message: 'hola' }))
    const json = await response.json()

    // El estado viaja JUNTO a la respuesta, nunca dentro de ella.
    expect(json).toEqual({ ...responseContext, conversationState: ESTADO_NUEVO })
  })
})

/**
 * FASE 3 — transporte del contexto conversacional entre el cliente y el
 * flujo. La API es la frontera de validacion: lo que entra se comprueba
 * aqui, y lo que no cumple se descarta ENTERO antes de llegar al
 * Orquestador.
 */
describe('POST /api/scenaia-verified — transporte de ConversationState', () => {
  const ESTADO_VALIDO = {
    conversationId: 'conv-1',
    activeDomain: 'Obras',
    occupancyByDomain: [{ domain: 'Obras', slots: { genero: 'COMEDIA' } }],
  }

  beforeEach(() => {
    mockAuthenticatedUser('profile-1')
    vi.mocked(coordinateFlow).mockResolvedValue({
      responseContext: { responseType: 'RESPONSE_SUCCESS', responseContent: 'ok' },
      conversationState: ESTADO_NUEVO,
    } as never)
  })

  const estadoRecibidoPorElFlujo = () => vi.mocked(coordinateFlow).mock.calls[0][4]

  it('A · primera peticion sin estado: el flujo lo recibe como ausente, nunca inventado', async () => {
    await POST(buildRequest({ message: 'hola' }))

    expect(estadoRecibidoPorElFlujo()).toBeNull()
  })

  it('B · la respuesta incluye el estado que emitio el servidor', async () => {
    const response = await POST(buildRequest({ message: 'hola' }))
    const json = await response.json()

    expect(json.conversationState).toEqual(ESTADO_NUEVO)
  })

  it('C · una segunda peticion reenvia el estado y este llega intacto al flujo', async () => {
    await POST(buildRequest({ message: 'y alguna mas larga', conversationState: ESTADO_VALIDO }))

    expect(estadoRecibidoPorElFlujo()).toEqual(ESTADO_VALIDO)
  })

  it('E · un estado invalido NO se acepta: se descarta entero y el turno degrada al comportamiento actual', async () => {
    const corrupto = {
      ...ESTADO_VALIDO,
      occupancyByDomain: [{ domain: 'Obras', slots: { genero: 'INVENTADO' } }],
    }

    await POST(buildRequest({ message: 'hola', conversationState: corrupto }))

    // Ni reparado ni aceptado a medias: null, y el flujo sigue como antes.
    expect(estadoRecibidoPorElFlujo()).toBeNull()
  })

  it('E · tampoco se acepta un dominio inexistente, ni una ranura inexistente', async () => {
    for (const invalido of [
      { ...ESTADO_VALIDO, activeDomain: 'Espacios' },
      { ...ESTADO_VALIDO, occupancyByDomain: [{ domain: 'Obras', slots: { color: 'COMEDIA' } }] },
      { ...ESTADO_VALIDO, conversationId: 'con espacios y texto libre' },
    ]) {
      vi.mocked(coordinateFlow).mockClear()
      await POST(buildRequest({ message: 'hola', conversationState: invalido }))

      expect(estadoRecibidoPorElFlujo()).toBeNull()
    }
  })

  it('E · un estado de forma arbitraria nunca hace fallar la peticion', async () => {
    for (const basura of ['texto', 42, [], true, null]) {
      vi.mocked(coordinateFlow).mockClear()
      const response = await POST(buildRequest({ message: 'hola', conversationState: basura }))

      expect(response.status).toBe(200)
      expect(estadoRecibidoPorElFlujo()).toBeNull()
    }
  })

  it('F · stateVersion y updatedAt del cliente se IGNORAN: no llegan al flujo', async () => {
    await POST(
      buildRequest({
        message: 'hola',
        conversationState: { ...ESTADO_VALIDO, stateVersion: 9999, updatedAt: '1999-01-01T00:00:00.000Z' },
      })
    )

    const recibido = estadoRecibidoPorElFlujo()

    expect(recibido).not.toHaveProperty('stateVersion')
    expect(recibido).not.toHaveProperty('updatedAt')
  })

  it('F · los campos de autoridad del estado devuelto proceden del servidor', async () => {
    const response = await POST(
      buildRequest({ message: 'hola', conversationState: { ...ESTADO_VALIDO, stateVersion: 9999 } })
    )
    const json = await response.json()

    expect(json.conversationState.stateVersion).toBe(ESTADO_NUEVO.stateVersion)
    expect(json.conversationState.updatedAt).toBe(ESTADO_NUEVO.updatedAt)
  })

  it('el estado no autoriza nada: un conversationId ajeno no altera la identidad del turno', async () => {
    await POST(buildRequest({ message: 'hola', conversationState: { ...ESTADO_VALIDO, conversationId: 'de-otro' } }))

    // El usuario del turno sigue siendo el de la sesion autenticada.
    expect(vi.mocked(coordinateFlow).mock.calls[0][0]).toBe('profile-1')
  })
})
