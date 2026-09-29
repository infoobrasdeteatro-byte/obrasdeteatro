import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { coordinateFlow } from '@/lib/verified/orquestador'
import { resolveScenaiaAccess } from '@/lib/auth/scenaia-access'
import { POST } from '../route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/verified/orquestador', () => ({ coordinateFlow: vi.fn() }))
vi.mock('@/lib/auth/scenaia-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/scenaia-access')>()),
  resolveScenaiaAccess: vi.fn(),
}))

/**
 * SCENAIA-007 §6.4 y adenda al §4.2: la ruta lee SCENAIA_EPOCA_ENABLED y lo
 * pasa a parseConversationState, que valida cada pareja ranura/concepto
 * contra el interruptor vigente. Una pareja incompatible descarta el estado
 * entero: el flujo lo recibe como ausente (null).
 */
const ESTADO_NUEVO = { conversationId: 'c1', activeDomain: null, occupancyByDomain: [], stateVersion: 1, updatedAt: 'T' }
const ENV_ORIGINAL = process.env.SCENAIA_EPOCA_ENABLED

function estado(slots: Record<string, string>) {
  return { conversationId: 'conv-1', activeDomain: 'Obras', occupancyByDomain: [{ domain: 'Obras', slots }] }
}

function peticion(conversationState: unknown) {
  return new NextRequest('http://localhost/api/scenaia-verified', {
    method: 'POST',
    body: JSON.stringify({ message: 'y alguna mas corta', conversationState }),
    headers: { 'content-type': 'application/json' },
  })
}

const estadoRecibidoPorElFlujo = () => vi.mocked(coordinateFlow).mock.calls[0][4]

beforeEach(() => {
  vi.mocked(createClient).mockReset().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'profile-1' } } }) },
  } as never)
  vi.mocked(resolveScenaiaAccess).mockReset().mockResolvedValue({ allowed: true, userId: 'profile-1', plan: 'premium' })
  vi.mocked(coordinateFlow).mockReset().mockResolvedValue({
    responseContext: { responseType: 'RESPONSE_SUCCESS', responseContent: 'ok' },
    conversationState: ESTADO_NUEVO,
  } as never)
  delete process.env.SCENAIA_EPOCA_ENABLED
})

afterEach(() => {
  if (ENV_ORIGINAL === undefined) delete process.env.SCENAIA_EPOCA_ENABLED
  else process.env.SCENAIA_EPOCA_ENABLED = ENV_ORIGINAL
})

describe('POST /api/scenaia-verified — estado heredado y época', () => {
  it('apagado: {genero: CLASICO} llega intacto; {epoca: CLASICO} se descarta entero', async () => {
    await POST(peticion(estado({ genero: 'CLASICO', duracion: 'CORTA' })))
    expect(estadoRecibidoPorElFlujo()).toEqual(estado({ genero: 'CLASICO', duracion: 'CORTA' }))

    vi.mocked(coordinateFlow).mockClear()
    await POST(peticion(estado({ epoca: 'CLASICO', duracion: 'CORTA' })))
    expect(estadoRecibidoPorElFlujo()).toBeNull()
  })

  it('encendido: {genero: CLASICO} se descarta entero; {epoca: CLASICO} y las épocas nuevas llegan intactas', async () => {
    process.env.SCENAIA_EPOCA_ENABLED = '1'

    await POST(peticion(estado({ genero: 'CLASICO', duracion: 'CORTA' })))
    expect(estadoRecibidoPorElFlujo()).toBeNull()

    vi.mocked(coordinateFlow).mockClear()
    await POST(peticion(estado({ epoca: 'CLASICO', genero: 'COMEDIA' })))
    expect(estadoRecibidoPorElFlujo()).toEqual(estado({ epoca: 'CLASICO', genero: 'COMEDIA' }))

    vi.mocked(coordinateFlow).mockClear()
    await POST(peticion(estado({ epoca: 'SIGLO_DE_ORO' })))
    expect(estadoRecibidoPorElFlujo()).toEqual(estado({ epoca: 'SIGLO_DE_ORO' }))
  })

  it('el turno sigue adelante aunque el estado se descarte: el flujo se invoca igual', async () => {
    process.env.SCENAIA_EPOCA_ENABLED = 'true'
    const res = await POST(peticion(estado({ genero: 'CLASICO' })))

    expect(res.status).toBe(200)
    expect(coordinateFlow).toHaveBeenCalledTimes(1)
  })
})
