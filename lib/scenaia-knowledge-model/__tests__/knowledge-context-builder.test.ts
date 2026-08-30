import { describe, it, expect, vi, beforeEach } from 'vitest'
import { retrieveRelevantKnowledge } from '@/lib/knowledge-assets'
import type { NormalizedRequest } from '@/lib/request-interpreter'
import { buildKnowledgeContext } from '../knowledge-context-builder'
import { partiallyAppliedCriteriaNote, unfilteredCriteriaNote } from '../unfiltered-note'

vi.mock('@/lib/knowledge-assets', () => ({
  retrieveRelevantKnowledge: vi.fn(),
}))

function mockRetrieval(
  byDomain: Record<string, { items: unknown[]; requestWasNarrowed?: boolean; unappliedCriteria?: string[]; workOccupancy?: Record<string, string> }>
) {
  vi.mocked(retrieveRelevantKnowledge).mockImplementation(async (domain: string) => {
    const configurado = byDomain[domain]
    if (!configurado) return { items: [], requestWasNarrowed: false, unappliedCriteria: [] , workOccupancy: {}} as never

    // Por defecto se reproduce la semantica de Obras: si no se aplico ningun
    // criterio, queda uno pendiente; si se aplico, no queda nada pendiente.
    const narrowed = configurado.requestWasNarrowed ?? true
    const unapplied = configurado.unappliedCriteria ?? (narrowed ? [] : ['criterio'])

    return { requestWasNarrowed: narrowed, unappliedCriteria: unapplied, workOccupancy: {}, ...configurado } as never
  })
}

beforeEach(() => {
  vi.mocked(retrieveRelevantKnowledge).mockReset()
})

function fakeRequest(domains: NormalizedRequest['requestedKnowledgeDomains']): NormalizedRequest {
  return {
    requestId: 'req-1',
    originalRequest: 'texto de prueba',
    normalizedIntent: 'texto de prueba',
    retrievalQuery: 'texto de prueba',
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
    expect(retrieveRelevantKnowledge).toHaveBeenCalledWith('Obras', 'texto de prueba', undefined, {})
    expect(retrieveRelevantKnowledge).toHaveBeenCalledWith('Organizaciones', 'texto de prueba', undefined, {})
  })

  it('parcial: solo parte de los dominios solicitados están cubiertos', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM] } })

    const result = await buildKnowledgeContext(fakeRequest(['Obras', 'Oportunidades']))

    expect(result.knowledgeCompleteness).toBe('parcial')
    expect(result.knowledgeConfidence).toBe(0.5)
    expect(result.knowledgeDomains).toEqual(['Obras'])
    expect(result.knowledgeLimitations).toContain(
      'dominio Oportunidades solicitado pero no cubierto por Knowledge Assets en esta version'
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
    const result = await buildKnowledgeContext(fakeRequest(['Oportunidades', 'Editorial']))

    expect(result.knowledgeCompleteness).toBe('vacio')
    expect(result.knowledgeConfidence).toBe(0)
    expect(result.knowledgeLimitations).toEqual([
      'dominio Oportunidades solicitado pero no cubierto por Knowledge Assets en esta version',
      'dominio Editorial solicitado pero no cubierto por Knowledge Assets en esta version',
    ])
  })

  it('deduplica dominios repetidos sin invocar Knowledge Assets dos veces', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM] } })

    const result = await buildKnowledgeContext(fakeRequest(['Obras', 'Obras']))

    expect(result.knowledgeDomains).toEqual(['Obras'])
    expect(retrieveRelevantKnowledge).toHaveBeenCalledTimes(1)
  })

  it('transporta retrievalQuery como query hasta Knowledge Assets (IA-003)', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM] } })

    await buildKnowledgeContext({ ...fakeRequest(['Obras']), retrievalQuery: 'texto distinto' })

    expect(retrieveRelevantKnowledge).toHaveBeenCalledWith('Obras', 'texto distinto', undefined, {})
  })

  it('la recuperacion usa retrievalQuery, nunca normalizedIntent: en un turno de continuacion ambos difieren', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM] } })

    await buildKnowledgeContext({
      ...fakeRequest(['Obras']),
      normalizedIntent: 'y alguna mas corta?',
      retrievalQuery: 'que obras de comedia tienes?. y alguna mas corta?',
    })

    expect(retrieveRelevantKnowledge).toHaveBeenCalledWith('Obras', 'que obras de comedia tienes?. y alguna mas corta?', undefined, {})
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

describe('buildKnowledgeContext — los cuatro estados del criterio', () => {
  it('1) CRITERIO COMPLETO: se aplico todo lo pedido -- ninguna nota', async () => {
    mockRetrieval({ Organizaciones: { items: [ORG_ITEM], requestWasNarrowed: true, unappliedCriteria: [] , workOccupancy: {}} })

    const result = await buildKnowledgeContext(fakeRequest(['Organizaciones']))

    expect(result.knowledgeLimitations).not.toContain(unfilteredCriteriaNote('Organizaciones'))
    expect(result.knowledgeLimitations).not.toContain(partiallyAppliedCriteriaNote('Organizaciones'))
  })

  it('2) CRITERIO PARCIAL: se aplico parte -- nota de parcialidad, nunca la de "sin criterio"', async () => {
    mockRetrieval({
      Organizaciones: { items: [ORG_ITEM], requestWasNarrowed: true, unappliedCriteria: ['ubicacion'], workOccupancy: {} },
    })

    const result = await buildKnowledgeContext(fakeRequest(['Organizaciones']))

    expect(result.knowledgeLimitations).toContain(partiallyAppliedCriteriaNote('Organizaciones'))
    expect(result.knowledgeLimitations).not.toContain(unfilteredCriteriaNote('Organizaciones'))
  })

  it('3) CRITERIO NO APLICABLE: se pidio y no se aplico ninguno -- nota de "sin criterio"', async () => {
    mockRetrieval({
      Organizaciones: { items: [ORG_ITEM], requestWasNarrowed: false, unappliedCriteria: ['ubicacion'], workOccupancy: {} },
    })

    const result = await buildKnowledgeContext(fakeRequest(['Organizaciones']))

    expect(result.knowledgeLimitations).toContain(unfilteredCriteriaNote('Organizaciones'))
    expect(result.knowledgeLimitations).not.toContain(partiallyAppliedCriteriaNote('Organizaciones'))
  })

  it('4) SIN CRITERIO: el usuario no pidio nada que filtrar -- ninguna advertencia falsa', async () => {
    mockRetrieval({
      Organizaciones: { items: [ORG_ITEM], requestWasNarrowed: false, unappliedCriteria: [] , workOccupancy: {}},
    })

    const result = await buildKnowledgeContext(fakeRequest(['Organizaciones']))

    expect(result.knowledgeLimitations).not.toContain(unfilteredCriteriaNote('Organizaciones'))
    expect(result.knowledgeLimitations).not.toContain(partiallyAppliedCriteriaNote('Organizaciones'))
  })

  it('6) NO REGRESION de Obras: sigue declarando "sin criterio" cuando no se aplico ninguno', async () => {
    mockRetrieval({ Obras: { items: [WORK_ITEM], requestWasNarrowed: false } })

    const result = await buildKnowledgeContext(fakeRequest(['Obras']))

    expect(result.knowledgeLimitations).toContain(unfilteredCriteriaNote('Obras'))
  })

  it('8) MULTIDOMINIO: cada dominio declara su propio estado, sin contagiarse', async () => {
    mockRetrieval({
      Obras: { items: [WORK_ITEM], requestWasNarrowed: true, unappliedCriteria: [] , workOccupancy: {}},
      Organizaciones: { items: [ORG_ITEM], requestWasNarrowed: true, unappliedCriteria: ['ubicacion'], workOccupancy: {} },
    })

    const result = await buildKnowledgeContext(fakeRequest(['Obras', 'Organizaciones']))

    expect(result.knowledgeLimitations).toContain(partiallyAppliedCriteriaNote('Organizaciones'))
    expect(result.knowledgeLimitations).not.toContain(partiallyAppliedCriteriaNote('Obras'))
    expect(result.knowledgeLimitations).not.toContain(unfilteredCriteriaNote('Obras'))
  })
})
