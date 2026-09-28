import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import type { ProfessionalContext } from '@/lib/professional-context-engine'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '@/lib/ai-gateway'
import { findProviderAdapter } from '@/lib/ai-gateway/provider-registry'
import { verifyAndReserve, settleReservation, releaseReservation } from '@/lib/accounting-engine'
import { resolveVocabulary } from '@/lib/intent-resolver'
import { normalizeRequest } from '@/lib/request-interpreter'
import { coordinateFlow } from '../coordinate-flow'

/**
 * SCENAIA-004B §6.1 -- RIESGO ECONÓMICO. Una continuación del listado no
 * debe llegar nunca a la IA ni reservar créditos, tampoco con cero
 * resultados.
 *
 * Decision Engine, Credit Manager, AI Gateway, Response Composer,
 * composición directa y Request Interpreter son REALES. Solo se simulan la
 * reserva y la liquidación (Accounting Engine, que escribiría en la base),
 * el registro de proveedores del Gateway (para contar cualquier intento de
 * ejecución), el conocimiento (para fijar la página) y lo que escribe en la
 * base de datos (actividad, auditoría y métricas).
 */

vi.mock('@/lib/professional-context-engine', () => ({ buildProfessionalContext: vi.fn() }))
vi.mock('@/lib/scenaia-knowledge-model', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/scenaia-knowledge-model')>()),
  buildKnowledgeContext: vi.fn(),
}))
vi.mock('@/lib/accounting-engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/accounting-engine')>()),
  verifyAndReserve: vi.fn(),
  settleReservation: vi.fn(),
  releaseReservation: vi.fn(),
}))
vi.mock('@/lib/ai-gateway/provider-registry', () => ({ findProviderAdapter: vi.fn(() => null) }))
vi.mock('@/lib/intent-resolver', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/intent-resolver')>()),
  resolveVocabulary: vi.fn(),
}))
vi.mock('@/lib/procesos-asincronos', () => ({ recordActivity: vi.fn() }))
vi.mock('@/lib/execution-audit-router', () => ({ distributeExecutionAudit: vi.fn() }))
vi.mock('@/lib/verified/observabilidad', () => ({ recordTurnMetrics: vi.fn(), recordTurnFailure: vi.fn() }))

const CONTEXTO_PROFESIONAL = {
  identity: { userId: 'user-1', profileType: 'actor', language: 'es', country: 'ES', timezone: null, authenticationStatus: 'autenticado' },
  subscription: { plan: 'premium', status: 'active', availableCapabilities: null, usageLimits: null },
  professionalProfile: { specialty: null, disciplines: null, experience: null, publicProfile: null },
  session: { route: null, module: null, locale: 'es', timestamp: 'T' },
} as ProfessionalContext

const OBRA = {
  domain: 'Obras' as const,
  data: { id: 'w11', title: "Teresa's Ecstasy", author: null, genre: 'Teatro contemporáneo', year: null } as never,
  provenance: {} as never,
  functions: [],
}

function conocimiento(obras: typeof OBRA[], overrides: Partial<KnowledgeContext> = {}): KnowledgeContext {
  return {
    knowledgeSummary: {
      domainsRequested: ['Obras'],
      domainsCovered: ['Obras'],
      domainsNotCovered: [],
      entryLabelsByDomain: { Obras: obras.map((o) => (o.data as { title: string }).title) },
    },
    knowledgeDomains: ['Obras'],
    knowledgeEntities: obras,
    knowledgeRelations: null,
    knowledgeConfidence: 1,
    knowledgeCompleteness: 'completo',
    knowledgeLimitations: [],
    workOccupancy: {},
    knowledgeTimestamp: 'T',
    ...overrides,
  }
}

const CONTINUACIONES: [string, KnowledgeContext][] = [
  ['página vacía, 0 resultados', conocimiento([], { worksPage: { offset: 20, pageSize: 10, returned: 0, total: 11 } })],
  ['página con una obra', conocimiento([OBRA], { worksPage: { offset: 10, pageSize: 10, returned: 1, total: 11 } })],
  ['recuento no determinado', conocimiento([OBRA], { worksPage: { offset: 10, pageSize: 10, returned: 1, total: null } })],
  ['conocimiento parcial (defensivo)', conocimiento([], { knowledgeCompleteness: 'parcial', worksPage: { offset: 10, pageSize: 10, returned: 0, total: 11 } })],
]

const ENV_ORIGINAL = process.env.SCENAIA_PAGINACION_ENABLED

beforeEach(() => {
  vi.mocked(buildProfessionalContext).mockReset().mockResolvedValue(CONTEXTO_PROFESIONAL)
  vi.mocked(buildKnowledgeContext).mockReset()
  vi.mocked(verifyAndReserve).mockReset()
  vi.mocked(settleReservation).mockReset()
  vi.mocked(releaseReservation).mockReset()
  vi.mocked(findProviderAdapter).mockClear()
  vi.mocked(resolveVocabulary).mockReset().mockResolvedValue([])
  delete process.env.SCENAIA_PAGINACION_ENABLED
})

afterEach(() => {
  if (ENV_ORIGINAL === undefined) delete process.env.SCENAIA_PAGINACION_ENABLED
  else process.env.SCENAIA_PAGINACION_ENABLED = ENV_ORIGINAL
})

describe('continuación del listado: sin IA y sin créditos (SCENAIA-004B §6.1)', () => {
  it.each(CONTINUACIONES)('%s — Decision Engine, Credit Manager y Gateway reales', async (_caso, conocimientoDelTurno) => {
    const peticion = normalizeRequest('dame la lista de obras', 'turn-1')

    const decision = buildDecisionContext(peticion, CONTEXTO_PROFESIONAL, conocimientoDelTurno, null)
    expect(decision.needsAI).toBe(false)

    const autorizacion = await buildAuthorizationContext(CONTEXTO_PROFESIONAL, decision)
    expect(autorizacion.authorizationStatus).toBe('AUTHORIZED')
    expect(autorizacion.authorizationReason).toMatch(/^NO_APLICA/)
    expect(autorizacion.reservationId).toBeNull()
    expect(autorizacion.estimatedCost).toBeNull()
    expect(verifyAndReserve).not.toHaveBeenCalled()

    const { result } = await executeAIRequest({
      decisionContext: decision,
      authorizationContext: autorizacion,
      normalizedAIRequest: { userPrompt: 'no debe enviarse', operationKind: 'TEXT_STANDARD' },
    })
    expect(result.executionStatus).toBe('NO_REQUERIDO')
    expect(findProviderAdapter).not.toHaveBeenCalled()
  })

  it.each(CONTINUACIONES)('%s — turno completo con el Orquestador: cero ejecuciones del Gateway y cero reservas', async (_caso, conocimientoDelTurno) => {
    vi.mocked(buildKnowledgeContext).mockResolvedValue(conocimientoDelTurno)

    const { responseContext } = await coordinateFlow('user-1', { route: null, module: null, locale: 'es' } as never, 'dame la lista de obras')

    expect(findProviderAdapter).not.toHaveBeenCalled()
    expect(resolveVocabulary).not.toHaveBeenCalled()
    expect(verifyAndReserve).not.toHaveBeenCalled()
    expect(settleReservation).not.toHaveBeenCalled()
    expect(releaseReservation).not.toHaveBeenCalled()
    expect(responseContext.responseType).toBe('RESPONSE_DIRECT')
  })

  it('la página vacía llega al usuario como "No hay más obras en este listado."', async () => {
    vi.mocked(buildKnowledgeContext).mockResolvedValue(CONTINUACIONES[0][1])

    const { responseContext } = await coordinateFlow('user-1', { route: null, module: null, locale: 'es' } as never, 'dame la lista de obras')

    expect(responseContext.responseContent).toBe('No hay más obras en este listado.')
  })
})

describe('un mensaje que NO es listado puro nunca recibe una página con desplazamiento', () => {
  it.each(['recomiéndame una comedia para cuatro actores', '¿qué obra de Lope me aconsejas?', 'hola'])(
    'con el interruptor encendido, "%s" no recibe ninguna página',
    async (mensaje) => {
      process.env.SCENAIA_PAGINACION_ENABLED = '1'
      vi.mocked(buildKnowledgeContext).mockResolvedValue(conocimiento([]))
      expect(normalizeRequest(mensaje, 't').requestsPlainListing).toBe(false)

      await coordinateFlow('user-1', { route: null, module: null, locale: 'es' } as never, mensaje)

      for (const llamada of vi.mocked(buildKnowledgeContext).mock.calls) expect(llamada).toHaveLength(2)
    }
  )

  it('y un listado puro solo recibe la primera página (desplazamiento 0) en este punto de la Parte 3', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
    vi.mocked(buildKnowledgeContext).mockResolvedValue(conocimiento([OBRA], { worksPage: { offset: 0, pageSize: 10, returned: 1, total: 1 } }))

    await coordinateFlow('user-1', { route: null, module: null, locale: 'es' } as never, 'dame la lista de obras')

    const paginas = vi.mocked(buildKnowledgeContext).mock.calls.map((llamada) => llamada[2])
    expect(paginas.length).toBeGreaterThan(0)
    expect(paginas.every((p) => p !== undefined && p.offset === 0)).toBe(true)
  })
})
