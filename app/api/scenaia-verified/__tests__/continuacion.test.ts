import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { coordinateFlow } from '@/lib/verified/orquestador'
import { resolveScenaiaAccess } from '@/lib/auth/scenaia-access'
import { LISTADO_DESPLAZAMIENTO_MAXIMO } from '@/lib/verified/orquestador/paginacion'
import { leerRespuestaDelTurno } from '@/app/scenaia/leer-respuesta'
import { CONTINUACION_NO_VALIDA } from '../input-limits'
import { POST } from '../route'

/**
 * SCENAIA-004B §4.2 y §4.7 (PR 3) -- la ruta: validación de la continuación,
 * interruptor apagado sin cambios byte a byte, y `listingPage` al lado del
 * estado, nunca dentro de la respuesta. Mismas simulaciones que route.test.ts.
 */

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/verified/orquestador', () => ({ coordinateFlow: vi.fn() }))
vi.mock('@/lib/auth/scenaia-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/scenaia-access')>()),
  resolveScenaiaAccess: vi.fn(),
}))

const ESTADO = { conversationId: 'c1', activeDomain: 'Obras', occupancyByDomain: [], stateVersion: 1, updatedAt: 'T' }
const RESPUESTA = { responseType: 'RESPONSE_DIRECT', responseContent: 'En obras he encontrado 11 resultados:', responseMetadata: {}, responseWarnings: [], responseTimestamp: 'T' }
const PAGINA = { from: 11, to: 11, total: 11, nextOffset: null }

function peticion(body: unknown) {
  return new NextRequest('http://localhost/api/scenaia-verified', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const ENV = { paginacion: process.env.SCENAIA_PAGINACION_ENABLED, streaming: process.env.SCENAIA_STREAMING }

beforeEach(() => {
  vi.mocked(createClient).mockReset().mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) } } as never)
  vi.mocked(resolveScenaiaAccess).mockReset().mockResolvedValue({ allowed: true, userId: 'user-1', plan: 'premium' })
  vi.mocked(coordinateFlow).mockReset().mockResolvedValue({ responseContext: RESPUESTA, conversationState: ESTADO } as never)
  delete process.env.SCENAIA_PAGINACION_ENABLED
  delete process.env.SCENAIA_STREAMING
})

afterEach(() => {
  for (const [clave, valor] of [['SCENAIA_PAGINACION_ENABLED', ENV.paginacion], ['SCENAIA_STREAMING', ENV.streaming]] as const) {
    if (valor === undefined) delete process.env[clave]
    else process.env[clave] = valor
  }
})

describe('continuación: validación (interruptor encendido)', () => {
  beforeEach(() => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
  })

  it.each([
    ['no es un objeto (número)', 10],
    ['no es un objeto (texto)', '10'],
    ['no es un objeto (lista)', [10]],
    ['no es un objeto (null)', null],
    ['offset no entero', { offset: 10.5 }],
    ['offset no numérico', { offset: '10' }],
    ['offset ausente', {}],
    ['offset negativo', { offset: -10 }],
    ['offset 0', { offset: 0 }],
    ['offset mayor que el máximo', { offset: LISTADO_DESPLAZAMIENTO_MAXIMO + 1 }],
  ])('%s: 400 "Continuación no válida", antes de entrar al flujo', async (_caso, continuation) => {
    const res = await POST(peticion({ message: 'dame la lista de obras', continuation }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: CONTINUACION_NO_VALIDA })
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('offset igual al máximo es válido y llega al flujo como sexto argumento', async () => {
    const res = await POST(peticion({ message: 'dame la lista de obras', continuation: { offset: LISTADO_DESPLAZAMIENTO_MAXIMO } }))

    expect(res.status).toBe(200)
    expect(vi.mocked(coordinateFlow).mock.calls[0]).toHaveLength(6)
    expect(vi.mocked(coordinateFlow).mock.calls[0][5]).toEqual({ offset: LISTADO_DESPLAZAMIENTO_MAXIMO })
  })

  it('sin continuación, el flujo recibe los cinco argumentos de siempre', async () => {
    await POST(peticion({ message: 'dame la lista de obras' }))

    expect(vi.mocked(coordinateFlow).mock.calls[0]).toHaveLength(5)
  })

  it('las demás cotas se siguen aplicando antes: un mensaje vacío sigue dando su 400 propio', async () => {
    const res = await POST(peticion({ message: '', continuation: { offset: 10 } }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).not.toBe(CONTINUACION_NO_VALIDA)
  })
})

describe('interruptor apagado: continuation se ignora y la respuesta es idéntica byte a byte', () => {
  it.each([
    ['válida', { offset: 10 }],
    ['inválida', { offset: -1 }],
    ['de forma arbitraria', 'lo que sea'],
  ])('continuación %s: sin 400, flujo con cinco argumentos, mismo cuerpo que sin ella', async (_caso, continuation) => {
    const sin = await POST(peticion({ message: 'dame la lista de obras' }))
    const con = await POST(peticion({ message: 'dame la lista de obras', continuation }))

    expect(con.status).toBe(200)
    expect(vi.mocked(coordinateFlow).mock.calls.every((llamada) => llamada.length === 5)).toBe(true)
    const [cuerpoSin, cuerpoCon] = [await sin.text(), await con.text()]
    expect(cuerpoCon).toBe(cuerpoSin)
    expect(cuerpoCon).toBe(JSON.stringify({ ...RESPUESTA, conversationState: ESTADO }))
  })
})

describe('listingPage en la respuesta (SCENAIA-004B §4.7)', () => {
  it('viaja al lado del estado y nunca dentro de la respuesta', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
    vi.mocked(coordinateFlow).mockResolvedValue({ responseContext: RESPUESTA, conversationState: ESTADO, listingPage: PAGINA } as never)

    const cuerpo = await (await POST(peticion({ message: 'dame la lista de obras', continuation: { offset: 10 } }))).json()

    expect(cuerpo.listingPage).toEqual(PAGINA)
    expect(cuerpo.conversationState).toEqual(ESTADO)
    expect(Object.keys(RESPUESTA)).not.toContain('listingPage')
  })

  it('sin listingPage en el resultado del flujo, la clave no aparece', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'

    const cuerpo = await (await POST(peticion({ message: 'dame la lista de obras' }))).json()

    expect('listingPage' in cuerpo).toBe(false)
  })

  it('llega igual por el canal NDJSON que por JSON', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
    vi.mocked(coordinateFlow).mockResolvedValue({ responseContext: RESPUESTA, conversationState: ESTADO, listingPage: PAGINA } as never)

    const json = await (await POST(peticion({ message: 'dame la lista de obras', continuation: { offset: 10 } }))).json()
    process.env.SCENAIA_STREAMING = '1'
    const res = await POST(peticion({ message: 'dame la lista de obras', continuation: { offset: 10 } }))

    expect(res.headers.get('content-type')).toMatch(/application\/x-ndjson/)
    expect(await leerRespuestaDelTurno(res)).toEqual(json)
  })
})
