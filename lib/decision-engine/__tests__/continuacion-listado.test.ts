import { describe, it, expect } from 'vitest'
import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { ProfessionalContext } from '@/lib/professional-context-engine'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { needsAI } from '../needs-ai'
import { isListingContinuation } from '../plain-listing'
import { buildDecisionContext } from '../decision-context-builder'

/**
 * SCENAIA-004B §4.5 -- una página siguiente del listado puro NUNCA pide IA,
 * también con cero resultados. Con desplazamiento 0 o sin página, la regla
 * es exactamente la de siempre.
 */

function peticion(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    requestId: 'req-1',
    originalRequest: 'dame la lista de obras',
    normalizedIntent: 'dame la lista de obras',
    retrievalQuery: 'dame la lista de obras',
    requestsFullCatalog: false,
    requestsPlainListing: true,
    requestType: 'RECONOCIDA',
    requestedKnowledgeDomains: ['Obras'],
    estimatedComplexity: 'media',
    professionalContextLevel: 'STANDARD',
    detectedAmbiguities: [],
    interpretationConfidence: 1,
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

const CONTEXTO_PROFESIONAL = {
  identity: { userId: 'user-1', profileType: 'actor', language: 'es', country: 'ES', timezone: null, authenticationStatus: 'autenticado' },
  subscription: { plan: null, status: null, availableCapabilities: null, usageLimits: null },
  professionalProfile: { specialty: null, disciplines: null, experience: null, publicProfile: null },
  session: { route: null, module: null, locale: 'es', timestamp: new Date().toISOString() },
} as ProfessionalContext

const OBRA = { domain: 'Obras' as const, data: { id: 'w1', title: 'La vida es sueño' } as never, provenance: {} as never, functions: [] }

function conocimiento(overrides: Partial<KnowledgeContext> = {}): KnowledgeContext {
  return {
    knowledgeSummary: { domainsRequested: ['Obras'], domainsCovered: ['Obras'], domainsNotCovered: [], entryLabelsByDomain: { Obras: [] } },
    knowledgeDomains: ['Obras'],
    knowledgeEntities: [],
    knowledgeRelations: null,
    knowledgeConfidence: 1,
    knowledgeCompleteness: 'completo',
    knowledgeLimitations: [],
    workOccupancy: {},
    knowledgeTimestamp: new Date().toISOString(),
    ...overrides,
  }
}

/** Contexto de operación con coste calculable, para que una decisión con IA tenga coste > 0. */
const OPERACION = {
  promptCharacters: 4000,
  maxOutputTokensByOperation: { TEXT_STANDARD: 512, RESOLVER: 64 } as never,
  resolverPromptCharacters: 800,
  creditValue: { amountPerCredit: 0.0003, currency: 'USD' } as never,
}

const COMPLETITUDES = ['completo', 'parcial', 'vacio'] as const

describe('needsAI — continuación del listado (SCENAIA-004B §4.5)', () => {
  it.each(COMPLETITUDES)('con continuación nunca pide IA (completitud %s, con y sin obras, sea o no listado puro)', (completitud) => {
    for (const obras of [0, 1, 10]) {
      for (const listadoPuro of [false, true]) {
        expect(needsAI(completitud, obras, listadoPuro, true)).toBe(false)
      }
    }
  })

  it('sin continuación, la regla es exactamente la de siempre', () => {
    const reglaDeSiempre = (c: string, n: number, lp: boolean) => (c !== 'completo' ? true : lp ? false : n > 0)
    for (const c of COMPLETITUDES) {
      for (const n of [0, 1, 10]) {
        for (const lp of [false, true]) {
          expect(needsAI(c, n, lp, false)).toBe(reglaDeSiempre(c, n, lp))
          expect(needsAI(c, n, lp)).toBe(reglaDeSiempre(c, n, lp))
        }
      }
    }
  })
})

describe('isListingContinuation', () => {
  it('solo es continuación una página con desplazamiento mayor que cero', () => {
    expect(isListingContinuation(conocimiento())).toBe(false)
    expect(isListingContinuation(conocimiento({ worksPage: null }))).toBe(false)
    expect(isListingContinuation(conocimiento({ worksPage: { offset: 0, pageSize: 10, returned: 10, total: 11 } }))).toBe(false)
    expect(isListingContinuation(conocimiento({ worksPage: { offset: 10, pageSize: 10, returned: 1, total: 11 } }))).toBe(true)
    expect(isListingContinuation(conocimiento({ worksPage: { offset: 20, pageSize: 10, returned: 0, total: 11 } }))).toBe(true)
  })
})

describe('buildDecisionContext — continuación', () => {
  it.each([
    ['página vacía (0 resultados)', [], { offset: 20, pageSize: 10, returned: 0, total: 11 }],
    ['página con resultados', [OBRA], { offset: 10, pageSize: 10, returned: 1, total: 11 }],
    ['recuento no determinado', [OBRA], { offset: 10, pageSize: 10, returned: 1, total: null }],
  ])('%s: sin IA, modo DIRECTO y sin coste estimado', (_caso, entidades, pagina) => {
    const decision = buildDecisionContext(
      peticion(),
      CONTEXTO_PROFESIONAL,
      conocimiento({ knowledgeEntities: entidades, worksPage: pagina }),
      OPERACION
    )

    expect(decision.needsAI).toBe(false)
    expect(decision.executionStrategy.executionMode).toBe('DIRECTO')
    expect(decision.estimatedCost).toBeNull() // sin IA no hay coste que estimar (estimateCost)
  })

  it('tampoco pide IA aunque el conocimiento no sea completo ni la petición sea listado puro', () => {
    const decision = buildDecisionContext(
      peticion({ requestsPlainListing: false }),
      CONTEXTO_PROFESIONAL,
      conocimiento({ knowledgeCompleteness: 'parcial', worksPage: { offset: 10, pageSize: 10, returned: 0, total: 11 } }),
      OPERACION
    )

    expect(decision.needsAI).toBe(false)
    expect(decision.estimatedCost).toBeNull() // sin IA no hay coste que estimar (estimateCost)
  })

  it('con desplazamiento 0 la decisión es la misma que sin página', () => {
    const casos = [
      { pet: peticion(), con: conocimiento({ knowledgeEntities: [OBRA] }) },
      { pet: peticion({ requestsPlainListing: false }), con: conocimiento({ knowledgeEntities: [OBRA] }) },
      { pet: peticion(), con: conocimiento({ knowledgeCompleteness: 'parcial' }) },
    ]

    for (const { pet, con } of casos) {
      const sinPagina = buildDecisionContext(pet, CONTEXTO_PROFESIONAL, con, OPERACION)
      const primeraPagina = buildDecisionContext(pet, CONTEXTO_PROFESIONAL, { ...con, worksPage: { offset: 0, pageSize: 10, returned: 1, total: 1 } }, OPERACION)
      expect(primeraPagina.needsAI).toBe(sinPagina.needsAI)
      expect(primeraPagina.estimatedCost).toBe(sinPagina.estimatedCost)
    }
    // Y al menos uno de esos casos sí pide IA con coste: la comparación no es trivial.
    expect(buildDecisionContext(casos[1].pet, CONTEXTO_PROFESIONAL, casos[1].con, OPERACION).estimatedCost).toBeGreaterThan(0)
  })
})
