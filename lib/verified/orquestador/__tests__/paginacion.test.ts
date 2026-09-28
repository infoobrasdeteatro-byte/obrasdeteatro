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
import { LISTADO_TAMANO_PAGINA, LISTADO_DESPLAZAMIENTO_MAXIMO, paginacionActivada } from '../paginacion'

/**
 * SCENAIA-004B §4.1 y §4.4 (PR 1) -- el Orquestador decide cuándo se pide la
 * primera página del listado puro y pasa el tamaño como dato. Mismas
 * simulaciones que coordinate-flow.test.ts: aquí solo interesa con qué
 * argumentos se llama a buildKnowledgeContext.
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

const base = {
  requestId: 'req-1',
  originalRequest: 'dame la lista de obras',
  normalizedIntent: 'dame la lista de obras',
  retrievalQuery: 'dame la lista de obras',
  requestedKnowledgeDomains: ['Obras'],
  requestsFullCatalog: false,
}
const listadoPuro = { ...base, requestsPlainListing: true } as never
const noListado = { ...base, requestsPlainListing: false } as never
const PAGINA_1 = { offset: 0, pageSize: LISTADO_TAMANO_PAGINA }

function llamadasAKnowledgeContext() {
  return vi.mocked(buildKnowledgeContext).mock.calls
}

const ENV_ORIGINAL = process.env.SCENAIA_PAGINACION_ENABLED

beforeEach(() => {
  vi.mocked(normalizeRequest).mockReset().mockReturnValue(listadoPuro)
  vi.mocked(buildProfessionalContext).mockReset().mockResolvedValue({ identity: { userId: 'profile-1' } } as never)
  vi.mocked(buildKnowledgeContext).mockReset().mockResolvedValue({ knowledgeDomains: [], knowledgeEntities: [], knowledgeConfidence: 0 } as never)
  vi.mocked(buildDecisionContext).mockReset().mockReturnValue({ needsAI: false } as never)
  vi.mocked(buildAuthorizationContext).mockReset().mockResolvedValue({ authorizationStatus: 'AUTHORIZED', reservationId: null, estimatedCost: null } as never)
  vi.mocked(executeAIRequest).mockReset().mockResolvedValue({ result: { executionStatus: 'NO_REQUERIDO' }, audit: { providerIdentifier: null, executionLatencyMs: null } } as never)
  vi.mocked(composeResponse).mockReset().mockReturnValue({ responseType: 'RESPONSE_DIRECT', responseContent: 'ok' } as never)
  vi.mocked(recordActivity).mockReset().mockResolvedValue(true)
  vi.mocked(distributeExecutionAudit).mockReset().mockResolvedValue(undefined)
  vi.mocked(buildDirectContent).mockReset().mockReturnValue('Resultados.')
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
  if (ENV_ORIGINAL === undefined) delete process.env.SCENAIA_PAGINACION_ENABLED
  else process.env.SCENAIA_PAGINACION_ENABLED = ENV_ORIGINAL
})

describe('constantes de paginación (SCENAIA-004B §4.2)', () => {
  it('se definen con los valores autorizados', () => {
    expect(LISTADO_TAMANO_PAGINA).toBe(10)
    expect(LISTADO_DESPLAZAMIENTO_MAXIMO).toBe(50_000)
  })
})

describe('paginacionActivada() — interruptor SCENAIA_PAGINACION_ENABLED', () => {
  it('apagado por defecto: sin la variable', () => {
    expect(paginacionActivada()).toBe(false)
  })

  it.each(['1', 'true', 'TRUE', ' true '])('se enciende con %j', (valor) => {
    process.env.SCENAIA_PAGINACION_ENABLED = valor
    expect(paginacionActivada()).toBe(true)
  })

  it.each(['', '0', 'false', 'si', 'yes', 'on', 'verdadero'])('sigue apagado con %j', (valor) => {
    process.env.SCENAIA_PAGINACION_ENABLED = valor
    expect(paginacionActivada()).toBe(false)
  })

  it('se lee en cada llamada, no al cargar el módulo', () => {
    expect(paginacionActivada()).toBe(false)
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
    expect(paginacionActivada()).toBe(true)
    process.env.SCENAIA_PAGINACION_ENABLED = '0'
    expect(paginacionActivada()).toBe(false)
  })
})

describe('coordinateFlow — página del listado puro (SCENAIA-004B §4.4, PR 1)', () => {
  it('interruptor apagado: la llamada a buildKnowledgeContext es la de siempre, con dos argumentos', async () => {
    await coordinateFlow('profile-1', {} as never, 'dame la lista de obras')

    expect(llamadasAKnowledgeContext()).toHaveLength(1)
    expect(llamadasAKnowledgeContext()[0]).toHaveLength(2)
    expect(llamadasAKnowledgeContext()[0]).toEqual([listadoPuro, {}])
  })

  it('interruptor encendido y listado puro: pide la primera página con el tamaño como dato', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = 'true'

    await coordinateFlow('profile-1', {} as never, 'dame la lista de obras')

    expect(llamadasAKnowledgeContext()[0]).toEqual([listadoPuro, {}, PAGINA_1])
  })

  it('interruptor encendido pero NO es listado puro: la llamada es la de siempre', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
    vi.mocked(normalizeRequest).mockReturnValue(noListado)

    await coordinateFlow('profile-1', {} as never, 'recomiéndame una comedia')

    expect(llamadasAKnowledgeContext()[0]).toHaveLength(2)
  })

  it('el desplazamiento es siempre 0 en este PR', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'

    await coordinateFlow('profile-1', {} as never, 'dame la lista de obras')

    expect(llamadasAKnowledgeContext()[0][2]).toEqual({ offset: 0, pageSize: 10 })
  })

  describe('segunda llamada, tras la reinterpretación', () => {
    function conReinterpretacion(peticion: object) {
      vi.mocked(normalizeRequest).mockReturnValue({ ...peticion, requestedKnowledgeDomains: [] } as never)
      vi.mocked(buildDecisionContext).mockReturnValue({ needsAI: true } as never)
      vi.mocked(buildAuthorizationContext).mockResolvedValue({ authorizationStatus: 'AUTHORIZED', reservationId: 'res-1', estimatedCost: 1 } as never)
      vi.mocked(resolveVocabulary).mockResolvedValue(['obra', 'corta'])
    }

    it('apagado: las dos llamadas son las de siempre', async () => {
      conReinterpretacion(listadoPuro as object)

      await coordinateFlow('profile-1', {} as never, 'lista de piezas breves')

      expect(llamadasAKnowledgeContext()).toHaveLength(2)
      expect(llamadasAKnowledgeContext().every((llamada) => llamada.length === 2)).toBe(true)
    })

    it('encendido y listado puro: las dos llamadas piden la primera página', async () => {
      process.env.SCENAIA_PAGINACION_ENABLED = '1'
      conReinterpretacion(listadoPuro as object)

      await coordinateFlow('profile-1', {} as never, 'lista de piezas breves')

      expect(llamadasAKnowledgeContext()).toHaveLength(2)
      expect(llamadasAKnowledgeContext().map((llamada) => llamada[2])).toEqual([PAGINA_1, PAGINA_1])
    })

    it('encendido pero NO es listado puro: las dos llamadas son las de siempre', async () => {
      process.env.SCENAIA_PAGINACION_ENABLED = '1'
      conReinterpretacion(noListado as object)

      await coordinateFlow('profile-1', {} as never, 'tienes alguna pieza breve?')

      expect(llamadasAKnowledgeContext()).toHaveLength(2)
      expect(llamadasAKnowledgeContext().every((llamada) => llamada.length === 2)).toBe(true)
    })
  })
})
