import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { normalizeRequest } from '@/lib/request-interpreter'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '@/lib/ai-gateway'
import { composeResponse } from '@/lib/response-composer'
import { recordActivity } from '@/lib/procesos-asincronos'
import { distributeExecutionAudit } from '@/lib/execution-audit-router'
import { recordTurnMetrics, recordTurnFailure } from '@/lib/verified/observabilidad'
import { settleReservation, releaseReservation, resolveSettlementCost } from '@/lib/accounting-engine'
import { buildDirectContent } from '@/lib/direct-content-builder'
import { composePrompt } from '@/lib/prompt-composer'
import { resolveVocabulary } from '@/lib/intent-resolver'
import { coordinateFlow } from '../coordinate-flow'
import { listingPageOf, LISTADO_DESPLAZAMIENTO_MAXIMO } from '../paginacion'

/**
 * SCENAIA-004B §4.3 y §4.7 (PR 3) -- el Orquestador aplica la continuación
 * y compone `listingPage`. Mismas simulaciones que coordinate-flow.test.ts.
 */

vi.mock('@/lib/request-interpreter', () => ({ normalizeRequest: vi.fn() }))
vi.mock('@/lib/professional-context-engine', () => ({ buildProfessionalContext: vi.fn() }))
vi.mock('@/lib/scenaia-knowledge-model', () => ({
  buildKnowledgeContext: vi.fn(),
  unfilteredCriteriaNote: (domain: string) => `${domain}: sin criterio reconocido en la peticion -- resultado sin filtrar`,
}))
vi.mock('@/lib/decision-engine', () => ({ buildDecisionContext: vi.fn() }))
vi.mock('@/lib/credit-manager', () => ({ buildAuthorizationContext: vi.fn() }))
vi.mock('@/lib/ai-gateway', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ai-gateway')>()),
  executeAIRequest: vi.fn(),
}))
vi.mock('@/lib/response-composer', () => ({ composeResponse: vi.fn() }))
vi.mock('@/lib/procesos-asincronos', () => ({ recordActivity: vi.fn() }))
vi.mock('@/lib/execution-audit-router', () => ({ distributeExecutionAudit: vi.fn() }))
vi.mock('@/lib/verified/observabilidad', () => ({ recordTurnMetrics: vi.fn(), recordTurnFailure: vi.fn() }))
vi.mock('@/lib/accounting-engine', () => ({
  settleReservation: vi.fn(),
  releaseReservation: vi.fn(),
  resolveSettlementCost: vi.fn(),
  CREDIT_VALUE: { amountPerCredit: 0.0003, currency: 'USD' },
}))
vi.mock('@/lib/direct-content-builder', () => ({ buildDirectContent: vi.fn() }))
vi.mock('@/lib/prompt-composer', () => ({ composePrompt: vi.fn() }))
vi.mock('@/lib/intent-resolver', async () => {
  const { composeAugmentedRequest } = await import('@/lib/intent-resolver/vocabulary')

  return { resolveVocabulary: vi.fn(), composeAugmentedRequest, buildResolverPrompt: (texto: string) => texto }
})

const base = { requestId: 'req-1', originalRequest: 'dame la lista de obras', normalizedIntent: 'dame la lista de obras', retrievalQuery: 'dame la lista de obras', requestedKnowledgeDomains: ['Obras'], requestsFullCatalog: false }
const LISTADO = { ...base, requestsPlainListing: true } as never
const NO_LISTADO = { ...base, requestsPlainListing: false } as never
const RESPUESTA = { responseType: 'RESPONSE_DIRECT', responseContent: 'ok' }
const SESION = {} as never

const ENV = process.env.SCENAIA_PAGINACION_ENABLED

function conocimiento(worksPage: unknown) {
  return { knowledgeDomains: ['Obras'], knowledgeEntities: [], knowledgeConfidence: 1, workOccupancy: {}, worksPage } as never
}

beforeEach(() => {
  vi.mocked(normalizeRequest).mockReset().mockReturnValue(LISTADO)
  vi.mocked(buildProfessionalContext).mockReset().mockResolvedValue({ identity: { userId: 'user-1' } } as never)
  vi.mocked(buildKnowledgeContext).mockReset().mockResolvedValue(conocimiento(null))
  vi.mocked(buildDecisionContext).mockReset().mockReturnValue({ needsAI: false } as never)
  vi.mocked(buildAuthorizationContext).mockReset().mockResolvedValue({ authorizationStatus: 'AUTHORIZED', reservationId: null, estimatedCost: null } as never)
  vi.mocked(executeAIRequest).mockReset().mockResolvedValue({ result: { executionStatus: 'NO_REQUERIDO' }, audit: { providerIdentifier: null, executionLatencyMs: null } } as never)
  vi.mocked(composeResponse).mockReset().mockReturnValue(RESPUESTA as never)
  vi.mocked(recordActivity).mockReset().mockResolvedValue(true)
  vi.mocked(distributeExecutionAudit).mockReset().mockResolvedValue(undefined)
  vi.mocked(buildDirectContent).mockReset().mockReturnValue('ok')
  vi.mocked(composePrompt).mockReset().mockReturnValue('prompt')
  vi.mocked(resolveVocabulary).mockReset().mockResolvedValue([])
  vi.mocked(recordTurnMetrics).mockReset().mockResolvedValue(true)
  vi.mocked(recordTurnFailure).mockReset().mockResolvedValue(true)
  vi.mocked(settleReservation).mockReset().mockResolvedValue({} as never)
  vi.mocked(releaseReservation).mockReset().mockResolvedValue({} as never)
  vi.mocked(resolveSettlementCost).mockReset().mockReturnValue(0)
  delete process.env.SCENAIA_PAGINACION_ENABLED
})

afterEach(() => {
  if (ENV === undefined) delete process.env.SCENAIA_PAGINACION_ENABLED
  else process.env.SCENAIA_PAGINACION_ENABLED = ENV
})

describe('listingPageOf (SCENAIA-004B §4.7)', () => {
  it('primera página con total: 1-10 y siguiente en 10', () => {
    expect(listingPageOf({ offset: 0, pageSize: 10, returned: 10, total: 11 })).toEqual({ from: 1, to: 10, total: 11, nextOffset: 10 })
  })

  it('última página parcial con total: 11-11 y sin siguiente', () => {
    expect(listingPageOf({ offset: 10, pageSize: 10, returned: 1, total: 11 })).toEqual({ from: 11, to: 11, total: 11, nextOffset: null })
  })

  it('última página exacta (to igual al total): sin siguiente', () => {
    expect(listingPageOf({ offset: 10, pageSize: 10, returned: 10, total: 20 })).toEqual({ from: 11, to: 20, total: 20, nextOffset: null })
  })

  it('total null con página llena: hay siguiente', () => {
    expect(listingPageOf({ offset: 0, pageSize: 10, returned: 10, total: null })).toEqual({ from: 1, to: 10, total: null, nextOffset: 10 })
  })

  it('total null con página parcial: sin siguiente', () => {
    expect(listingPageOf({ offset: 20, pageSize: 10, returned: 7, total: null })).toEqual({ from: 21, to: 27, total: null, nextOffset: null })
  })

  it('página vacía: to por debajo de from (cero obras) y sin siguiente', () => {
    expect(listingPageOf({ offset: 20, pageSize: 10, returned: 0, total: 11 })).toEqual({ from: 21, to: 20, total: 11, nextOffset: null })
    expect(listingPageOf({ offset: 20, pageSize: 10, returned: 0, total: null })).toEqual({ from: 21, to: 20, total: null, nextOffset: null })
  })

  it('sin siguiente si el desplazamiento siguiente superaría el máximo (la ruta lo rechazaría)', () => {
    const cerca = LISTADO_DESPLAZAMIENTO_MAXIMO - 5
    expect(listingPageOf({ offset: cerca, pageSize: 10, returned: 10, total: null }).nextOffset).toBeNull()
    expect(listingPageOf({ offset: LISTADO_DESPLAZAMIENTO_MAXIMO - 10, pageSize: 10, returned: 10, total: null }).nextOffset).toBe(LISTADO_DESPLAZAMIENTO_MAXIMO)
  })
})

describe('coordinateFlow — continuación (SCENAIA-004B §4.3)', () => {
  it('encendido y listado puro: el desplazamiento de la continuación sustituye al 0', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'

    await coordinateFlow('user-1', SESION, 'dame la lista de obras', [], null, { offset: 20 })

    expect(vi.mocked(buildKnowledgeContext).mock.calls[0][2]).toEqual({ offset: 20, pageSize: 10 })
  })

  it('encendido y listado puro, sin continuación: primera página (desplazamiento 0)', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'

    await coordinateFlow('user-1', SESION, 'dame la lista de obras')

    expect(vi.mocked(buildKnowledgeContext).mock.calls[0][2]).toEqual({ offset: 0, pageSize: 10 })
  })

  it('la continuación también se aplica en la segunda llamada, tras la reinterpretación', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
    vi.mocked(normalizeRequest).mockReturnValue({ ...(LISTADO as object), requestedKnowledgeDomains: [] } as never)
    vi.mocked(buildDecisionContext).mockReturnValue({ needsAI: true } as never)
    vi.mocked(buildAuthorizationContext).mockResolvedValue({ authorizationStatus: 'AUTHORIZED', reservationId: 'res-1', estimatedCost: 1 } as never)
    vi.mocked(resolveVocabulary).mockResolvedValue(['obra', 'corta'])

    await coordinateFlow('user-1', SESION, 'lista de piezas breves', [], null, { offset: 30 })

    expect(vi.mocked(buildKnowledgeContext).mock.calls.map((llamada) => llamada[2])).toEqual([
      { offset: 30, pageSize: 10 },
      { offset: 30, pageSize: 10 },
    ])
  })

  it('un mensaje que no es listado puro ignora la continuación: llamada de siempre', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
    vi.mocked(normalizeRequest).mockReturnValue(NO_LISTADO)

    const resultado = await coordinateFlow('user-1', SESION, 'recomiéndame una comedia', [], null, { offset: 20 })

    expect(vi.mocked(buildKnowledgeContext).mock.calls[0]).toHaveLength(2)
    expect('listingPage' in resultado).toBe(false)
  })

  it('interruptor apagado: la continuación se ignora y el resultado es el de siempre', async () => {
    vi.mocked(buildKnowledgeContext).mockResolvedValue(conocimiento({ offset: 20, pageSize: 10, returned: 1, total: 21 }))

    const resultado = await coordinateFlow('user-1', SESION, 'dame la lista de obras', [], null, { offset: 20 })

    expect(vi.mocked(buildKnowledgeContext).mock.calls[0]).toHaveLength(2)
    expect(Object.keys(resultado).sort()).toEqual(['conversationState', 'responseContext'])
  })
})

describe('coordinateFlow — listingPage en el resultado (SCENAIA-004B §4.7)', () => {
  it('encendido y con página entregada: listingPage al lado de la respuesta, nunca dentro', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
    vi.mocked(buildKnowledgeContext).mockResolvedValue(conocimiento({ offset: 10, pageSize: 10, returned: 1, total: 11 }))

    const resultado = await coordinateFlow('user-1', SESION, 'dame la lista de obras', [], null, { offset: 10 })

    expect(resultado.listingPage).toEqual({ from: 11, to: 11, total: 11, nextOffset: null })
    expect(resultado.responseContext).toBe(RESPUESTA)
    expect('listingPage' in resultado.responseContext).toBe(false)
  })

  it('encendido pero sin página entregada: la clave no aparece', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'

    const resultado = await coordinateFlow('user-1', SESION, 'dame la lista de obras')

    expect('listingPage' in resultado).toBe(false)
  })
})
