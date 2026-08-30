import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeRequest } from '@/lib/request-interpreter'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '@/lib/ai-gateway'
import { composeResponse } from '@/lib/response-composer'
import { recordActivity } from '@/lib/procesos-asincronos'
import { distributeExecutionAudit } from '@/lib/execution-audit-router'
import { recordTurnMetrics } from '@/lib/verified/observabilidad'
import { settleReservation, releaseReservation, resolveSettlementCost } from '@/lib/accounting-engine'
import { buildDirectContent } from '@/lib/direct-content-builder'
import { composePrompt } from '@/lib/prompt-composer'
import { resolveVocabulary, composeAugmentedRequest } from '@/lib/intent-resolver'
import { coordinateFlow } from '../coordinate-flow'

vi.mock('@/lib/request-interpreter', () => ({ normalizeRequest: vi.fn() }))
vi.mock('@/lib/professional-context-engine', () => ({ buildProfessionalContext: vi.fn() }))
vi.mock('@/lib/scenaia-knowledge-model', () => ({
  buildKnowledgeContext: vi.fn(),
  unfilteredCriteriaNote: (domain: string) => `${domain}: sin criterio reconocido en la peticion -- resultado sin filtrar`,
}))
vi.mock('@/lib/decision-engine', () => ({ buildDecisionContext: vi.fn() }))
vi.mock('@/lib/credit-manager', () => ({ buildAuthorizationContext: vi.fn() }))
vi.mock('@/lib/ai-gateway', () => ({ executeAIRequest: vi.fn() }))
vi.mock('@/lib/response-composer', () => ({ composeResponse: vi.fn() }))
vi.mock('@/lib/procesos-asincronos', () => ({ recordActivity: vi.fn() }))
vi.mock('@/lib/execution-audit-router', () => ({ distributeExecutionAudit: vi.fn() }))
vi.mock('@/lib/verified/observabilidad', () => ({ recordTurnMetrics: vi.fn() }))
vi.mock('@/lib/accounting-engine', () => ({
  settleReservation: vi.fn(),
  releaseReservation: vi.fn(),
  resolveSettlementCost: vi.fn(),
}))
vi.mock('@/lib/direct-content-builder', () => ({ buildDirectContent: vi.fn() }))
vi.mock('@/lib/prompt-composer', () => ({ composePrompt: vi.fn() }))
// Solo se simula la llamada al proveedor. `composeAugmentedRequest` es una
// funcion pura del mismo modulo y se usa REAL: es justamente la composicion
// que este flujo debe realizar, y simularla ocultaria si se aplica o no.
vi.mock('@/lib/intent-resolver', async () => {
  const { composeAugmentedRequest } = await import('@/lib/intent-resolver/vocabulary')

  return { resolveVocabulary: vi.fn(), composeAugmentedRequest }
})

const normalizedRequest = { requestId: 'req-1', originalRequest: 'hola', normalizedIntent: 'hola', retrievalQuery: 'hola', requestedKnowledgeDomains: ['Obras'] } as never
const professionalContext = { identity: { userId: 'profile-1' } } as never
const knowledgeContext = { knowledgeDomains: [], knowledgeEntities: [], knowledgeConfidence: 0 } as never
const decisionContext = { needsAI: true } as never
const authorizationContext = { authorizationStatus: 'AUTHORIZED', reservationId: 'res-1', estimatedCost: 1 } as never
const aiExecutionResult = { executionStatus: 'EJECUTADO' } as never
const audit = { providerIdentifier: null, executionLatencyMs: null } as never
const responseContext = { responseType: 'RESPONSE_SUCCESS', responseContent: 'ok' } as never
const session = { currentRoute: '/x' } as never
const directContent = 'Resultados encontrados: Obra A.'
const composedPrompt = 'Instrucciones + conocimiento + peticion del usuario.'

beforeEach(() => {
  vi.mocked(normalizeRequest).mockReset().mockReturnValue(normalizedRequest)
  vi.mocked(buildProfessionalContext).mockReset().mockResolvedValue(professionalContext)
  vi.mocked(buildKnowledgeContext).mockReset().mockResolvedValue(knowledgeContext)
  vi.mocked(buildDecisionContext).mockReset().mockReturnValue(decisionContext)
  vi.mocked(buildAuthorizationContext).mockReset().mockResolvedValue(authorizationContext)
  vi.mocked(executeAIRequest).mockReset().mockResolvedValue({ result: aiExecutionResult, audit })
  vi.mocked(composeResponse).mockReset().mockReturnValue(responseContext)
  vi.mocked(recordActivity).mockReset().mockResolvedValue(true)
  vi.mocked(distributeExecutionAudit).mockReset().mockResolvedValue(undefined)
  vi.mocked(buildDirectContent).mockReset().mockReturnValue(directContent)
  vi.mocked(composePrompt).mockReset().mockReturnValue(composedPrompt)
  vi.mocked(resolveVocabulary).mockReset().mockResolvedValue([])
  vi.mocked(recordTurnMetrics).mockReset().mockResolvedValue(true)
  vi.mocked(settleReservation).mockReset().mockResolvedValue({} as never)
  vi.mocked(releaseReservation).mockReset().mockResolvedValue({} as never)
  // Por defecto, sin tarifa ni valor de credito: liquida lo reservado.
  vi.mocked(resolveSettlementCost).mockReset().mockReturnValue(1)
})

describe('coordinateFlow', () => {
  it('invoca los 7 pasos del Núcleo en el orden congelado, enhebrando cada salida como entrada del siguiente', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    expect(normalizeRequest).toHaveBeenCalledWith('hola', [], null)
    expect(buildProfessionalContext).toHaveBeenCalledWith('profile-1', session)
    expect(buildKnowledgeContext).toHaveBeenCalledWith(normalizedRequest, {})
    expect(buildDecisionContext).toHaveBeenCalledWith(normalizedRequest, professionalContext, knowledgeContext)
    expect(buildAuthorizationContext).toHaveBeenCalledWith(professionalContext, decisionContext)
    expect(composePrompt).toHaveBeenCalledWith(normalizedRequest, knowledgeContext, [])
    expect(executeAIRequest).toHaveBeenCalledWith({
      decisionContext,
      authorizationContext,
      normalizedAIRequest: { userPrompt: composedPrompt },
    })
    expect(buildDirectContent).toHaveBeenCalledWith(knowledgeContext)
    expect(composeResponse).toHaveBeenCalledWith(decisionContext, authorizationContext, aiExecutionResult, directContent)
  })

  it('invoca PCE antes que SKM (orden congelado del flujo, no paralelo)', async () => {
    const order: string[] = []
    vi.mocked(buildProfessionalContext).mockImplementation(async () => {
      order.push('pce')
      return professionalContext
    })
    vi.mocked(buildKnowledgeContext).mockImplementation(async () => {
      order.push('skm')
      return knowledgeContext
    })

    await coordinateFlow('profile-1', session, 'hola')

    expect(order).toEqual(['pce', 'skm'])
  })

  it('registra la actividad y distribuye ExecutionAudit después de tener el ResponseContext final', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    expect(recordActivity).toHaveBeenCalledWith({ profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS' })
    // Fase 0: el audit se distribuye acompanado del contexto del turno --
    // `requestId` correlaciona, `stage` distingue esta ejecucion (la de la
    // respuesta) de la del resolutor. El audit sigue siendo el mismo objeto.
    expect(distributeExecutionAudit).toHaveBeenCalledWith('profile-1', audit, {
      requestId: 'req-1',
      stage: 'response',
    })
  })

  it('Fase 0: observa el turno completo con el mismo requestId, sin texto de la peticion ni de la respuesta', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    expect(recordTurnMetrics).toHaveBeenCalledWith('profile-1', {
      requestId: 'req-1',
      domains: ['Obras'],
      isContinuation: false,
      resolvedTerms: [],
      retrievedEntityCount: 0,
      coveredDomainCount: 0,
      knowledgeConfidence: 0,
      isEmptyResult: false,
      responseType: 'RESPONSE_SUCCESS',
      durationMs: expect.any(Number),
    })

    const [, observacion] = vi.mocked(recordTurnMetrics).mock.calls[0]
    expect(JSON.stringify(observacion)).not.toContain('hola')
    expect(JSON.stringify(observacion)).not.toContain('ok')
  })

  it('Fase 0: un fallo de observabilidad no altera la respuesta ya construida', async () => {
    vi.mocked(recordTurnMetrics).mockRejectedValue(new Error('fallo simulado de telemetria'))

    await expect(coordinateFlow('profile-1', session, 'hola')).resolves.toMatchObject({ responseContext })
  })

  it('devuelve exactamente el ResponseContext producido por Response Composer', async () => {
    const { responseContext: result } = await coordinateFlow('profile-1', session, 'hola')

    expect(result).toBe(responseContext)
  })

  it('no interrumpe la respuesta si recordActivity devuelve false o distributeExecutionAudit resuelve sin valor (ninguno lanza por contrato propio)', async () => {
    vi.mocked(recordActivity).mockResolvedValue(false)
    vi.mocked(distributeExecutionAudit).mockResolvedValue(undefined)

    const { responseContext: result } = await coordinateFlow('profile-1', session, 'hola')

    expect(result).toBe(responseContext)
  })

  it('UX-001A: transporta el historial recibido hasta composePrompt sin modificarlo, y con array vacío por defecto si no se proporciona', async () => {
    const history = [
      { role: 'user' as const, content: 'obras de lope de vega' },
      { role: 'assistant' as const, content: 'Resultados encontrados: El caballero de Olmedo.' },
    ]

    await coordinateFlow('profile-1', session, 'hola', history)

    expect(composePrompt).toHaveBeenCalledWith(normalizedRequest, knowledgeContext, history)
  })

  it('UX-001A: ningún paso posterior al intérprete (PCE, SKM, Decision Engine, Credit Manager, AI Gateway, Response Composer) recibe el historial', async () => {
    const history = [{ role: 'user' as const, content: 'texto' }]

    await coordinateFlow('profile-1', session, 'hola', history)

    expect(buildProfessionalContext).toHaveBeenCalledWith('profile-1', session)
    expect(buildKnowledgeContext).toHaveBeenCalledWith(normalizedRequest, {})
    expect(buildDecisionContext).toHaveBeenCalledWith(normalizedRequest, professionalContext, knowledgeContext)
    expect(buildAuthorizationContext).toHaveBeenCalledWith(professionalContext, decisionContext)
    expect(executeAIRequest).toHaveBeenCalledWith({
      decisionContext,
      authorizationContext,
      normalizedAIRequest: { userPrompt: composedPrompt },
    })
  })
})

describe('coordinateFlow — continuidad contextual', () => {
  it('entrega al interprete solo los turnos del usuario, nunca las respuestas de ScenaIA', async () => {
    await coordinateFlow('user-1', session, '¿Y alguna más corta?', [
      { role: 'user', content: '¿Qué obras de comedia tienes?' },
      { role: 'assistant', content: 'Tenemos dos comedias.' },
      { role: 'user', content: '¿Y de Lorca?' },
    ])

    expect(normalizeRequest).toHaveBeenCalledWith('¿Y alguna más corta?', [
      '¿Qué obras de comedia tienes?',
      '¿Y de Lorca?',
    ], null)
  })
})

describe('coordinateFlow — Intent Resolver integrado en el flujo real', () => {
  it('3) el Orquestador delega en el resolutor la decision de gastar una llamada', async () => {
    await coordinateFlow('profile-1', session, '¿Qué obras de comedia tienes?')

    // Se le ofrece la peticion; es `mayNeedResolution` quien declina sin
    // consultar al proveedor (verificado en los tests de intent-resolver).
    expect(resolveVocabulary).toHaveBeenCalledWith('¿Qué obras de comedia tienes?', expect.any(Function))
  })

  it('5) sin dominio reconocido, el resolutor interviene', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({ ...(normalizedRequest as object), requestedKnowledgeDomains: [] } as never)

    await coordinateFlow('profile-1', session, 'tienes alguna pieza breve?')

    expect(resolveVocabulary).toHaveBeenCalledWith('tienes alguna pieza breve?', expect.any(Function))
  })

  it('4) con dominio reconocido pero criterio incompleto, el resolutor tambien recibe la peticion', async () => {
    await coordinateFlow('profile-1', session, 'una obra que no dure mucho y tenga un reparto reducido')

    expect(resolveVocabulary).toHaveBeenCalledTimes(1)
  })

  it('el resolutor NUNCA se invoca antes de Credit Manager: sin autorizacion, no hay ejecucion', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({ ...(normalizedRequest as object), requestedKnowledgeDomains: [] } as never)
    vi.mocked(buildAuthorizationContext).mockResolvedValue({ authorizationStatus: 'DENIED' } as never)

    await coordinateFlow('profile-1', session, 'tienes alguna pieza breve?')

    expect(resolveVocabulary).not.toHaveBeenCalled()
  })

  it('tampoco se invoca cuando Decision Engine ha resuelto que no hace falta IA', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({ ...(normalizedRequest as object), requestedKnowledgeDomains: [] } as never)
    vi.mocked(buildDecisionContext).mockReturnValue({ needsAI: false } as never)

    await coordinateFlow('profile-1', session, 'tienes alguna pieza breve?')

    expect(resolveVocabulary).not.toHaveBeenCalled()
  })

  it('6) si el resolutor no aporta nada, la interpretacion original se conserva intacta', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({ ...(normalizedRequest as object), requestedKnowledgeDomains: [] } as never)
    vi.mocked(resolveVocabulary).mockResolvedValue([])

    await coordinateFlow('profile-1', session, 'tienes algo interesante?')

    expect(normalizeRequest).toHaveBeenCalledTimes(1)
    expect(buildKnowledgeContext).toHaveBeenCalledTimes(1)
  })

  it('con terminos resueltos, reinterpreta y reconstruye el conocimiento antes del prompt', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({ ...(normalizedRequest as object), requestedKnowledgeDomains: [] } as never)
    vi.mocked(resolveVocabulary).mockResolvedValue(['obra', 'corta'])

    await coordinateFlow('profile-1', session, 'tienes alguna pieza breve?')

    expect(normalizeRequest).toHaveBeenCalledTimes(2)
    expect(buildKnowledgeContext).toHaveBeenCalledTimes(2)
    expect(vi.mocked(normalizeRequest).mock.calls[1][0]).toContain('tienes alguna pieza breve?')
  })

  it('compone la peticion aumentada con composeAugmentedRequest, no concatenando los terminos', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({ ...(normalizedRequest as object), requestedKnowledgeDomains: [] } as never)
    vi.mocked(resolveVocabulary).mockResolvedValue(['obra', 'pocos actores'])

    await coordinateFlow('profile-1', session, 'algo que podamos montar entre tres o cuatro')

    const reinterpretada = vi.mocked(normalizeRequest).mock.calls[1][0]

    // El criterio entra subordinado por "para": asi la gramatica de
    // detectKnowledgeDomains lo lee como complemento de "obra" y no como
    // peticion propia del dominio Personas.
    expect(reinterpretada).toBe(
      composeAugmentedRequest('algo que podamos montar entre tres o cuatro', ['obra', 'pocos actores'])
    )
    expect(reinterpretada).toContain('obra para pocos actores')
    expect(reinterpretada).not.toBe('algo que podamos montar entre tres o cuatro obra pocos actores')
  })

  it('un criterio sin dominio no se anade al texto: nunca abre un dominio ajeno', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({ ...(normalizedRequest as object), requestedKnowledgeDomains: [] } as never)
    vi.mocked(resolveVocabulary).mockResolvedValue(['pocos actores'])

    await coordinateFlow('profile-1', session, 'busco algo para hacer entre pocos')

    // La concatenacion directa producia "... pocos actores" y activaba
    // Personas: falso positivo de dominio, no criterio.
    expect(vi.mocked(normalizeRequest).mock.calls[1][0]).toBe('busco algo para hacer entre pocos')
  })

  it('la ejecucion del resolutor produce su propio ExecutionAudit', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({ ...(normalizedRequest as object), requestedKnowledgeDomains: [] } as never)
    vi.mocked(resolveVocabulary).mockImplementation(async (_texto, ejecutar) => {
      await ejecutar('prompt de prueba')
      return []
    })

    await coordinateFlow('profile-1', session, 'tienes alguna pieza breve?')

    expect(distributeExecutionAudit).toHaveBeenCalledTimes(2)
  })
})

describe('coordinateFlow — el resolutor no interfiere con la continuidad conversacional', () => {
  it('en un turno de continuacion NO se invoca al resolutor: la continuidad ya resolvio el dominio', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({
      ...(normalizedRequest as object),
      normalizedIntent: 'y alguna mas corta?',
      retrievalQuery: 'que obras de comedia tienes?. y alguna mas corta?',
    } as never)

    await coordinateFlow('profile-1', session, '¿Y alguna más corta?', [
      { role: 'user', content: '¿Qué obras de comedia tienes?' },
      { role: 'assistant', content: 'Tres comedias.' },
    ])

    expect(resolveVocabulary).not.toHaveBeenCalled()
  })

  it('en un turno que se interpreta por si solo, el resolutor si recibe la peticion', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({
      ...(normalizedRequest as object),
      normalizedIntent: 'tienes alguna pieza breve?',
      retrievalQuery: 'tienes alguna pieza breve?',
    } as never)

    await coordinateFlow('profile-1', session, '¿Tienes alguna pieza breve?')

    expect(resolveVocabulary).toHaveBeenCalledTimes(1)
  })
})

/**
 * Cierre del circuito economico. Antes de esto, toda reserva quedaba
 * 'active' hasta expirar: 75 reservas reales, ninguna cerrada, ninguna con
 * coste. Lo que se comprueba aqui es que el ciclo se cierra SIEMPRE y que
 * cerrarlo nunca puede estropear una respuesta ya construida.
 */
describe('coordinateFlow — circuito economico', () => {
  it('una ejecucion real LIQUIDA la reserva que la autorizo', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    expect(settleReservation).toHaveBeenCalledWith('res-1', 1)
    expect(releaseReservation).not.toHaveBeenCalled()
  })

  it('el importe de liquidacion lo determina Accounting Engine, no el Orquestador', async () => {
    // IA-006.2: coordinar no es tarificar. El Orquestador entrega el audit y
    // lo reservado, y liquida con lo que la contabilidad decida.
    await coordinateFlow('profile-1', session, 'hola')

    expect(resolveSettlementCost).toHaveBeenCalledWith(audit, 1)
  })

  it('liquida en CREDITOS cuando la contabilidad puede convertir el coste real', async () => {
    vi.mocked(resolveSettlementCost).mockReturnValue(0.42)

    await coordinateFlow('profile-1', session, 'hola')

    expect(settleReservation).toHaveBeenCalledWith('res-1', 0.42)
  })

  it('una ejecucion que NO llego a producirse LIBERA la reserva: no se convierte en consumo', async () => {
    vi.mocked(executeAIRequest).mockResolvedValue({
      result: { executionStatus: 'ERROR_COMUNICACION' },
      audit,
    } as never)

    await coordinateFlow('profile-1', session, 'hola')

    expect(releaseReservation).toHaveBeenCalledWith('res-1')
    expect(settleReservation).not.toHaveBeenCalled()
  })

  it('sin proveedor disponible tampoco se consume: se libera', async () => {
    vi.mocked(executeAIRequest).mockResolvedValue({
      result: { executionStatus: 'SIN_PROVEEDOR' },
      audit,
    } as never)

    await coordinateFlow('profile-1', session, 'hola')

    expect(releaseReservation).toHaveBeenCalledWith('res-1')
  })

  it('sin reserva (plan ilimitado, sin IA o denegado) no hay nada que cerrar', async () => {
    vi.mocked(buildAuthorizationContext).mockResolvedValue({
      authorizationStatus: 'AUTHORIZED',
      reservationId: null,
      estimatedCost: null,
    } as never)

    await coordinateFlow('profile-1', session, 'hola')

    expect(settleReservation).not.toHaveBeenCalled()
    expect(releaseReservation).not.toHaveBeenCalled()
  })

  it('IDEMPOTENCIA: una reserva ya cerrada no rompe la respuesta', async () => {
    // La operacion atomica rechaza liquidar dos veces (`WHERE status =
    // 'active'`). Aqui se comprueba que ese rechazo no se propaga al usuario.
    vi.mocked(settleReservation).mockRejectedValue(new Error('reserva no esta activa, no se puede liquidar'))

    await expect(coordinateFlow('profile-1', session, 'hola')).resolves.toMatchObject({ responseContext })
  })

  it('el cierre ocurre con la respuesta ya construida: nunca la condiciona', async () => {
    vi.mocked(releaseReservation).mockRejectedValue(new Error('fallo de red'))
    vi.mocked(executeAIRequest).mockResolvedValue({
      result: { executionStatus: 'ERROR_COMUNICACION' },
      audit,
    } as never)

    await expect(coordinateFlow('profile-1', session, 'hola')).resolves.toMatchObject({ responseContext })
    expect(composeResponse).toHaveBeenCalled()
  })
})

/**
 * FASE 3 — el Orquestador es el unico componente que ve el estado completo,
 * y lo DESCOMPONE antes de que cruce ninguna frontera. Estos tests
 * comprueban la descomposicion, no el contenido del estado: eso ya lo
 * cubren las pruebas del propio modulo.
 */
describe('coordinateFlow — contexto conversacional (Fase 3)', () => {
  const ESTADO_ENTRANTE = {
    conversationId: 'conv-1',
    activeDomain: 'Obras' as const,
    occupancyByDomain: [{ domain: 'Obras' as const, slots: { genero: 'COMEDIA' as const } }],
  }

  it('G · SIN ESTADO: el turno se resuelve exactamente como antes de esta fase', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    expect(normalizeRequest).toHaveBeenCalledWith('hola', [], null)
    expect(buildKnowledgeContext).toHaveBeenCalledWith(normalizedRequest, {})
  })

  it('G · sin estado entrante devuelve igualmente un estado nuevo, con conversacion propia', async () => {
    const { conversationState } = await coordinateFlow('profile-1', session, 'hola')

    expect(conversationState.conversationId).toEqual(expect.any(String))
    expect(conversationState.conversationId.length).toBeGreaterThan(0)
    expect(conversationState.stateVersion).toBe(1)
  })

  it('DESCOMPONE el estado: al interprete un dominio, al conocimiento una ocupacion', async () => {
    await coordinateFlow('profile-1', session, 'hola', [], ESTADO_ENTRANTE)

    expect(normalizeRequest).toHaveBeenCalledWith('hola', [], 'Obras')
    expect(buildKnowledgeContext).toHaveBeenCalledWith(normalizedRequest, { genero: 'COMEDIA' })
  })

  it('NINGUN componente del Nucleo recibe el estado completo', async () => {
    await coordinateFlow('profile-1', session, 'hola', [], ESTADO_ENTRANTE)

    const recibidoPorAlguien = [
      ...vi.mocked(normalizeRequest).mock.calls,
      ...vi.mocked(buildKnowledgeContext).mock.calls,
      ...vi.mocked(buildDecisionContext).mock.calls,
      ...vi.mocked(buildAuthorizationContext).mock.calls,
      ...vi.mocked(executeAIRequest).mock.calls,
      ...vi.mocked(composeResponse).mock.calls,
    ].flat()

    for (const argumento of recibidoPorAlguien) {
      expect(JSON.stringify(argumento ?? null)).not.toContain('conversationId')
      expect(JSON.stringify(argumento ?? null)).not.toContain('occupancyByDomain')
    }
  })

  it('conserva la conversacion entre turnos, sin regenerar su identificador', async () => {
    const { conversationState } = await coordinateFlow('profile-1', session, 'hola', [], ESTADO_ENTRANTE)

    expect(conversationState.conversationId).toBe('conv-1')
  })

  it('la version se RECONSTRUYE del historial: la que enviara el cliente no se lee', async () => {
    const historial = [
      { role: 'user' as const, content: 'uno' },
      { role: 'assistant' as const, content: 'respuesta' },
      { role: 'user' as const, content: 'dos' },
    ]

    const { conversationState } = await coordinateFlow('profile-1', session, 'tres', historial, ESTADO_ENTRANTE)

    // Dos turnos previos de usuario -> este es el tercero.
    expect(conversationState.stateVersion).toBe(3)
  })

  it('el estado saliente recoge el dominio con el que se resolvio el turno', async () => {
    const { conversationState } = await coordinateFlow('profile-1', session, 'hola', [], ESTADO_ENTRANTE)

    expect(conversationState.activeDomain).toBe('Obras')
  })

  it('el estado viaja JUNTO a la respuesta, nunca dentro de ella', async () => {
    const resultado = await coordinateFlow('profile-1', session, 'hola', [], ESTADO_ENTRANTE)

    expect(resultado.responseContext).toBe(responseContext)
    expect(Object.keys(resultado.responseContext)).not.toContain('conversationState')
  })

  it('un turno de continuacion reinterpretado hereda la misma ocupacion previa', async () => {
    vi.mocked(resolveVocabulary).mockResolvedValue(['obra'])
    vi.mocked(buildDecisionContext).mockReturnValue({ needsAI: true } as never)

    await coordinateFlow('profile-1', session, 'hola', [], ESTADO_ENTRANTE)

    for (const llamada of vi.mocked(buildKnowledgeContext).mock.calls) {
      expect(llamada[1]).toEqual({ genero: 'COMEDIA' })
    }
  })
})
