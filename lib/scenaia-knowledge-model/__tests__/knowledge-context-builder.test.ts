import { describe, it, expect, vi, beforeEach } from 'vitest'
import { retrieveRelevantKnowledge } from '@/lib/knowledge-assets'
import type { NormalizedRequest } from '@/lib/request-interpreter'
import { buildKnowledgeContext } from '../knowledge-context-builder'
import { unfilteredCriteriaNote } from '../unfiltered-note'

vi.mock('@/lib/knowledge-assets', () => ({
  retrieveRelevantKnowledge: vi.fn(),
}))

function mockRetrieval(byDomain: Record<string, { items: unknown[]; requestWasNarrowed?: boolean }>) {
  vi.mocked(retrieveRelevantKnowledge).mockImplementation(
    async (domain: string) => (byDomain[domain] ? { requestWasNarrowed: true, ...byDomain[domain] } : { items: [], requestWasNarrowed: false }) as never
  )
}

beforeEach(() => {
  vi.mocked(retrieveRelevantKnowledge).mockReset()
})

function fakeRequest(domains: NormalizedRequest['requestedKnowledgeDomains']): NormalizedRequest {
  return {
    requestId: 'req-1',
    originalRequest: 'texto de prueba',
    normalizedIntent: 'texto de prueba',
    requestType: domains.length > 0 ? 'RECONOCIDA' : 'NO_RECONOCIDA',
    requestedKnowledgeDomains: domains,
    estimatedComplexity: 'baja',
    professionalContextLevel: 'STANDARD',
    detectedAmbiguities: [],
    interpretationConfidence: 1,
    timestamp: new Date().toISOString(),
  }
}

const WORK_ITEM = { domain: 'Obras' as const, data: { title: 'La Casa de Bernarda Alba' } as never }
const ORG_ITEM = { domain: 'Organizaciones' as const, data: { name: 'Teatro Español' } as never }

describe('buildKnowledgeContext', () => {
  it('completo: todos los dominios solicitados están cubiertos', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM] }, Organizaciones: { items: [ORG_ITEM] } })

    const result = await buildKnowledgeContext(fakeRequest(['Obras', 'Organizaciones']))

    expect(result.knowledgeCompleteness).toBe('completo')
    expect(result.knowledgeConfidence).toBe(1)
    expect(result.knowledgeDomains).toEqual(['Obras', 'Organizaciones'])
    expect(result.knowledgeEntities).toEqual([WORK_ITEM, ORG_ITEM])
    expect(result.knowledgeRelations).toBeNull()
    expect(result.knowledgeLimitations).toEqual([
      'los dominios cubiertos se enumeran sin relevancia ni relacion con el texto de la peticion -- sin motor de busqueda (IA-003)',
    ])
    expect(typeof result.knowledgeTimestamp).toBe('string')
    expect(retrieveRelevantKnowledge).toHaveBeenCalledWith('Obras', 'texto de prueba')
    expect(retrieveRelevantKnowledge).toHaveBeenCalledWith('Organizaciones', 'texto de prueba')
  })

  it('parcial: solo parte de los dominios solicitados están cubiertos', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM] } })

    const result = await buildKnowledgeContext(fakeRequest(['Obras', 'Personas']))

    expect(result.knowledgeCompleteness).toBe('parcial')
    expect(result.knowledgeConfidence).toBe(0.5)
    expect(result.knowledgeDomains).toEqual(['Obras'])
    expect(result.knowledgeLimitations).toContain(
      'dominio Personas solicitado pero no cubierto por Knowledge Assets en esta version'
    )
    expect(retrieveRelevantKnowledge).not.toHaveBeenCalledWith('Organizaciones', expect.anything())
  })

  it('vacío: ningún dominio solicitado (petición no reconocida)', async () => {
    const result = await buildKnowledgeContext(fakeRequest([]))

    expect(result.knowledgeCompleteness).toBe('vacio')
    expect(result.knowledgeConfidence).toBe(0)
    expect(result.knowledgeEntities).toEqual([])
    expect(result.knowledgeLimitations).toEqual([])
    expect(retrieveRelevantKnowledge).not.toHaveBeenCalled()
  })

  it('vacío: todos los dominios solicitados están fuera de cobertura', async () => {
    const result = await buildKnowledgeContext(fakeRequest(['Personas', 'Editorial']))

    expect(result.knowledgeCompleteness).toBe('vacio')
    expect(result.knowledgeConfidence).toBe(0)
    expect(result.knowledgeLimitations).toEqual([
      'dominio Personas solicitado pero no cubierto por Knowledge Assets en esta version',
      'dominio Editorial solicitado pero no cubierto por Knowledge Assets en esta version',
    ])
  })

  it('deduplica dominios repetidos sin invocar Knowledge Assets dos veces', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM] } })

    const result = await buildKnowledgeContext(fakeRequest(['Obras', 'Obras']))

    expect(result.knowledgeDomains).toEqual(['Obras'])
    expect(retrieveRelevantKnowledge).toHaveBeenCalledTimes(1)
  })

  it('transporta normalizedIntent como query hasta Knowledge Assets (IA-003)', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM] } })

    await buildKnowledgeContext({ ...fakeRequest(['Obras']), normalizedIntent: 'texto distinto' })

    expect(retrieveRelevantKnowledge).toHaveBeenCalledWith('Obras', 'texto distinto')
  })

  it('SCENAIA-002, correccion definitiva de Caso 1: cuando Obras devuelve requestWasNarrowed=false, anade la nota exacta a knowledgeLimitations', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM], requestWasNarrowed: false } })

    const result = await buildKnowledgeContext(fakeRequest(['Obras']))

    expect(result.knowledgeLimitations).toContain(unfilteredCriteriaNote('Obras'))
  })

  it('cuando Obras devuelve requestWasNarrowed=true, no anade ninguna nota de "sin criterio reconocido"', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM], requestWasNarrowed: true } })

    const result = await buildKnowledgeContext(fakeRequest(['Obras']))

    expect(result.knowledgeLimitations).not.toContain(unfilteredCriteriaNote('Obras'))
  })
})
