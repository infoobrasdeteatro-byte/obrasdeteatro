import { describe, it, expect } from 'vitest'
import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { unfilteredCriteriaNote, partiallyAppliedCriteriaNote } from '@/lib/scenaia-knowledge-model'
import { isPlainListing } from '../plain-listing'
import { needsAI } from '../needs-ai'

function peticion(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    requestId: 'req-1',
    originalRequest: 'dame una lista de todas las obras',
    normalizedIntent: 'dame una lista de todas las obras',
    retrievalQuery: 'dame una lista de todas las obras',
    requestsFullCatalog: true,
    requestsPlainListing: true,
    requestType: 'RECONOCIDA',
    requestedKnowledgeDomains: ['Obras'],
    estimatedComplexity: 'media',
    professionalContextLevel: 'STANDARD',
    detectedAmbiguities: [],
    interpretationConfidence: 1,
    timestamp: 'T',
    ...overrides,
  }
}

function obra(title: string) {
  return { domain: 'Obras' as const, data: { title }, provenance: {}, functions: [] }
}

function conocimiento(overrides: Partial<KnowledgeContext> = {}): KnowledgeContext {
  return {
    knowledgeSummary: {
      domainsRequested: ['Obras'],
      domainsCovered: ['Obras'],
      domainsNotCovered: [],
      entryLabelsByDomain: { Obras: ['La dama boba'] },
    },
    knowledgeDomains: ['Obras'],
    knowledgeEntities: [obra('La dama boba')],
    knowledgeRelations: null,
    knowledgeConfidence: 1,
    knowledgeCompleteness: 'completo',
    knowledgeLimitations: [],
    workOccupancy: {},
    knowledgeTimestamp: 'T',
    ...overrides,
  } as KnowledgeContext
}

describe('isPlainListing — las cinco condiciones del §4.1', () => {
  it('con las cinco cumplidas, es un listado puro', () => {
    expect(isPlainListing(peticion(), conocimiento())).toBe(true)
  })

  it('(a)(b) el texto no pedía una lista, o pedía razonar: no lo es', () => {
    expect(isPlainListing(peticion({ requestsPlainListing: false }), conocimiento())).toBe(false)
  })

  it('(c) un criterio pedido que no se pudo aplicar lo desactiva', () => {
    const sinAplicar = conocimiento({ knowledgeLimitations: [unfilteredCriteriaNote('Obras')] })
    const enParte = conocimiento({ knowledgeLimitations: [partiallyAppliedCriteriaNote('Obras')] })

    expect(isPlainListing(peticion(), sinAplicar)).toBe(false)
    expect(isPlainListing(peticion(), enParte)).toBe(false)
  })

  it('(c) otras limitaciones NO lo desactivan: solo las dos notas de criterio', () => {
    const conNotaGenerica = conocimiento({
      knowledgeLimitations: ['los dominios cubiertos se enumeran sin relevancia ni relacion con el texto de la peticion -- sin motor de busqueda (IA-003)'],
    })

    expect(isPlainListing(peticion(), conNotaGenerica)).toBe(true)
  })

  it('(d) dos dominios a la vez no son un listado: son dos', () => {
    const dosDominios = conocimiento({
      knowledgeDomains: ['Obras', 'Organizaciones'],
      knowledgeEntities: [obra('La dama boba'), { domain: 'Organizaciones', data: { name: 'Teatro Español' }, provenance: {}, functions: [] }],
    } as unknown as Partial<KnowledgeContext>)

    expect(isPlainListing(peticion({ requestedKnowledgeDomains: ['Obras', 'Organizaciones'] }), dosDominios)).toBe(false)
  })

  it('(d) un dominio que no es Obras queda fuera de esta autorización', () => {
    const organizaciones = conocimiento({
      knowledgeDomains: ['Organizaciones'],
      knowledgeEntities: [{ domain: 'Organizaciones', data: { name: 'Teatro Español' }, provenance: {}, functions: [] }],
    } as unknown as Partial<KnowledgeContext>)

    expect(isPlainListing(peticion({ requestedKnowledgeDomains: ['Organizaciones'] }), organizaciones)).toBe(false)
  })

  it('(e) sin ninguna obra recuperada no hay lista que dar', () => {
    expect(isPlainListing(peticion(), conocimiento({ knowledgeEntities: [] }))).toBe(false)
  })

  it('es puro: no muta ni la petición ni el conocimiento', () => {
    const request = peticion()
    const context = conocimiento()
    const copiaRequest = JSON.stringify(request)
    const copiaContext = JSON.stringify(context)

    isPlainListing(request, context)

    expect(JSON.stringify(request)).toBe(copiaRequest)
    expect(JSON.stringify(context)).toBe(copiaContext)
  })
})

describe('needsAI — la excepción autorizada', () => {
  it('un listado puro NO solicita IA', () => {
    expect(needsAI('completo', 11, true)).toBe(false)
  })

  it('fuera del listado puro, la regla anterior sigue intacta', () => {
    expect(needsAI('completo', 11, false)).toBe(true)
    expect(needsAI('completo', 0, false)).toBe(false)
    expect(needsAI('parcial', 11, false)).toBe(true)
    expect(needsAI('vacio', 0, false)).toBe(true)
  })

  it('conocimiento incompleto manda sobre la excepción: sigue yendo a la IA', () => {
    expect(needsAI('parcial', 11, true)).toBe(true)
    expect(needsAI('vacio', 11, true)).toBe(true)
  })

  it('sin declarar la excepción, el comportamiento es el de siempre', () => {
    expect(needsAI('completo', 11)).toBe(true)
    expect(needsAI('completo', 0)).toBe(false)
  })
})
