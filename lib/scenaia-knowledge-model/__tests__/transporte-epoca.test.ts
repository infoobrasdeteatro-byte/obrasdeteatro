import { describe, it, expect, vi, beforeEach } from 'vitest'
import { retrieveRelevantKnowledge } from '@/lib/knowledge-assets'
import type { NormalizedRequest } from '@/lib/request-interpreter'
import { buildKnowledgeContext } from '../knowledge-context-builder'
import { retrieveKnowledgeForDomain } from '../retrieve-knowledge'

vi.mock('@/lib/knowledge-assets', () => ({
  retrieveRelevantKnowledge: vi.fn(),
}))

/**
 * SCENAIA-007 (adenda al §4.2): Scenaia Knowledge Model solo TRANSPORTA la
 * opción de época hasta Knowledge Assets. Sin ella, las llamadas son
 * exactamente las de siempre (lo fijan knowledge-context-builder.test.ts y
 * retrieve-knowledge.test.ts, sin modificar).
 */
const ON = { epocaHabilitada: true } as const
const PAGINA = { offset: 20, pageSize: 10 }

function peticion(domains: NormalizedRequest['requestedKnowledgeDomains']): NormalizedRequest {
  return {
    requestId: 'req-epoca',
    originalRequest: 'obras barrocas',
    normalizedIntent: 'obras barrocas',
    retrievalQuery: 'obras barrocas',
    requestsFullCatalog: false,
    requestsPlainListing: false,
    requestType: 'RECONOCIDA',
    requestedKnowledgeDomains: domains,
    estimatedComplexity: 'baja',
    professionalContextLevel: 'STANDARD',
    detectedAmbiguities: [],
    interpretationConfidence: 1,
    timestamp: new Date().toISOString(),
  }
}

beforeEach(() => {
  vi.mocked(retrieveRelevantKnowledge)
    .mockReset()
    .mockResolvedValue({ items: [], requestWasNarrowed: true, unappliedCriteria: [], workOccupancy: {} })
})

describe('retrieveKnowledgeForDomain — transporte de la opción de época', () => {
  it('con la opción: la reenvía tal cual como último argumento, con o sin página', async () => {
    await retrieveKnowledgeForDomain('Obras', 'obras barrocas', { genero: 'COMEDIA' }, undefined, ON)
    await retrieveKnowledgeForDomain('Obras', 'obras barrocas', {}, PAGINA, ON)

    expect(vi.mocked(retrieveRelevantKnowledge).mock.calls).toEqual([
      ['Obras', 'obras barrocas', undefined, { genero: 'COMEDIA' }, undefined, ON],
      ['Obras', 'obras barrocas', undefined, {}, PAGINA, ON],
    ])
  })

  it('sin la opción: la llamada es la de siempre, sin ningún argumento de más', async () => {
    await retrieveKnowledgeForDomain('Obras', 'obras barrocas', {})
    await retrieveKnowledgeForDomain('Obras', 'obras barrocas', {}, PAGINA)

    expect(vi.mocked(retrieveRelevantKnowledge).mock.calls).toEqual([
      ['Obras', 'obras barrocas', undefined, {}],
      ['Obras', 'obras barrocas', undefined, {}, PAGINA],
    ])
  })
})

describe('buildKnowledgeContext — transporte de la opción de época', () => {
  it('con la opción: solo Obras la recibe; los demás dominios, la llamada de siempre', async () => {
    await buildKnowledgeContext(peticion(['Obras', 'Organizaciones']), { epoca: 'BARROCO' }, undefined, ON)

    const llamadas = vi.mocked(retrieveRelevantKnowledge).mock.calls
    expect(llamadas).toContainEqual(['Obras', 'obras barrocas', undefined, { epoca: 'BARROCO' }, undefined, ON])
    expect(llamadas).toContainEqual(['Organizaciones', 'obras barrocas', undefined, { epoca: 'BARROCO' }])
  })

  it('con la opción y página: Obras recibe las dos', async () => {
    await buildKnowledgeContext(peticion(['Obras']), {}, PAGINA, ON)

    expect(vi.mocked(retrieveRelevantKnowledge).mock.calls).toEqual([['Obras', 'obras barrocas', undefined, {}, PAGINA, ON]])
  })

  it('sin la opción: las llamadas son las de siempre', async () => {
    await buildKnowledgeContext(peticion(['Obras']), {})
    await buildKnowledgeContext(peticion(['Obras']), {}, PAGINA)

    expect(vi.mocked(retrieveRelevantKnowledge).mock.calls).toEqual([
      ['Obras', 'obras barrocas', undefined, {}],
      ['Obras', 'obras barrocas', undefined, {}, PAGINA],
    ])
  })
})
