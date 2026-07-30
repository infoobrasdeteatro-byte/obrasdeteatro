import { describe, it, expect } from 'vitest'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { unfilteredCriteriaNote } from '@/lib/scenaia-knowledge-model'
import { buildDirectContent } from '../build-direct-content'

function fakeKnowledgeContext(overrides: Partial<KnowledgeContext> = {}): KnowledgeContext {
  return {
    knowledgeSummary: { domainsRequested: [], domainsCovered: [], domainsNotCovered: [], entryLabelsByDomain: {} },
    knowledgeDomains: [],
    knowledgeEntities: [],
    knowledgeRelations: null,
    knowledgeConfidence: 1,
    knowledgeCompleteness: 'completo',
    knowledgeLimitations: [],
    knowledgeTimestamp: new Date().toISOString(),
    ...overrides,
  }
}

describe('buildDirectContent', () => {
  it('devuelve null cuando no hay ningun dominio cubierto', () => {
    const result = buildDirectContent(fakeKnowledgeContext())

    expect(result).toBeNull()
  })

  it('devuelve null cuando hay dominios cubiertos pero sin etiquetas (entryLabelsByDomain vacio)', () => {
    const result = buildDirectContent(
      fakeKnowledgeContext({
        knowledgeDomains: ['Obras'],
        knowledgeSummary: { domainsRequested: ['Obras'], domainsCovered: ['Obras'], domainsNotCovered: [], entryLabelsByDomain: {} },
      })
    )

    expect(result).toBeNull()
  })

  it('formatea de forma determinista las etiquetas ya existentes de un unico dominio', () => {
    const result = buildDirectContent(
      fakeKnowledgeContext({
        knowledgeDomains: ['Obras'],
        knowledgeSummary: {
          domainsRequested: ['Obras'],
          domainsCovered: ['Obras'],
          domainsNotCovered: [],
          entryLabelsByDomain: { Obras: ['Obra A', 'Obra B'] },
        },
      })
    )

    expect(result).toBe('Resultados encontrados: Obra A, Obra B.')
  })

  it('formatea multiples dominios cubiertos, en el orden de knowledgeDomains', () => {
    const result = buildDirectContent(
      fakeKnowledgeContext({
        knowledgeDomains: ['Obras', 'Organizaciones'],
        knowledgeSummary: {
          domainsRequested: ['Obras', 'Organizaciones'],
          domainsCovered: ['Obras', 'Organizaciones'],
          domainsNotCovered: [],
          entryLabelsByDomain: { Obras: ['Obra A'], Organizaciones: ['Compania X'] },
        },
      })
    )

    expect(result).toBe('Resultados encontrados: Obra A; Compania X.')
  })

  it('nunca lanza excepcion, incluso ante un KnowledgeContext vacio en todos sus campos', () => {
    expect(() => buildDirectContent(fakeKnowledgeContext())).not.toThrow()
  })

  it('SCENAIA-002, correccion definitiva de Caso 1: marca explicitamente un dominio como catalogo sin filtrar cuando knowledgeLimitations contiene su nota exacta', () => {
    const result = buildDirectContent(
      fakeKnowledgeContext({
        knowledgeDomains: ['Obras'],
        knowledgeSummary: {
          domainsRequested: ['Obras'],
          domainsCovered: ['Obras'],
          domainsNotCovered: [],
          entryLabelsByDomain: { Obras: ['Obra A', 'Obra B'] },
        },
        knowledgeLimitations: [unfilteredCriteriaNote('Obras')],
      })
    )

    expect(result).toBe(
      'Resultados encontrados: Obra A, Obra B (no se ha podido aplicar el criterio solicitado; catalogo general sin filtrar).'
    )
  })

  it('con multiples dominios, la aclaracion de "sin filtrar" solo se aplica al dominio afectado', () => {
    const result = buildDirectContent(
      fakeKnowledgeContext({
        knowledgeDomains: ['Obras', 'Organizaciones'],
        knowledgeSummary: {
          domainsRequested: ['Obras', 'Organizaciones'],
          domainsCovered: ['Obras', 'Organizaciones'],
          domainsNotCovered: [],
          entryLabelsByDomain: { Obras: ['Obra A'], Organizaciones: ['Compania X'] },
        },
        knowledgeLimitations: [unfilteredCriteriaNote('Obras')],
      })
    )

    expect(result).toBe(
      'Resultados encontrados: Obra A (no se ha podido aplicar el criterio solicitado; catalogo general sin filtrar); Compania X.'
    )
  })
})
