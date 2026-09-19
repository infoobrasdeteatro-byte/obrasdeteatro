import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPublishedWorks, listPublishedWorkAuthors } from '@/lib/repository-layer'
import type { Work, WorkSearchCriteria } from '@/lib/repository-layer'
import { buildDecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '@/lib/ai-gateway'
import { buildProfessionalContext } from '@/lib/professional-context-engine'
import { resolveVocabulary } from '@/lib/intent-resolver'
import { resolveSettlementCost } from '@/lib/accounting-engine'
import { composeResponse } from '@/lib/response-composer'
import { coordinateFlow } from '../coordinate-flow'
import type { IncomingConversationState } from '@/lib/conversation-state'

/**
 * Casos de la propuesta "catalogo completo sin filtros heredados", sobre
 * los motores deterministas REALES: interprete, modelo de conocimiento,
 * reglas de Obras, estado conversacional y compositor del prompt. Solo se
 * simulan la base de datos, la IA y la contabilidad.
 *
 * El catalogo es de prueba: los autores y el numero de obras son los de
 * produccion; las duraciones y los generos, no.
 */

vi.mock('@/lib/repository-layer', async () => {
  const { normalizeLocationValue, resolveLocationVariants } = await import('@/lib/repository-layer/location-normalization')

  return {
    normalizeLocationValue,
    resolveLocationVariants,
    listPublishedWorks: vi.fn(),
    listPublishedWorkAuthors: vi.fn(),
    getPublishedWorkById: vi.fn(),
    listOrganizationLocations: vi.fn().mockResolvedValue([]),
    listPersonLocations: vi.fn().mockResolvedValue([]),
  }
})
vi.mock('@/lib/professional-context-engine', () => ({ buildProfessionalContext: vi.fn() }))
vi.mock('@/lib/decision-engine', () => ({ buildDecisionContext: vi.fn() }))
vi.mock('@/lib/credit-manager', () => ({ buildAuthorizationContext: vi.fn() }))
vi.mock('@/lib/ai-gateway', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ai-gateway')>()),
  executeAIRequest: vi.fn(),
}))
vi.mock('@/lib/response-composer', () => ({ composeResponse: vi.fn() }))
vi.mock('@/lib/procesos-asincronos', () => ({ recordActivity: vi.fn().mockResolvedValue(true) }))
vi.mock('@/lib/execution-audit-router', () => ({ distributeExecutionAudit: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/verified/observabilidad', () => ({
  recordTurnMetrics: vi.fn().mockResolvedValue(true),
  recordTurnFailure: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/accounting-engine', () => ({
  settleReservation: vi.fn().mockResolvedValue({}),
  releaseReservation: vi.fn().mockResolvedValue({}),
  resolveSettlementCost: vi.fn(),
  CREDIT_VALUE: { amountPerCredit: 0.0003, currency: 'USD' },
}))
vi.mock('@/lib/intent-resolver', async () => {
  const { composeAugmentedRequest } = await import('@/lib/intent-resolver/vocabulary')

  return { resolveVocabulary: vi.fn(), composeAugmentedRequest, buildResolverPrompt: (texto: string) => texto }
})

const CALDERON = 'Pedro Calderón de la Barca'
const LOPE = 'Lope de Vega'

function obra(id: number, title: string, author: string, genre: string, durationMinutes: number): Work {
  return {
    id: `w-${id}`,
    title,
    subtitle: null,
    author,
    genre,
    synopsis: null,
    language: 'es',
    year: null,
    slug: null,
    minAge: null,
    durationMinutes,
    castSizeMax: 6,
    sourceName: null,
    sourceUrl: null,
  }
}

const CATALOGO: Work[] = [
  obra(1, 'La dama boba', LOPE, 'comedia', 105),
  obra(2, 'El perro del hortelano', LOPE, 'comedia', 55),
  obra(3, 'Fuenteovejuna', LOPE, 'drama', 110),
  obra(4, 'El caballero de Olmedo', LOPE, 'drama', 95),
  obra(5, 'Peribáñez', LOPE, 'drama', 45),
  obra(6, 'La vida es sueño', CALDERON, 'drama', 120),
  obra(7, 'El alcalde de Zalamea', CALDERON, 'drama', 110),
  obra(8, 'La dama duende', CALDERON, 'comedia', 100),
  obra(9, 'Casa con dos puertas', CALDERON, 'comedia', 50),
  obra(10, 'El gran teatro del mundo', CALDERON, 'drama', 40),
  obra(11, "Teresa's Ecstasy", 'Begonya Plaza', 'drama', 60),
]

function cumple(work: Work, criteria: WorkSearchCriteria): boolean {
  if (criteria.author !== undefined && !(work.author ?? '').includes(criteria.author)) return false
  if (criteria.genre !== undefined && work.genre !== criteria.genre) return false
  if (criteria.maxDurationMinutes !== undefined && (work.durationMinutes ?? Infinity) > criteria.maxDurationMinutes) return false
  if (criteria.minDurationMinutes !== undefined && (work.durationMinutes ?? 0) < criteria.minDurationMinutes) return false
  if (criteria.maxCastSize !== undefined && (work.castSizeMax ?? Infinity) > criteria.maxCastSize) return false
  return true
}

const INSTRUCCION = 'no filtres por criterios del historial'

interface Observacion {
  readonly criterios: WorkSearchCriteria | undefined
  readonly obras: number
  readonly instruccion: boolean
  readonly ocupacionGuardada: unknown
}

/** Ejecuta la conversacion turno a turno y observa el ultimo. */
async function conversar(turnos: readonly string[]): Promise<Observacion> {
  const historial: { role: 'user' | 'assistant'; content: string }[] = []
  let estado: IncomingConversationState | null = null
  let observacion: Observacion | null = null

  for (const texto of turnos) {
    vi.mocked(listPublishedWorks).mockClear()
    vi.mocked(executeAIRequest).mockClear()

    const { conversationState } = await coordinateFlow('profile-1', { currentRoute: '/scenaia' } as never, texto, historial, estado)

    const busquedas = vi.mocked(listPublishedWorks).mock.calls
    const criterios = busquedas.length > 0 ? busquedas[busquedas.length - 1][0] : undefined
    const prompt = vi.mocked(executeAIRequest).mock.calls[0]?.[0].normalizedAIRequest.userPrompt ?? ''

    observacion = {
      criterios,
      obras: criterios === undefined ? 0 : CATALOGO.filter((work) => cumple(work, criterios)).length,
      instruccion: prompt.includes(INSTRUCCION),
      ocupacionGuardada: conversationState.occupancyByDomain.find((entrada) => entrada.domain === 'Obras')?.slots ?? {},
    }

    historial.push({ role: 'user', content: texto }, { role: 'assistant', content: 'Respuesta de ScenaIA.' })
    estado = conversationState
  }

  return observacion as Observacion
}

beforeEach(() => {
  vi.mocked(listPublishedWorks)
    .mockReset()
    .mockImplementation(async (criteria: WorkSearchCriteria = {}) => CATALOGO.filter((work) => cumple(work, criteria)))
  vi.mocked(listPublishedWorkAuthors).mockReset().mockResolvedValue([LOPE, CALDERON, 'Begonya Plaza'])
  vi.mocked(buildProfessionalContext).mockReset().mockResolvedValue({ identity: { userId: 'profile-1' } } as never)
  vi.mocked(buildDecisionContext).mockReset().mockReturnValue({ needsAI: true } as never)
  vi.mocked(buildAuthorizationContext)
    .mockReset()
    .mockResolvedValue({ authorizationStatus: 'AUTHORIZED', reservationId: 'res-1', estimatedCost: 1 } as never)
  vi.mocked(executeAIRequest)
    .mockReset()
    .mockResolvedValue({ result: { executionStatus: 'EJECUTADO' }, audit: {} } as never)
  vi.mocked(resolveVocabulary).mockReset().mockResolvedValue([])
  vi.mocked(resolveSettlementCost).mockReset().mockReturnValue(1)
  vi.mocked(composeResponse).mockReset().mockReturnValue({ responseType: 'RESPONSE_SUCCESS', responseContent: 'ok' } as never)
})

const TURNO_CALDERON = 'Dame una lista de obras de Calderón de la Barca'
const TURNO_COMEDIAS = '¿Qué obras de comedia tienes?'

describe('catalogo completo — ya no hereda los filtros', () => {
  it('1 · tras Calderon, "dame una lista de todas las obras" recupera el catalogo entero y pide no filtrar', async () => {
    const r = await conversar([TURNO_CALDERON, 'dame una lista de todas las obras'])

    expect(r.criterios).toEqual({})
    expect(r.obras).toBe(11)
    expect(r.instruccion).toBe(true)
    expect(r.ocupacionGuardada).toEqual({})
  })

  it('2 · tras Calderon, "dame todo el catálogo" deja de heredar el autor', async () => {
    const r = await conversar([TURNO_CALDERON, 'dame todo el catálogo'])

    expect(r.criterios).toEqual({})
    expect(r.obras).toBe(11)
    expect(r.instruccion).toBe(true)
  })

  it('2b · igual aunque el resolutor anada el dominio al reinterpretar', async () => {
    vi.mocked(resolveVocabulary).mockResolvedValue(['obra'])

    const r = await conversar([TURNO_CALDERON, 'dame todo el catálogo'])

    expect(r.criterios).toEqual({})
    expect(r.obras).toBe(11)
    expect(r.instruccion).toBe(true)
  })

  it('3 · tras Calderon, "¿y cualquier obra?" recupera todo y pide no filtrar', async () => {
    const r = await conversar([TURNO_CALDERON, '¿y cualquier obra?'])

    expect(r.criterios).toEqual({})
    expect(r.obras).toBe(11)
    expect(r.instruccion).toBe(true)
  })

  it('4 · tras comedias, "dame una lista de todas las obras" deja de heredar el genero', async () => {
    const r = await conversar([TURNO_COMEDIAS, 'dame una lista de todas las obras'])

    expect(r.criterios).toEqual({})
    expect(r.obras).toBe(11)
    expect(r.ocupacionGuardada).toEqual({})
  })

  it('5 · tras comedias, "sin filtros, ¿qué obras tienes?" deja de heredar el genero', async () => {
    const r = await conversar([TURNO_COMEDIAS, 'sin filtros, ¿qué obras tienes?'])

    expect(r.criterios).toEqual({})
    expect(r.obras).toBe(11)
  })

  it('6 · en el primer turno, "dame una lista de todas las obras" recupera las 11', async () => {
    const r = await conversar(['dame una lista de todas las obras'])

    expect(r.criterios).toEqual({})
    expect(r.obras).toBe(11)
  })
})

describe('catalogo completo — la herencia util no cambia (regresion 7-10)', () => {
  it('7 · tras comedias, "¿y alguna más corta?" suma el criterio nuevo al anterior', async () => {
    const r = await conversar([TURNO_COMEDIAS, '¿y alguna más corta?'])

    expect(r.criterios).toEqual({ genre: 'comedia', maxDurationMinutes: 60 })
    expect(r.obras).toBe(2)
    expect(r.instruccion).toBe(false)
  })

  it('8 · tras Calderon, "¿y alguna más corta?" conserva el autor', async () => {
    const r = await conversar([TURNO_CALDERON, '¿y alguna más corta?'])

    expect(r.criterios).toEqual({ author: CALDERON, maxDurationMinutes: 60 })
    expect(r.obras).toBe(2)
    expect(r.instruccion).toBe(false)
  })

  it('9 · tras comedias, "todas las obras cortas" trae criterio propio: la regla no actua', async () => {
    const r = await conversar([TURNO_COMEDIAS, 'todas las obras cortas'])

    expect(r.criterios).toEqual({ genre: 'comedia', maxDurationMinutes: 60 })
    expect(r.obras).toBe(2)
    expect(r.instruccion).toBe(false)
  })

  it('10 · tras Calderon, "¿y de Lope de Vega?" cambia de autor', async () => {
    const r = await conversar([TURNO_CALDERON, '¿y de Lope de Vega?'])

    expect(r.criterios).toMatchObject({ author: LOPE })
    expect(r.instruccion).toBe(false)
  })
})
