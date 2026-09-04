import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeRequest } from '@/lib/request-interpreter'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '@/lib/ai-gateway'
import { MAX_OUTPUT_TOKENS_BY_OPERATION } from '@/lib/ai-gateway'
import { composeResponse } from '@/lib/response-composer'
import { recordActivity } from '@/lib/procesos-asincronos'
import { distributeExecutionAudit } from '@/lib/execution-audit-router'
import { recordTurnMetrics } from '@/lib/verified/observabilidad'
import { settleReservation, releaseReservation, resolveSettlementCost } from '@/lib/accounting-engine'
import { buildDirectContent } from '@/lib/direct-content-builder'
import { composePrompt } from '@/lib/prompt-composer'
import { resolveVocabulary, composeAugmentedRequest } from '@/lib/intent-resolver'
import { coordinateFlow, acumularEjecucion } from '../coordinate-flow'
import type { ExecutionAudit } from '@/lib/ai-gateway'

vi.mock('@/lib/request-interpreter', () => ({ normalizeRequest: vi.fn() }))
vi.mock('@/lib/professional-context-engine', () => ({ buildProfessionalContext: vi.fn() }))
vi.mock('@/lib/scenaia-knowledge-model', () => ({
  buildKnowledgeContext: vi.fn(),
  unfilteredCriteriaNote: (domain: string) => `${domain}: sin criterio reconocido en la peticion -- resultado sin filtrar`,
}))
vi.mock('@/lib/decision-engine', () => ({ buildDecisionContext: vi.fn() }))
vi.mock('@/lib/credit-manager', () => ({ buildAuthorizationContext: vi.fn() }))
// Se mockea SOLO la ejecucion. La politica de techos llega real: si esta
// prueba la falsificara, dejaria de detectar que el Orquestador use una
// cifra propia en vez de la fuente unica (Bloque 5D).
vi.mock('@/lib/ai-gateway', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ai-gateway')>()),
  executeAIRequest: vi.fn(),
}))
vi.mock('@/lib/response-composer', () => ({ composeResponse: vi.fn() }))
vi.mock('@/lib/procesos-asincronos', () => ({ recordActivity: vi.fn() }))
vi.mock('@/lib/execution-audit-router', () => ({ distributeExecutionAudit: vi.fn() }))
vi.mock('@/lib/verified/observabilidad', () => ({ recordTurnMetrics: vi.fn() }))
vi.mock('@/lib/accounting-engine', () => ({
  settleReservation: vi.fn(),
  releaseReservation: vi.fn(),
  resolveSettlementCost: vi.fn(),
  CREDIT_VALUE: { amountPerCredit: 0.0003, currency: 'USD' },
}))
vi.mock('@/lib/direct-content-builder', () => ({ buildDirectContent: vi.fn() }))
vi.mock('@/lib/prompt-composer', () => ({ composePrompt: vi.fn() }))
// Solo se simula la llamada al proveedor. `composeAugmentedRequest` es una
// funcion pura del mismo modulo y se usa REAL: es justamente la composicion
// que este flujo debe realizar, y simularla ocultaria si se aplica o no.
vi.mock('@/lib/intent-resolver', async () => {
  const { composeAugmentedRequest } = await import('@/lib/intent-resolver/vocabulary')

  return { resolveVocabulary: vi.fn(), composeAugmentedRequest, buildResolverPrompt: (texto: string) => texto }
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

    expect(normalizeRequest).toHaveBeenCalledWith('hola', expect.any(String), [], null)
    expect(buildProfessionalContext).toHaveBeenCalledWith('profile-1', session)
    expect(buildKnowledgeContext).toHaveBeenCalledWith(normalizedRequest, {})
    expect(buildDecisionContext).toHaveBeenCalledWith(
      normalizedRequest,
      professionalContext,
      knowledgeContext,
      // Bloque 4: el contexto de operacion viaja como cuarta entrada. No
      // contiene historial ni texto: solo longitudes, la politica de techos
      // (Bloque 5D) y el valor del credito.
      expect.objectContaining({
        maxOutputTokensByOperation: expect.any(Object),
        promptCharacters: expect.any(Number),
      })
    )
    expect(buildAuthorizationContext).toHaveBeenCalledWith(professionalContext, decisionContext)
    expect(composePrompt).toHaveBeenCalledWith(normalizedRequest, knowledgeContext, [])
    expect(executeAIRequest).toHaveBeenCalledWith({
      decisionContext,
      authorizationContext,
      normalizedAIRequest: { userPrompt: composedPrompt, operationKind: 'TEXT_STANDARD' },
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
      settlementAnomaly: null,
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
    expect(buildDecisionContext).toHaveBeenCalledWith(
      normalizedRequest,
      professionalContext,
      knowledgeContext,
      // Bloque 4: el contexto de operacion viaja como cuarta entrada. No
      // contiene historial ni texto: solo longitudes, la politica de techos
      // (Bloque 5D) y el valor del credito.
      expect.objectContaining({
        maxOutputTokensByOperation: expect.any(Object),
        promptCharacters: expect.any(Number),
      })
    )
    expect(buildAuthorizationContext).toHaveBeenCalledWith(professionalContext, decisionContext)
    expect(executeAIRequest).toHaveBeenCalledWith({
      decisionContext,
      authorizationContext,
      normalizedAIRequest: { userPrompt: composedPrompt, operationKind: 'TEXT_STANDARD' },
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

    expect(normalizeRequest).toHaveBeenCalledWith('¿Y alguna más corta?', expect.any(String), [
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
    // IA-006.2: coordinar no es tarificar. El Orquestador entrega LAS
    // EJECUCIONES del turno (F5F-4) y lo reservado, y liquida con lo que la
    // contabilidad decida. Antes entregaba un unico audit, y por eso el
    // coste del resolutor nunca llegaba a cobrarse.
    await coordinateFlow('profile-1', session, 'hola')

    expect(resolveSettlementCost).toHaveBeenCalledWith([audit], 1)
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

    expect(normalizeRequest).toHaveBeenCalledWith('hola', expect.any(String), [], null)
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

    expect(normalizeRequest).toHaveBeenCalledWith('hola', expect.any(String), [], 'Obras')
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

/**
 * BLOQUE 4 — la reserva deja de ser un credito fijo.
 *
 * Lo que estas pruebas custodian no es una cifra concreta, sino tres
 * propiedades: que la reserva depende de la operacion, que una operacion
 * sin capacidad NO llega al proveedor, y que una desviacion de la
 * estimacion no toca el coste real.
 */
describe('coordinateFlow — reserva preventiva por operacion (Bloque 4)', () => {
  it('el prompt se compone ANTES de autorizar: la estimacion usa el texto real', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    // Sin esto, la reserva se calcularia a ciegas sobre un prompt que
    // todavia no existe.
    const ordenCompose = vi.mocked(composePrompt).mock.invocationCallOrder[0]
    const ordenAutorizar = vi.mocked(buildAuthorizationContext).mock.invocationCallOrder[0]

    expect(ordenCompose).toBeLessThan(ordenAutorizar)
  })

  it('el contexto de operacion lleva la POLITICA de techos, no una cifra suelta (Bloque 5D)', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    const [, , , operationContext] = vi.mocked(buildDecisionContext).mock.calls[0]

    expect(operationContext).not.toBeNull()
    // Se compara contra la fuente unica, nunca contra un numero escrito
    // aqui: si esta prueba fijara una cifra, seguiria pasando el dia en que
    // la estimacion dejara de usar la politica real.
    expect(operationContext!.maxOutputTokensByOperation).toBe(MAX_OUTPUT_TOKENS_BY_OPERATION)
  })

  it('el contexto de operacion lleva el valor del credito, sin duplicarlo', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    const [, , , operationContext] = vi.mocked(buildDecisionContext).mock.calls[0]

    expect(operationContext!.creditValue).toEqual({ amountPerCredit: 0.0003, currency: 'USD' })
  })

  it('RESOLUTOR: un turno que puede invocarlo aparta tambien su coste', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    const [, , , operationContext] = vi.mocked(buildDecisionContext).mock.calls[0]

    // Turno autonomo: el resolutor puede ejecutarse, luego se estima.
    expect(operationContext!.resolverPromptCharacters).not.toBeNull()
  })

  it('RESOLUTOR: un turno de continuacion NO aparta un coste que no puede producirse', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({
      ...(normalizedRequest as object),
      retrievalQuery: 'texto concatenado distinto',
      normalizedIntent: 'hola',
    } as never)

    await coordinateFlow('profile-1', session, 'hola', [{ role: 'user', content: 'previo' }])

    const [, , , operationContext] = vi.mocked(buildDecisionContext).mock.calls[0]

    expect(operationContext!.resolverPromptCharacters).toBeNull()
  })

  it('SIN CAPACIDAD NO SE EJECUTA: una denegacion no llega jamas al proveedor', async () => {
    vi.mocked(buildAuthorizationContext).mockResolvedValue({
      authorizationStatus: 'DENIED',
      authorizationReason: 'VERIFICACION_NEGATIVA: presupuesto del periodo agotado',
      reservationId: null,
      estimatedCost: 2.5,
    } as never)
    vi.mocked(executeAIRequest).mockResolvedValue({
      result: { executionStatus: 'NO_AUTORIZADO', generatedContent: null, executionWarnings: [] },
      audit,
    } as never)

    await coordinateFlow('profile-1', session, 'hola')

    // AI Gateway se autoguarda: la denegacion queda registrada y no hay
    // ejecucion real de proveedor.
    const [entrada] = vi.mocked(executeAIRequest).mock.calls[0]
    expect(entrada.authorizationContext.authorizationStatus).toBe('DENIED')
    expect(settleReservation).not.toHaveBeenCalled()
  })

  it('SOBRANTE: liquidar por debajo de lo reservado devuelve la diferencia sola', async () => {
    vi.mocked(buildAuthorizationContext).mockResolvedValue({
      authorizationStatus: 'AUTHORIZED',
      authorizationReason: 'VERIFICADO',
      reservationId: 'res-1',
      estimatedCost: 2.5,
    } as never)
    vi.mocked(resolveSettlementCost).mockReturnValue(0.84)

    await coordinateFlow('profile-1', session, 'hola')

    // Se liquida lo REAL. El presupuesto del periodo cuenta lo liquidado,
    // de modo que 1,66 vuelven sin ninguna operacion de devolucion.
    expect(settleReservation).toHaveBeenCalledWith('res-1', 0.84)
  })

  it('ANOMALIA: si lo real supera lo reservado se registra, y NO se capa', async () => {
    vi.mocked(buildAuthorizationContext).mockResolvedValue({
      authorizationStatus: 'AUTHORIZED',
      authorizationReason: 'VERIFICADO',
      reservationId: 'res-1',
      estimatedCost: 2,
    } as never)
    vi.mocked(resolveSettlementCost).mockReturnValue(3)

    await coordinateFlow('profile-1', session, 'hola')

    // El coste real llega intacto a la liquidacion.
    expect(settleReservation).toHaveBeenCalledWith('res-1', 3)

    const [, observacion] = vi.mocked(recordTurnMetrics).mock.calls[0]
    expect(observacion.settlementAnomaly).toEqual({
      reservationId: 'res-1',
      reservedCredits: 2,
      settledCredits: 3,
      providerIdentifier: (audit as { providerIdentifier: string | null }).providerIdentifier,
      providerModel: (audit as { providerModel: string | null }).providerModel,
    })
  })

  it('SIN ANOMALIA cuando lo real coincide con lo reservado', async () => {
    vi.mocked(buildAuthorizationContext).mockResolvedValue({
      authorizationStatus: 'AUTHORIZED',
      authorizationReason: 'VERIFICADO',
      reservationId: 'res-1',
      estimatedCost: 2,
    } as never)
    vi.mocked(resolveSettlementCost).mockReturnValue(2)

    await coordinateFlow('profile-1', session, 'hola')

    const [, observacion] = vi.mocked(recordTurnMetrics).mock.calls[0]
    expect(observacion.settlementAnomaly).toBeNull()
  })
})


/**
 * BLOQUE 5D — el Orquestador nombra la operacion; nunca la tarifa.
 */
describe('coordinateFlow — operacion declarada, techo delegado (Bloque 5D)', () => {
  it('la llamada de RESPUESTA se declara TEXT_STANDARD', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    const llamadas = vi.mocked(executeAIRequest).mock.calls.map(([entrada]) => entrada.normalizedAIRequest)
    expect(llamadas.some((r) => r.operationKind === 'TEXT_STANDARD')).toBe(true)
  })

  it('la llamada del RESOLUTOR se declara RESOLVER: son operaciones distintas', async () => {
    // `resolveVocabulary` esta mockeado, asi que el ejecutor no llega a
    // dispararse solo. Se recupera el que el Orquestador le entrego y se
    // invoca: es exactamente el que usaria en produccion.
    await coordinateFlow('profile-1', session, 'hola')

    const [, ejecutor] = vi.mocked(resolveVocabulary).mock.calls[0]
    vi.mocked(executeAIRequest).mockClear()
    await ejecutor('prompt del resolutor')

    const [entrada] = vi.mocked(executeAIRequest).mock.calls[0]
    expect(entrada.normalizedAIRequest.operationKind).toBe('RESOLVER')
  })

  it('NINGUNA llamada transporta una cifra de techo', async () => {
    await coordinateFlow('profile-1', session, 'hola')

    for (const [entrada] of vi.mocked(executeAIRequest).mock.calls) {
      expect(entrada.normalizedAIRequest).not.toHaveProperty('maxOutputTokens')
    }
  })

  it('la estimacion usa la MISMA politica que despues se aplica', async () => {
    // Reservar por 1024 y ejecutar con 512 apartaria el doble de lo debido;
    // al reves, dejaria la reserva corta. Las dos puntas leen la misma
    // fuente, y esta prueba lo fija.
    await coordinateFlow('profile-1', session, 'hola')

    const [, , , operationContext] = vi.mocked(buildDecisionContext).mock.calls[0]
    expect(operationContext!.maxOutputTokensByOperation).toBe(MAX_OUTPUT_TOKENS_BY_OPERATION)
  })
})


/**
 * F5F-1 — IDENTIDAD ESTABLE DEL TURNO.
 *
 * En produccion se observo un turno real cuyo resolutor quedo bajo un
 * identificador y cuya respuesta quedo bajo otro: las dos llamadas de un
 * mismo turno dejaron de ser enlazables por clave, y la reserva quedo
 * atada solo a la primera mitad. La causa era que `normalizeRequest`
 * acuñaba identidad, y un turno se interpreta dos veces siempre que el
 * resolutor devuelve terminos.
 *
 * Estas pruebas fijan la propiedad, no la cifra: UN TURNO = UN IDENTIFICADOR.
 * El mock del interprete DEVUELVE el identificador que recibe, que es
 * exactamente lo que hace la implementacion real desde F5F-1 (y lo que sus
 * propias pruebas custodian).
 */
describe('coordinateFlow — identidad del turno (F5F-1)', () => {
  /** Interprete que se comporta como el real: devuelve la identidad recibida. */
  function interpreteQueDevuelveSuIdentidad(overrides: object = {}) {
    vi.mocked(normalizeRequest).mockImplementation(
      ((_texto: string, requestId: string) => ({ ...(normalizedRequest as object), ...overrides, requestId })) as never
    )
  }

  /** Los identificadores con los que se invoco al interprete en el turno. */
  function identidadesEntregadas(): string[] {
    return vi.mocked(normalizeRequest).mock.calls.map((llamada) => llamada[1] as string)
  }

  it('A · un turno con UNA sola interpretacion usa un unico identificador', async () => {
    interpreteQueDevuelveSuIdentidad()

    await coordinateFlow('profile-1', session, 'hola')

    expect(new Set(identidadesEntregadas()).size).toBe(1)
    expect(identidadesEntregadas()[0]).not.toBe('')
  })

  it('B · con RESOLUTOR y segunda interpretacion, AMBAS reciben el MISMO identificador', async () => {
    // Es el caso exacto que fallo en produccion.
    interpreteQueDevuelveSuIdentidad()
    vi.mocked(resolveVocabulary).mockResolvedValue(['obra', 'comedia'])

    await coordinateFlow('profile-1', session, 'hola')

    const identidades = identidadesEntregadas()
    expect(identidades.length).toBe(2)
    expect(identidades[0]).toBe(identidades[1])
  })

  it('C · el identificador llega al Decision Engine, y de ahi a la reserva', async () => {
    interpreteQueDevuelveSuIdentidad()

    await coordinateFlow('profile-1', session, 'hola')

    const [peticionInterpretada] = vi.mocked(buildDecisionContext).mock.calls[0]
    expect(peticionInterpretada.requestId).toBe(identidadesEntregadas()[0])
  })

  it('D · las trazas del RESOLUTOR y de la RESPUESTA comparten identificador', async () => {
    interpreteQueDevuelveSuIdentidad()
    vi.mocked(resolveVocabulary).mockResolvedValue(['obra', 'comedia'])

    await coordinateFlow('profile-1', session, 'hola')

    const [, ejecutor] = vi.mocked(resolveVocabulary).mock.calls[0]
    await ejecutor('prompt del resolutor')

    const trazas = vi.mocked(distributeExecutionAudit).mock.calls.map(([, , contexto]) => contexto)
    const etapas = trazas.map((c) => c?.stage)
    expect(etapas).toContain('resolver')
    expect(etapas).toContain('response')
    expect(new Set(trazas.map((c) => c?.requestId)).size).toBe(1)
  })

  it('E · las metricas del turno usan ese mismo identificador', async () => {
    interpreteQueDevuelveSuIdentidad()
    vi.mocked(resolveVocabulary).mockResolvedValue(['obra', 'comedia'])

    await coordinateFlow('profile-1', session, 'hola')

    const [, observacion] = vi.mocked(recordTurnMetrics).mock.calls[0]
    expect(observacion.requestId).toBe(identidadesEntregadas()[0])
  })

  it('F · un turno DETERMINISTA tiene identidad aunque no exista reserva', async () => {
    // Es la razon por la que `reservationId` no puede hacer de identidad de
    // turno: aqui no existe, y el turno sigue necesitando nombre.
    interpreteQueDevuelveSuIdentidad()
    vi.mocked(buildDecisionContext).mockReturnValue({ needsAI: false } as never)
    vi.mocked(buildAuthorizationContext).mockResolvedValue({
      authorizationStatus: 'AUTHORIZED',
      reservationId: null,
      estimatedCost: null,
    } as never)

    await coordinateFlow('profile-1', session, 'hola')

    const [, observacion] = vi.mocked(recordTurnMetrics).mock.calls[0]
    expect(observacion.requestId).toBe(identidadesEntregadas()[0])
    expect(observacion.requestId).not.toBe('')
    // Sin reserva no hay cierre economico, y el consumo de IA sigue siendo cero.
    expect(settleReservation).not.toHaveBeenCalled()
    expect(releaseReservation).not.toHaveBeenCalled()
  })

  it('TURNOS DISTINTOS reciben identidades distintas', async () => {
    interpreteQueDevuelveSuIdentidad()

    await coordinateFlow('profile-1', session, 'hola')
    const primero = identidadesEntregadas()[0]
    vi.mocked(normalizeRequest).mockClear()
    await coordinateFlow('profile-1', session, 'hola')

    expect(identidadesEntregadas()[0]).not.toBe(primero)
  })
})


/**
 * F5F-3 — ACUMULADOR DE EJECUCIONES DEL TURNO.
 *
 * En 5E se confirmo que el audit del RESOLUTOR moria en el ambito de la
 * funcion que lo producia: se medía en telemetria y desaparecia para todo
 * lo demas, dejando 0,3205 creditos reales fuera del cierre del turno.
 *
 * Estas pruebas cubren la REGLA DE ADMISION, que es donde vive la
 * propiedad. Que la regla se aplique a TODA ejecucion lo garantiza el
 * punto unico de invocacion, custodiado por invariante: `executeAIRequest`
 * se llama en un solo sitio de todo el codigo de produccion.
 */
describe('acumularEjecucion — regla de admision (F5F-3)', () => {
  const auditEjecutado = (maxOutputTokens: number): ExecutionAudit =>
    ({
      providerIdentifier: 'openai',
      providerModel: 'gpt-4o-mini',
      executionLatencyMs: 10,
      tokensConsumed: 5,
      inputTokens: 3,
      outputTokens: 2,
      truncated: false,
      maxOutputTokens,
      realExecutionCost: null,
      technicalMetadata: null,
    }) as ExecutionAudit

  const EMPTY_AUDIT = {
    providerIdentifier: null,
    providerModel: null,
    executionLatencyMs: null,
    tokensConsumed: null,
    inputTokens: null,
    outputTokens: null,
    truncated: null,
    maxOutputTokens: null,
    realExecutionCost: null,
    technicalMetadata: null,
  } as ExecutionAudit

  const ejecutado = (a: ExecutionAudit) => ({ result: { executionStatus: 'EJECUTADO' } as never, audit: a })
  const noEjecutado = (estado: string) => ({ result: { executionStatus: estado } as never, audit: EMPTY_AUDIT })

  it('1 · RESOLUTOR + TEXT_STANDARD: ambos quedan acumulados, en orden', () => {
    const acumulador: ExecutionAudit[] = []
    const resolutor = auditEjecutado(1024)
    const texto = auditEjecutado(512)

    acumularEjecucion(acumulador, ejecutado(resolutor))
    acumularEjecucion(acumulador, ejecutado(texto))

    expect(acumulador).toHaveLength(2)
    expect(acumulador[0]).toBe(resolutor)
    expect(acumulador[1]).toBe(texto)
  })

  it('2 · solo TEXT_STANDARD: un unico audit', () => {
    const acumulador: ExecutionAudit[] = []

    acumularEjecucion(acumulador, ejecutado(auditEjecutado(512)))

    expect(acumulador).toHaveLength(1)
  })

  it('3 · RESOLUTOR FALLIDO + TEXT_STANDARD: solo entra el que ejecuto', () => {
    const acumulador: ExecutionAudit[] = []
    const texto = auditEjecutado(512)

    acumularEjecucion(acumulador, noEjecutado('ERROR_COMUNICACION'))
    acumularEjecucion(acumulador, ejecutado(texto))

    expect(acumulador).toHaveLength(1)
    expect(acumulador[0]).toBe(texto)
  })

  it('4 · RESOLUTOR FALLIDO y ninguna otra IA: acumulador vacio', () => {
    const acumulador: ExecutionAudit[] = []

    acumularEjecucion(acumulador, noEjecutado('ERROR_COMUNICACION'))

    expect(acumulador).toHaveLength(0)
  })

  it('5 · TURNO DETERMINISTA: nada que acumular', () => {
    const acumulador: ExecutionAudit[] = []

    acumularEjecucion(acumulador, noEjecutado('NO_REQUERIDO'))

    expect(acumulador).toHaveLength(0)
  })

  it('6 · NO esta limitado a dos operaciones: acumula tantas como se ejecuten', () => {
    // No inventa ninguna operacion nueva: repite ejecuciones ya validas
    // para demostrar que la regla no tiene tope.
    const acumulador: ExecutionAudit[] = []
    const cuatro = [auditEjecutado(1024), auditEjecutado(512), auditEjecutado(512), auditEjecutado(1024)]

    for (const a of cuatro) acumularEjecucion(acumulador, ejecutado(a))

    expect(acumulador).toHaveLength(4)
    expect(acumulador).toEqual(cuatro)
  })

  it('7 · ORDEN: se conserva el de ejecucion, no se reordena', () => {
    const acumulador: ExecutionAudit[] = []
    const primero = auditEjecutado(1024)
    const segundo = auditEjecutado(512)

    acumularEjecucion(acumulador, ejecutado(segundo))
    acumularEjecucion(acumulador, ejecutado(primero))

    // Se acumulan como se ejecutaron, aunque los techos sugieran otro orden.
    expect(acumulador[0]).toBe(segundo)
    expect(acumulador[1]).toBe(primero)
  })

  it('9 · conserva INTEGRO el audit de F5F-2: 1024 y 512 sobreviven', () => {
    const acumulador: ExecutionAudit[] = []

    acumularEjecucion(acumulador, ejecutado(auditEjecutado(1024)))
    acumularEjecucion(acumulador, ejecutado(auditEjecutado(512)))

    expect(acumulador.map((a) => a.maxOutputTokens)).toEqual([1024, 512])
    // Y no se recorta a una proyeccion economica: el audit entra entero.
    expect(acumulador[0].truncated).toBe(false)
    expect(acumulador[0].executionLatencyMs).toBe(10)
  })

  it('10 · EMPTY_AUDIT no entra JAMAS, sea cual sea el estado no ejecutado', () => {
    const acumulador: ExecutionAudit[] = []

    for (const estado of ['NO_AUTORIZADO', 'NO_REQUERIDO', 'SIN_PROVEEDOR', 'ERROR_COMUNICACION']) {
      acumularEjecucion(acumulador, noEjecutado(estado))
    }

    expect(acumulador).toHaveLength(0)
  })

  it('CADA ejecucion entra EXACTAMENTE una vez (P4)', () => {
    const acumulador: ExecutionAudit[] = []
    const uno = auditEjecutado(1024)
    const dos = auditEjecutado(512)

    acumularEjecucion(acumulador, ejecutado(uno))
    acumularEjecucion(acumulador, ejecutado(dos))

    expect(acumulador.filter((a) => a === uno)).toHaveLength(1)
    expect(acumulador.filter((a) => a === dos)).toHaveLength(1)
  })

  it('NO hay estado global: cada turno parte de su propia coleccion', () => {
    const turnoA: ExecutionAudit[] = []
    const turnoB: ExecutionAudit[] = []

    acumularEjecucion(turnoA, ejecutado(auditEjecutado(512)))

    expect(turnoA).toHaveLength(1)
    expect(turnoB).toHaveLength(0)
  })
})

/**
 * F5F-3 — el flujo real produce las ejecuciones que la regla acumulara.
 *
 * El acumulador es local al turno y todavia no lo consume nadie, asi que
 * lo observable desde fuera es CUANTAS ejecuciones EJECUTADO produce cada
 * escenario. Combinado con el punto unico de invocacion y con la regla ya
 * probada arriba, queda determinado el contenido del acumulador.
 */
describe('coordinateFlow — ejecuciones del turno (F5F-3)', () => {
  /** `executeAIRequest` devuelve promesas: hay que resolverlas para leer el estado. */
  async function ejecucionesEjecutadas(): Promise<number> {
    const salidas = await Promise.all(vi.mocked(executeAIRequest).mock.results.map((r) => r.value))

    return salidas.filter((s) => (s as { result?: { executionStatus?: string } })?.result?.executionStatus === 'EJECUTADO')
      .length
  }

  it('8 · IDENTIDAD: todas las ejecuciones del turno comparten turnId', async () => {
    vi.mocked(normalizeRequest).mockImplementation(
      ((_t: string, requestId: string) => ({ ...(normalizedRequest as object), requestId })) as never
    )
    vi.mocked(resolveVocabulary).mockImplementation(async (_texto, ejecutor) => {
      await ejecutor('prompt del resolutor')
      return ['obra']
    })

    await coordinateFlow('profile-1', session, 'hola')

    const identidades = vi.mocked(distributeExecutionAudit).mock.calls.map(([, , contexto]) => contexto?.requestId)
    expect(identidades.length).toBeGreaterThan(1)
    expect(new Set(identidades).size).toBe(1)
  })

  it('un turno con RESOLUTOR produce DOS ejecuciones ejecutadas', async () => {
    vi.mocked(resolveVocabulary).mockImplementation(async (_texto, ejecutor) => {
      await ejecutor('prompt del resolutor')
      return ['obra']
    })

    await coordinateFlow('profile-1', session, 'hola')

    expect(await ejecucionesEjecutadas()).toBe(2)
  })

  it('un turno de continuacion produce UNA sola', async () => {
    vi.mocked(normalizeRequest).mockReturnValue({
      ...(normalizedRequest as object),
      retrievalQuery: 'texto distinto',
      normalizedIntent: 'hola',
    } as never)

    await coordinateFlow('profile-1', session, 'hola', [{ role: 'user', content: 'previo' }])

    expect(await ejecucionesEjecutadas()).toBe(1)
  })

  it('un turno DETERMINISTA no produce ninguna, y no crea reserva', async () => {
    vi.mocked(buildDecisionContext).mockReturnValue({ needsAI: false } as never)
    vi.mocked(buildAuthorizationContext).mockResolvedValue({
      authorizationStatus: 'AUTHORIZED',
      reservationId: null,
      estimatedCost: null,
    } as never)
    vi.mocked(executeAIRequest).mockResolvedValue({
      result: { executionStatus: 'NO_REQUERIDO', generatedContent: null, executionWarnings: [] },
      audit,
    } as never)

    await coordinateFlow('profile-1', session, 'hola')

    expect(await ejecucionesEjecutadas()).toBe(0)
    expect(settleReservation).not.toHaveBeenCalled()
    expect(releaseReservation).not.toHaveBeenCalled()
  })
})


/**
 * F5F-4 — el cierre economico del turno.
 *
 * Un turno = una reserva = UN settlement, sobre el coste agregado de todas
 * sus ejecuciones. La coleccion es la fuente del importe, jamas una lista
 * de liquidaciones.
 */
describe('coordinateFlow — settlement multi-operacion (F5F-4)', () => {
  /** Hace que el resolutor ejecute de verdad, produciendo su propio audit. */
  function conResolutorEjecutado() {
    vi.mocked(resolveVocabulary).mockImplementation(async (_texto, ejecutor) => {
      await ejecutor('prompt del resolutor')
      return ['obra']
    })
  }

  it('14 · UN turno con DOS ejecuciones produce UN SOLO settlement', async () => {
    conResolutorEjecutado()

    await coordinateFlow('profile-1', session, 'hola')

    expect(settleReservation).toHaveBeenCalledTimes(1)
    expect(releaseReservation).not.toHaveBeenCalled()
  })

  it('15 · NO hay un settlement por operacion', async () => {
    conResolutorEjecutado()

    await coordinateFlow('profile-1', session, 'hola')

    // Dos ejecuciones, una sola liquidacion.
    expect(vi.mocked(executeAIRequest).mock.calls.length).toBe(2)
    expect(settleReservation).toHaveBeenCalledTimes(1)
  })

  it('la liquidacion recibe TODAS las ejecuciones del turno, en orden', async () => {
    conResolutorEjecutado()

    await coordinateFlow('profile-1', session, 'hola')

    const [ejecuciones] = vi.mocked(resolveSettlementCost).mock.calls[0]
    expect(ejecuciones).toHaveLength(2)
    expect(ejecuciones[0]).toBe(audit)
    expect(ejecuciones[1]).toBe(audit)
  })

  it('13 · DETERMINISTA: sin ejecuciones no se liquida coste de IA', async () => {
    vi.mocked(buildDecisionContext).mockReturnValue({ needsAI: false } as never)
    vi.mocked(executeAIRequest).mockResolvedValue({
      result: { executionStatus: 'NO_REQUERIDO', generatedContent: null, executionWarnings: [] },
      audit,
    } as never)

    await coordinateFlow('profile-1', session, 'hola')

    expect(settleReservation).not.toHaveBeenCalled()
    expect(releaseReservation).toHaveBeenCalledTimes(1)
  })

  it('TODO FALLIDO: se libera la reserva, no se cobra nada', async () => {
    vi.mocked(executeAIRequest).mockResolvedValue({
      result: { executionStatus: 'ERROR_COMUNICACION', generatedContent: null, executionWarnings: ['x'] },
      audit,
    } as never)

    await coordinateFlow('profile-1', session, 'hola')

    expect(settleReservation).not.toHaveBeenCalled()
    expect(releaseReservation).toHaveBeenCalledWith('res-1')
  })

  it('RESOLUTOR EJECUTADO + RESPUESTA FALLIDA: se liquida, ya no se pierde su coste', async () => {
    // Antes de F5F-4 este turno se liberaba entero y el coste real del
    // resolutor -- ya gastado con el proveedor -- desaparecia.
    let primera = true
    vi.mocked(executeAIRequest).mockImplementation(async () => {
      if (primera) {
        primera = false
        return { result: { executionStatus: 'EJECUTADO', generatedContent: 'x', executionWarnings: [] }, audit } as never
      }
      return { result: { executionStatus: 'ERROR_COMUNICACION', generatedContent: null, executionWarnings: [] }, audit } as never
    })
    conResolutorEjecutado()

    await coordinateFlow('profile-1', session, 'hola')

    expect(settleReservation).toHaveBeenCalledTimes(1)
    const [ejecuciones] = vi.mocked(resolveSettlementCost).mock.calls[0]
    expect(ejecuciones).toHaveLength(1)
  })

  it('16 · IDEMPOTENCIA: un fallo del cierre no altera la respuesta ya construida', async () => {
    // La doble liquidacion la impide la operacion atomica; aqui se
    // comprueba que su excepcion no rompe el turno.
    conResolutorEjecutado()
    vi.mocked(settleReservation).mockRejectedValue(new Error('reserva no esta activa'))

    const salida = await coordinateFlow('profile-1', session, 'hola')

    expect(salida.responseContext).toBe(responseContext)
    expect(settleReservation).toHaveBeenCalledTimes(1)
  })

  it('11 · EMPRESAS con techo NULL: se liquida igual el coste agregado', async () => {
    // `authorized_limit_snapshot = NULL` significa SIN LIMITE: no impide
    // medir ni liquidar. Sin techo no hay denegacion, no hay excepcion.
    vi.mocked(buildAuthorizationContext).mockResolvedValue({
      authorizationStatus: 'AUTHORIZED',
      reservationId: 'res-empresas',
      estimatedCost: 4.9,
      availableCredits: null,
      remainingQuota: null,
    } as never)
    vi.mocked(resolveSettlementCost).mockReturnValue(0.732)
    conResolutorEjecutado()

    await coordinateFlow('profile-1', session, 'hola')

    const [ejecuciones, reservado] = vi.mocked(resolveSettlementCost).mock.calls[0]
    expect(ejecuciones).toHaveLength(2)
    expect(reservado).toBe(4.9)
    expect(settleReservation).toHaveBeenCalledWith('res-empresas', 0.732)
    expect(settleReservation).toHaveBeenCalledTimes(1)
  })

  it('ANOMALIA preservada: si lo agregado supera lo reservado, se registra y NO se capa', async () => {
    conResolutorEjecutado()
    vi.mocked(resolveSettlementCost).mockReturnValue(5)

    await coordinateFlow('profile-1', session, 'hola')

    expect(settleReservation).toHaveBeenCalledWith('res-1', 5)
    const [, observacion] = vi.mocked(recordTurnMetrics).mock.calls[0]
    expect(observacion.settlementAnomaly).toMatchObject({ reservedCredits: 1, settledCredits: 5 })
  })
})
