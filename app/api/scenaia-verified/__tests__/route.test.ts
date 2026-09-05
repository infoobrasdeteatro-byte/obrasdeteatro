import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { coordinateFlow } from '@/lib/verified/orquestador'
import { resolveScenaiaAccess } from '@/lib/auth/scenaia-access'
import {
  MAX_USER_PROMPT_CHARACTERS,
  MAX_HISTORY_TURNS,
  MAX_HISTORY_CHARACTERS,
  MENSAJE_DEMASIADO_LARGO,
  HISTORIAL_DEMASIADOS_TURNOS,
  HISTORIAL_DEMASIADO_LARGO,
} from '../input-limits'
import { POST } from '../route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/verified/orquestador', () => ({
  coordinateFlow: vi.fn(),
}))

/*
 * P1.3 -- el acceso se decide en un punto unico, y este endpoint solo lo
 * consulta. Estas pruebas miden ENRUTADO, no politica: se les concede el
 * acceso por defecto para que sigan midiendo lo suyo. La politica tiene sus
 * propias pruebas, y la denegacion las suyas mas abajo.
 */
vi.mock('@/lib/auth/scenaia-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/scenaia-access')>()),
  resolveScenaiaAccess: vi.fn(),
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

  // El veredicto acompana a la sesion: asi ninguna prueba de enrutado tiene
  // que recordar mantener los dos en sintonia. Las de acceso lo sobrescriben.
  vi.mocked(resolveScenaiaAccess).mockResolvedValue(
    userId === null
      ? { allowed: false, reason: 'no_autenticado' }
      : { allowed: true, userId, plan: 'premium' }
  )
}

beforeEach(() => {
  vi.mocked(createClient).mockReset()
  vi.mocked(coordinateFlow).mockReset()
  vi.mocked(resolveScenaiaAccess)
    .mockReset()
    .mockResolvedValue({ allowed: true, userId: 'user-1', plan: 'premium' })
})

describe('POST /api/scenaia-verified', () => {
  it('devuelve 401 si no hay sesión autenticada', async () => {
    vi.mocked(resolveScenaiaAccess).mockResolvedValue({ allowed: false, reason: 'no_autenticado' })
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


/**
 * P1.3 — EL ENDPOINT ES LA FRONTERA.
 *
 * La pagina se puede saltar: basta una peticion con la cookie de sesion.
 * Antes de este bloque, eso bastaba para ejecutar un turno completo -- y
 * consumir credito -- sin estar verificado. Estas pruebas fijan que la
 * decision es la misma se llegue por donde se llegue.
 */
describe('POST /api/scenaia-verified — control de acceso (P1.3)', () => {
  const cuerpo = { message: 'hola' }

  it('9 · LLAMADA DIRECTA sin verificar: 403, y el turno NO se ejecuta', async () => {
    mockAuthenticatedUser('user-1')
    vi.mocked(resolveScenaiaAccess).mockResolvedValue({ allowed: false, reason: 'no_verificado' })

    const res = await POST(buildRequest(cuerpo))

    expect(res.status).toBe(403)
    // Lo importante no es el codigo: es que no se gasto nada.
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('9b · sin plan reconocido: 403 y sin ejecucion', async () => {
    mockAuthenticatedUser('user-1')
    vi.mocked(resolveScenaiaAccess).mockResolvedValue({ allowed: false, reason: 'plan_no_reconocido' })

    const res = await POST(buildRequest(cuerpo))

    expect(res.status).toBe(403)
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('9c · sin sesion: 401 y sin ejecucion', async () => {
    vi.mocked(resolveScenaiaAccess).mockResolvedValue({ allowed: false, reason: 'no_autenticado' })
    mockAuthenticatedUser(null)

    const res = await POST(buildRequest(cuerpo))

    expect(res.status).toBe(401)
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('la causa viaja como DATO, no como frase', async () => {
    mockAuthenticatedUser('user-1')
    vi.mocked(resolveScenaiaAccess).mockResolvedValue({ allowed: false, reason: 'no_verificado' })

    const res = await POST(buildRequest(cuerpo))

    expect(await res.json()).toMatchObject({ reason: 'no_verificado' })
  })

  it('10 · con acceso concedido continua hacia coordinateFlow, con el usuario del veredicto', async () => {
    mockAuthenticatedUser('user-7')
    vi.mocked(resolveScenaiaAccess).mockResolvedValue({ allowed: true, userId: 'user-7', plan: 'gratuito' })
    vi.mocked(coordinateFlow).mockResolvedValue({
      responseContext: { responseType: 'RESPONSE_SUCCESS', responseContent: 'ok', responseMetadata: {}, responseWarnings: [], responseTimestamp: 'T' },
      conversationState: ESTADO_NUEVO,
    } as never)

    const res = await POST(buildRequest(cuerpo))

    expect(res.status).toBe(200)
    expect(coordinateFlow).toHaveBeenCalledTimes(1)
    expect(vi.mocked(coordinateFlow).mock.calls[0][0]).toBe('user-7')
  })

  it('EL ENDPOINT NO DECIDE: delega siempre, sin condiciones propias', async () => {
    mockAuthenticatedUser('user-1')
    vi.mocked(coordinateFlow).mockResolvedValue({
      responseContext: { responseType: 'RESPONSE_SUCCESS', responseContent: 'ok', responseMetadata: {}, responseWarnings: [], responseTimestamp: 'T' },
      conversationState: ESTADO_NUEVO,
    } as never)

    await POST(buildRequest(cuerpo))

    expect(resolveScenaiaAccess).toHaveBeenCalledTimes(1)
  })
})


/**
 * P1-A — NINGUNA EXCEPCION SALE SIN FORMA.
 *
 * Este endpoint no tenia un solo `try`. Un cuerpo mal escrito o cualquier
 * caida interna producian un 500 del entorno de ejecucion, sin el contrato
 * de ScenaIA y sin el mensaje autorizado: toda la diferenciacion que UX-002
 * habia construido se perdia justo cuando mas falta hacia.
 */
describe('POST /api/scenaia-verified — frontera de errores (P1-A)', () => {
  /** El registro tecnico es deliberado; en las pruebas solo estorba. */
  function silenciarRegistro() {
    return vi.spyOn(console, 'error').mockImplementation(() => {})
  }

  /** Peticion cuyo cuerpo NO es JSON valido. */
  function peticionMalformada(cuerpoCrudo: string) {
    return new NextRequest('http://localhost/api/scenaia-verified', {
      method: 'POST',
      body: cuerpoCrudo,
      headers: { 'content-type': 'application/json' },
    })
  }

  it('1 · JSON MALFORMADO: respuesta con forma, nunca una excepcion sin controlar', async () => {
    mockAuthenticatedUser('user-1')

    const res = await POST(peticionMalformada('{ esto no es json'))

    // Se conserva la semantica que el contrato ya tenia para una peticion
    // sin mensaje utilizable: no se inventa un codigo publico nuevo.
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Falta el campo "message"' })
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('1b · CUERPO NULO: tampoco estalla al leer `message`', async () => {
    mockAuthenticatedUser('user-1')

    const res = await POST(peticionMalformada('null'))

    expect(res.status).toBe(400)
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('1c · CUERPO NO OBJETO: una cadena o un numero degradan igual', async () => {
    mockAuthenticatedUser('user-1')

    for (const crudo of ['"hola"', '42', '[]']) {
      const res = await POST(peticionMalformada(crudo))
      expect(res.status, crudo).toBe(400)
    }
  })

  it('2 · EXCEPCION DEL ORQUESTADOR: 500 con el contrato y el texto autorizado', async () => {
    const registro = silenciarRegistro()
    mockAuthenticatedUser('user-1')
    vi.mocked(coordinateFlow).mockRejectedValue(new Error('el RPC de contabilidad no responde'))

    const res = await POST(buildRequest({ message: 'hola' }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'No ha sido posible completar esta solicitud. Inténtalo de nuevo.' })
    // Lo tecnico no se pierde: se queda en el registro, que es su sitio.
    expect(registro).toHaveBeenCalled()
    registro.mockRestore()
  })

  it('3 · el 500 NO lleva traza: ni el campo, ni su forma', async () => {
    const registro = silenciarRegistro()
    mockAuthenticatedUser('user-1')
    const fallo = new Error('boom')
    fallo.stack = 'Error: boom\n    at atenderPeticion (/app/api/scenaia-verified/route.ts:99:9)'
    vi.mocked(coordinateFlow).mockRejectedValue(fallo)

    const cuerpo = JSON.stringify(await (await POST(buildRequest({ message: 'hola' }))).json())

    expect(cuerpo).not.toMatch(/stack/i)
    expect(cuerpo).not.toMatch(/\bat \w+ \(/)
    expect(cuerpo).not.toMatch(/route\.ts/)
    registro.mockRestore()
  })

  it('4 · el 500 NO lleva mensaje tecnico interno', async () => {
    const registro = silenciarRegistro()
    mockAuthenticatedUser('user-1')
    vi.mocked(coordinateFlow).mockRejectedValue(
      new Error('supabase: permission denied for relation credit_reservations (SQLSTATE 42501)')
    )

    const cuerpo = JSON.stringify(await (await POST(buildRequest({ message: 'hola' }))).json())

    expect(cuerpo).not.toMatch(/supabase|SQLSTATE|credit_reservations|permission denied/i)
    registro.mockRestore()
  })

  it('5 · UNA AVERIA NO ES UNA DENEGACION: no se fabrica ningun denialCode ni motivo', async () => {
    const registro = silenciarRegistro()
    mockAuthenticatedUser('user-1')
    vi.mocked(coordinateFlow).mockRejectedValue(new Error('caida interna'))

    const res = await POST(buildRequest({ message: 'hola' }))
    const cuerpo = await res.json()

    expect(res.status).toBe(500)
    // Ni codigo economico, ni motivo de acceso: el vocabulario de
    // denegacion solo puede representar sus causas reales.
    expect(cuerpo).not.toHaveProperty('denialCode')
    expect(cuerpo).not.toHaveProperty('reason')
    expect(cuerpo).not.toHaveProperty('responseMetadata')
    expect(Object.keys(cuerpo)).toEqual(['error'])
    registro.mockRestore()
  })

  it('6 · LA DENEGACION CONTROLADA CONSERVA SU SEMANTICA: sigue siendo 403 con su motivo', async () => {
    // La sesion primero: `mockAuthenticatedUser` fija tambien el veredicto,
    // y ponerlo despues borraria la denegacion que esta prueba mide.
    mockAuthenticatedUser('user-1')
    vi.mocked(resolveScenaiaAccess).mockResolvedValue({ allowed: false, reason: 'no_verificado' })

    const res = await POST(buildRequest({ message: 'hola' }))

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ reason: 'no_verificado' })
  })

  it('6b · una denegacion ECONOMICA sigue llegando como turno, con su denialCode intacto', async () => {
    // El nuevo `try` no puede convertir en averia lo que el Nucleo clasifico
    // correctamente: sigue siendo 200 y sigue trayendo su codigo.
    mockAuthenticatedUser('user-1')
    vi.mocked(coordinateFlow).mockResolvedValue({
      responseContext: {
        responseType: 'RESPONSE_DENIED',
        responseContent: null,
        responseMetadata: { denialCode: 'insufficient_ai_credits' },
        responseWarnings: [],
        responseTimestamp: 'T',
      },
      conversationState: ESTADO_NUEVO,
    } as never)

    const res = await POST(buildRequest({ message: 'hola' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ responseMetadata: { denialCode: 'insufficient_ai_credits' } })
  })

  it('la frontera NO cierra ni reabre nada economico: solo traduce', async () => {
    const registro = silenciarRegistro()
    mockAuthenticatedUser('user-1')
    vi.mocked(coordinateFlow).mockRejectedValue(new Error('caida interna'))

    await POST(buildRequest({ message: 'hola' }))

    // El cierre ya ocurrio dentro del Orquestador (P1.2). Aqui no se
    // reintenta el turno ni se vuelve a invocar el flujo.
    expect(coordinateFlow).toHaveBeenCalledTimes(1)
    registro.mockRestore()
  })
})


/**
 * H1/H2 — COTAS DE ADMISION DE ENTRADA.
 *
 * Hasta este bloque no habia ninguna. Un mensaje de un megabyte o un
 * historial de diez mil turnos entraban enteros al prompt, se estimaban, se
 * reservaban y se enviaban al proveedor; lo unico que los contenia era la
 * cuota, que no existe para `empresas`.
 *
 * Las cifras se IMPORTAN de la fuente unica: si alguien cambia una cota,
 * estas pruebas siguen midiendo la cota vigente y no una copia.
 */
describe('POST /api/scenaia-verified — cotas de entrada (H1/H2)', () => {
  /** El turno completo no es lo que se mide aqui: solo si llega a ejecutarse. */
  function conFlujoOk() {
    vi.mocked(coordinateFlow).mockResolvedValue({
      responseContext: { responseType: 'RESPONSE_SUCCESS', responseContent: 'ok', responseMetadata: {}, responseWarnings: [], responseTimestamp: 'T' },
      conversationState: ESTADO_NUEVO,
    } as never)
  }

  /** Historial valido de `entradas` elementos, repartiendo `caracteres` entre ellos. */
  function historial(entradas: number, caracteres: number) {
    const porEntrada = Math.floor(caracteres / entradas)
    const resto = caracteres - porEntrada * entradas

    return Array.from({ length: entradas }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: 'x'.repeat(porEntrada + (i === 0 ? resto : 0)),
    }))
  }

  /** El historial que de verdad llego al flujo. */
  function historialRecibido() {
    return vi.mocked(coordinateFlow).mock.calls[0]?.[3] ?? null
  }

  beforeEach(() => {
    mockAuthenticatedUser('user-1')
    conFlujoOk()
  })

  // ---------------------------------------------------------------- H2

  it('H2 · un mensaje normal continua', async () => {
    const res = await POST(buildRequest({ message: 'busco algo divertido para tres personas' }))

    expect(res.status).toBe(200)
    expect(coordinateFlow).toHaveBeenCalledTimes(1)
  })

  it('H2 · EXACTAMENTE en el limite: continua', async () => {
    const res = await POST(buildRequest({ message: 'a'.repeat(MAX_USER_PROMPT_CHARACTERS) }))

    expect(res.status).toBe(200)
    expect(coordinateFlow).toHaveBeenCalledTimes(1)
  })

  it('H2 · UNO por encima del limite: 400', async () => {
    const res = await POST(buildRequest({ message: 'a'.repeat(MAX_USER_PROMPT_CHARACTERS + 1) }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: MENSAJE_DEMASIADO_LARGO })
  })

  it('H2 · el rechazo ocurre ANTES del flujo: sin estimacion, sin reserva, sin proveedor', async () => {
    // `coordinateFlow` es la unica puerta hacia la estimacion, la reserva y
    // el proveedor -- una invariante comprueba que este endpoint no importa
    // ninguno de los tres. No llamarlo es no llegar a ninguno.
    await POST(buildRequest({ message: 'a'.repeat(MAX_USER_PROMPT_CHARACTERS + 1) }))

    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('H2 · una entrada enorme no atraviesa la frontera', async () => {
    const res = await POST(buildRequest({ message: 'a'.repeat(1_000_000) }))

    expect(res.status).toBe(400)
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('H2 · NO SE TRUNCA: o pasa entero, o no pasa', async () => {
    const mensaje = 'a'.repeat(MAX_USER_PROMPT_CHARACTERS)

    await POST(buildRequest({ message: mensaje }))

    expect(vi.mocked(coordinateFlow).mock.calls[0][2]).toBe(mensaje)
  })

  it('H2 · se mide en unidades UTF-16, la misma unidad que `promptCharacters`', async () => {
    // Un emoji fuera del BMP son DOS unidades de codigo. La cota cuenta lo
    // mismo que el estimador; que esa unidad no equivalga a un token es un
    // asunto distinto y registrado, ajeno a este bloque.
    const emoji = '\u{1F3AD}'
    expect(emoji.length).toBe(2)

    const justo = emoji.repeat(MAX_USER_PROMPT_CHARACTERS / 2)
    expect(justo.length).toBe(MAX_USER_PROMPT_CHARACTERS)
    expect((await POST(buildRequest({ message: justo }))).status).toBe(200)

    vi.mocked(coordinateFlow).mockClear()
    const pasado = emoji.repeat(MAX_USER_PROMPT_CHARACTERS / 2 + 1)
    expect((await POST(buildRequest({ message: pasado }))).status).toBe(400)
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('H2 · los casos previos del contrato NO cambian', async () => {
    for (const cuerpo of [{}, { message: 42 }, { message: '   ' }, { message: '' }]) {
      vi.mocked(coordinateFlow).mockClear()
      const res = await POST(buildRequest(cuerpo))

      expect(res.status, JSON.stringify(cuerpo)).toBe(400)
      expect(await res.json()).toEqual({ error: 'Falta el campo "message"' })
      expect(coordinateFlow).not.toHaveBeenCalled()
    }
  })

  // ---------------------------------------------------------------- H1

  it('H1 · sin historial y con historial corto: continua', async () => {
    for (const history of [undefined, [], historial(2, 100)]) {
      vi.mocked(coordinateFlow).mockClear()
      const res = await POST(buildRequest({ message: 'hola', history }))

      expect(res.status).toBe(200)
      expect(coordinateFlow).toHaveBeenCalledTimes(1)
    }
  })

  it('H1 · EXACTAMENTE en el limite de turnos: continua', async () => {
    const res = await POST(buildRequest({ message: 'hola', history: historial(MAX_HISTORY_TURNS, 200) }))

    expect(res.status).toBe(200)
    expect(historialRecibido()).toHaveLength(MAX_HISTORY_TURNS)
  })

  it('H1 · UNO por encima del limite de turnos: 400', async () => {
    const res = await POST(buildRequest({ message: 'hola', history: historial(MAX_HISTORY_TURNS + 1, 200) }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: HISTORIAL_DEMASIADOS_TURNOS })
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('H1 · EXACTAMENTE en el limite de caracteres: continua', async () => {
    const history = historial(2, MAX_HISTORY_CHARACTERS)
    expect(history.reduce((t, turno) => t + turno.content.length, 0)).toBe(MAX_HISTORY_CHARACTERS)

    const res = await POST(buildRequest({ message: 'hola', history }))

    expect(res.status).toBe(200)
    expect(coordinateFlow).toHaveBeenCalledTimes(1)
  })

  it('H1 · UNO por encima del limite de caracteres: 400', async () => {
    const res = await POST(buildRequest({ message: 'hola', history: historial(2, MAX_HISTORY_CHARACTERS + 1) }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: HISTORIAL_DEMASIADO_LARGO })
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('H1 · UNA SOLA entrada gigante basta para rechazar: la cota es del historial entero', async () => {
    const res = await POST(
      buildRequest({ message: 'hola', history: [{ role: 'user', content: 'x'.repeat(MAX_HISTORY_CHARACTERS + 1) }] })
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: HISTORIAL_DEMASIADO_LARGO })
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('H1 · superar AMBAS cotas produce siempre la misma respuesta', async () => {
    const excesivo = historial(MAX_HISTORY_TURNS + 5, MAX_HISTORY_CHARACTERS + 5_000)

    const primera = await POST(buildRequest({ message: 'hola', history: excesivo }))
    const segunda = await POST(buildRequest({ message: 'hola', history: excesivo }))

    expect(primera.status).toBe(400)
    expect(await primera.json()).toEqual(await segunda.json())
    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('H1 · el rechazo ocurre ANTES del flujo: sin composePrompt, sin estimacion, sin reserva, sin proveedor', async () => {
    await POST(buildRequest({ message: 'hola', history: historial(MAX_HISTORY_TURNS + 1, 100) }))

    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('H1 · NO SE TRUNCA: el historial admitido llega intacto', async () => {
    const history = historial(MAX_HISTORY_TURNS, MAX_HISTORY_CHARACTERS)

    await POST(buildRequest({ message: 'hola', history }))

    const recibido = historialRecibido()
    expect(recibido).toEqual(history)
    expect(recibido?.reduce((t, turno) => t + turno.content.length, 0)).toBe(MAX_HISTORY_CHARACTERS)
  })

  it('H1 · NO SE DESCARTAN TURNOS ANTIGUOS para hacerlo entrar', async () => {
    // Quedarse con los ultimos N seria truncar en silencio: el usuario
    // creeria que ScenaIA recuerda una conversacion que nunca ha leido.
    await POST(buildRequest({ message: 'hola', history: historial(MAX_HISTORY_TURNS + 1, 100) }))

    expect(coordinateFlow).not.toHaveBeenCalled()
  })

  it('H1 · los elementos individualmente invalidos CONSERVAN su trato: se descartan, no rechazan', async () => {
    const res = await POST(
      buildRequest({
        message: 'hola',
        history: [
          { role: 'user', content: 'valida' },
          { role: 'sistema', content: 'rol inexistente' },
          { role: 'assistant', content: 42 },
          null,
          'ni siquiera es un objeto',
          { role: 'assistant', content: 'tambien valida' },
        ],
      })
    )

    expect(res.status).toBe(200)
    expect(historialRecibido()).toEqual([
      { role: 'user', content: 'valida' },
      { role: 'assistant', content: 'tambien valida' },
    ])
  })

  it('H1 · las cotas se miden sobre lo ADMITIDO: lo descartado no cuenta para rechazar', async () => {
    // Decision documentada: lo que `parseHistory` descarta no llega al
    // prompt, ni a la estimacion, ni al proveedor, de modo que no puede
    // contribuir a la desproporcion que estas cotas impiden.
    const invalidas = Array.from({ length: 100 }, () => ({ role: 'sistema', content: 'x'.repeat(1_000) }))
    const validas = historial(2, 100)

    const res = await POST(buildRequest({ message: 'hola', history: [...invalidas, ...validas] }))

    expect(res.status).toBe(200)
    expect(historialRecibido()).toHaveLength(2)
  })

  it('H1 · un historial que no es array sigue degradando a vacio, nunca rechaza', async () => {
    const res = await POST(buildRequest({ message: 'hola', history: 'no es un array' }))

    expect(res.status).toBe(200)
    expect(historialRecibido()).toEqual([])
  })

  // ------------------------------------------------------------ ECONOMIA

  it('ECONOMIA · ningun rechazo de H1/H2 genera un denialCode ni consume creditos', async () => {
    const rechazos = [
      { message: 'a'.repeat(MAX_USER_PROMPT_CHARACTERS + 1) },
      { message: 'hola', history: historial(MAX_HISTORY_TURNS + 1, 100) },
      { message: 'hola', history: historial(2, MAX_HISTORY_CHARACTERS + 1) },
    ]

    for (const cuerpo of rechazos) {
      vi.mocked(coordinateFlow).mockClear()
      const res = await POST(buildRequest(cuerpo))
      const body = await res.json()

      expect(res.status).toBe(400)
      // Un limite de entrada NO es un problema economico.
      expect(Object.keys(body)).toEqual(['error'])
      expect(body).not.toHaveProperty('denialCode')
      expect(body).not.toHaveProperty('reason')
      expect(JSON.stringify(body)).not.toMatch(/credit|cuota|plan/i)
      // Y no se llega a reservar ni a liquidar nada: el flujo no se invoca.
      expect(coordinateFlow).not.toHaveBeenCalled()
    }
  })

  // ---------------------------------------------------------- REGRESION

  it('REGRESION · una conversacion normal sigue funcionando igual que antes', async () => {
    const history = [
      { role: 'user', content: 'busco algo divertido para montar entre tres o cuatro personas' },
      { role: 'assistant', content: 'Resultados encontrados: El caballero de Olmedo.' },
      { role: 'user', content: '¿y alguna más corta?' },
      { role: 'assistant', content: 'Resultados encontrados: La cena del rey Baltasar.' },
    ]

    const res = await POST(buildRequest({ message: '¿y para dos personas?', history }))

    expect(res.status).toBe(200)
    expect(historialRecibido()).toEqual(history)
    expect(vi.mocked(coordinateFlow).mock.calls[0][2]).toBe('¿y para dos personas?')
  })
})
