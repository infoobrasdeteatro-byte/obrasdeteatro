import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
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
import { resolveVocabulary, buildResolverPrompt } from '@/lib/intent-resolver'
import { coordinateFlow } from '../coordinate-flow'
import { LISTADO_TAMANO_PAGINA } from '../paginacion'
import { epocaActivada, argumentosEpoca } from '../epoca'

/**
 * SCENAIA-007 (adenda al §4.2): el Orquestador lee SCENAIA_EPOCA_ENABLED y lo
 * transporta como dato a buildKnowledgeContext y al Intent Resolver. Mismas
 * simulaciones que paginacion.test.ts: aquí solo interesa con qué
 * argumentos se llama a cada uno.
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

  return { resolveVocabulary: vi.fn(), composeAugmentedRequest, buildResolverPrompt: vi.fn((texto: string) => texto) }
})

const ON = { epocaHabilitada: true } as const
const base = {
  requestId: 'req-1',
  originalRequest: 'obras barrocas',
  normalizedIntent: 'obras barrocas',
  retrievalQuery: 'obras barrocas',
  requestedKnowledgeDomains: ['Obras'],
  requestsFullCatalog: false,
}
const listadoPuro = { ...base, requestsPlainListing: true } as never
const noListado = { ...base, requestsPlainListing: false } as never

const ENV = ['SCENAIA_EPOCA_ENABLED', 'SCENAIA_PAGINACION_ENABLED'] as const
const ENV_ORIGINAL = Object.fromEntries(ENV.map((k) => [k, process.env[k]]))

beforeEach(() => {
  vi.mocked(normalizeRequest).mockReset().mockReturnValue(noListado)
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
  vi.mocked(buildResolverPrompt).mockClear()
  vi.mocked(recordTurnMetrics).mockReset().mockResolvedValue(true)
  vi.mocked(recordTurnFailure).mockReset().mockResolvedValue(true)
  vi.mocked(settleReservation).mockReset().mockResolvedValue({} as never)
  vi.mocked(releaseReservation).mockReset().mockResolvedValue({} as never)
  vi.mocked(resolveSettlementCost).mockReset().mockReturnValue(0)
  for (const k of ENV) delete process.env[k]
})

afterEach(() => {
  for (const k of ENV) {
    if (ENV_ORIGINAL[k] === undefined) delete process.env[k]
    else process.env[k] = ENV_ORIGINAL[k]
  }
})

describe('epocaActivada() — interruptor SCENAIA_EPOCA_ENABLED', () => {
  it('apagado por defecto: sin la variable', () => {
    expect(epocaActivada()).toBe(false)
  })

  it.each(['1', 'true', 'TRUE', ' true '])('se enciende con %j', (valor) => {
    process.env.SCENAIA_EPOCA_ENABLED = valor
    expect(epocaActivada()).toBe(true)
  })

  it.each(['', '0', 'false', 'si', 'yes', 'on', 'verdadero'])('sigue apagado con %j', (valor) => {
    process.env.SCENAIA_EPOCA_ENABLED = valor
    expect(epocaActivada()).toBe(false)
  })

  it('se lee en cada llamada, no al cargar el módulo', () => {
    expect(epocaActivada()).toBe(false)
    process.env.SCENAIA_EPOCA_ENABLED = '1'
    expect(epocaActivada()).toBe(true)
    process.env.SCENAIA_EPOCA_ENABLED = '0'
    expect(epocaActivada()).toBe(false)
  })

  it('argumentosEpoca: ninguno apagado; la opción encendido', () => {
    expect(argumentosEpoca(false)).toEqual([])
    expect(argumentosEpoca(true)).toEqual([ON])
  })
})

describe('coordinateFlow — transporte de la época a buildKnowledgeContext', () => {
  it('apagado: la llamada es la de siempre, con dos argumentos', async () => {
    await coordinateFlow('profile-1', {} as never, 'obras barrocas')

    expect(vi.mocked(buildKnowledgeContext).mock.calls).toEqual([[noListado, {}]])
  })

  it('encendido, sin página: la ocupación, `undefined` en lugar de la página y la opción', async () => {
    process.env.SCENAIA_EPOCA_ENABLED = '1'
    await coordinateFlow('profile-1', {} as never, 'obras barrocas')

    expect(vi.mocked(buildKnowledgeContext).mock.calls).toEqual([[noListado, {}, undefined, ON]])
  })

  it('encendido con paginación y listado puro: la página y la opción', async () => {
    process.env.SCENAIA_EPOCA_ENABLED = '1'
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
    vi.mocked(normalizeRequest).mockReturnValue(listadoPuro)
    await coordinateFlow('profile-1', {} as never, 'dame la lista de obras barrocas')

    expect(vi.mocked(buildKnowledgeContext).mock.calls).toEqual([[listadoPuro, {}, { offset: 0, pageSize: LISTADO_TAMANO_PAGINA }, ON]])
  })

  it('apagada la época con paginación encendida: la página, como siempre, sin opción', async () => {
    process.env.SCENAIA_PAGINACION_ENABLED = '1'
    vi.mocked(normalizeRequest).mockReturnValue(listadoPuro)
    await coordinateFlow('profile-1', {} as never, 'dame la lista de obras barrocas')

    expect(vi.mocked(buildKnowledgeContext).mock.calls).toEqual([[listadoPuro, {}, { offset: 0, pageSize: LISTADO_TAMANO_PAGINA }]])
  })
})

describe('invariantes de contrato (solo lo que reabre SCENAIA-007 PR 3)', () => {
  const RAIZ = join(__dirname, '..', '..', '..', '..')
  const fuente = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf-8')

  /** Ficheros de código de la aplicación (sin pruebas) bajo un directorio. */
  function codigo(dir: string): string[] {
    return readdirSync(join(RAIZ, dir), { recursive: true, encoding: 'utf-8' })
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/__tests__/.test(f))
      .map((f) => join(dir, f))
  }

  it('SCENAIA_EPOCA_ENABLED solo se lee en lib/verified/orquestador/epoca.ts', () => {
    // Se busca la LECTURA del entorno, no la mención: varios ficheros nombran
    // el interruptor en sus comentarios para explicar de dónde llega el dato.
    const lectores = [...codigo('lib'), ...codigo('app')].filter((f) =>
      /process\.env(\.|\[\s*['"])SCENAIA_EPOCA_ENABLED/.test(fuente(f))
    )
    expect(lectores.map((f) => f.replace(/\\/g, '/'))).toEqual(['lib/verified/orquestador/epoca.ts'])
  })

  it('el intérprete, el Intent Resolver y la validación del estado no leen el entorno: la época les llega como dato', () => {
    for (const ruta of [
      'lib/knowledge-assets/interpret-work-query.ts',
      'lib/knowledge-assets/semantic-retriever.ts',
      'lib/intent-resolver/vocabulary.ts',
      'lib/intent-resolver/resolve-vocabulary.ts',
      'lib/conversation-state/validate.ts',
      'lib/scenaia-knowledge-model/retrieve-knowledge.ts',
      'lib/scenaia-knowledge-model/knowledge-context-builder.ts',
    ]) {
      expect(fuente(ruta), ruta).not.toMatch(/process\.env|epocaActivada/)
    }
  })

  it('la ruta valida el estado heredado con el interruptor vigente', () => {
    expect(fuente('app/api/scenaia-verified/route.ts')).toMatch(
      /parseConversationState\(body\.conversationState, \.\.\.argumentosEpoca\(epocaActivada\(\)\)\)/
    )
  })

  it('el Orquestador lee el interruptor una sola vez por turno', () => {
    expect(fuente('lib/verified/orquestador/coordinate-flow.ts').match(/epocaActivada\(\)/g)).toHaveLength(1)
  })
})

describe('coordinateFlow — transporte de la época al Intent Resolver', () => {
  beforeEach(() => {
    vi.mocked(buildDecisionContext).mockReturnValue({ needsAI: true } as never)
  })

  it('apagado: resolveVocabulary y buildResolverPrompt reciben los argumentos de siempre', async () => {
    await coordinateFlow('profile-1', {} as never, 'obras barrocas')

    expect(vi.mocked(resolveVocabulary).mock.calls[0]).toHaveLength(2)
    expect(vi.mocked(buildResolverPrompt).mock.calls[0]).toEqual(['obras barrocas'])
  })

  it('encendido: los dos reciben la opción como último argumento', async () => {
    process.env.SCENAIA_EPOCA_ENABLED = '1'
    await coordinateFlow('profile-1', {} as never, 'obras barrocas')

    expect(vi.mocked(resolveVocabulary).mock.calls[0]).toHaveLength(3)
    expect(vi.mocked(resolveVocabulary).mock.calls[0][2]).toEqual(ON)
    expect(vi.mocked(buildResolverPrompt).mock.calls[0]).toEqual(['obras barrocas', ON])
  })

  it('encendido: un término de época resuelto se compone como criterio y la reinterpretación lleva la opción', async () => {
    process.env.SCENAIA_EPOCA_ENABLED = '1'
    vi.mocked(resolveVocabulary).mockResolvedValue(['obra', 'barroco'])
    await coordinateFlow('profile-1', {} as never, 'algo de aquella epoca de calderon')

    expect(vi.mocked(normalizeRequest).mock.calls[1][0]).toBe('algo de aquella epoca de calderon obra para barroco')
    expect(vi.mocked(buildKnowledgeContext).mock.calls[1]).toEqual([noListado, {}, undefined, ON])
  })

  it('apagado: el mismo término de época no se compone (no es un criterio emitible)', async () => {
    vi.mocked(resolveVocabulary).mockResolvedValue(['obra', 'barroco'])
    await coordinateFlow('profile-1', {} as never, 'algo de aquella epoca de calderon')

    expect(vi.mocked(normalizeRequest).mock.calls[1][0]).toBe('algo de aquella epoca de calderon obra')
    expect(vi.mocked(buildKnowledgeContext).mock.calls[1]).toEqual([noListado, {}])
  })
})
