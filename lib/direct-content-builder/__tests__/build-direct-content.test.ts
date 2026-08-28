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
  it('devuelve null cuando no hay ningun dominio cubierto (guarda defensiva, A3 de SCENAIA-003)', () => {
    const result = buildDirectContent(fakeKnowledgeContext())

    expect(result).toBeNull()
  })

  it('SCENAIA-003 Caso 2: dominio cubierto sin etiquetas declara la ausencia, ya no devuelve null', () => {
    const result = buildDirectContent(
      fakeKnowledgeContext({
        knowledgeDomains: ['Obras'],
        knowledgeSummary: { domainsRequested: ['Obras'], domainsCovered: ['Obras'], domainsNotCovered: [], entryLabelsByDomain: {} },
      })
    )

    expect(result).toBe('En obras no he encontrado ningún resultado.')
  })

  it('SCENAIA-003 Caso 1: enumera en lenguaje natural las etiquetas ya existentes de un unico dominio', () => {
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

    expect(result).toBe('En obras he encontrado 2 resultados: Obra A y Obra B.')
  })

  it('SCENAIA-003 Caso 1: concuerda el recuento en singular cuando solo hay una etiqueta', () => {
    const result = buildDirectContent(
      fakeKnowledgeContext({
        knowledgeDomains: ['Obras'],
        knowledgeSummary: {
          domainsRequested: ['Obras'],
          domainsCovered: ['Obras'],
          domainsNotCovered: [],
          entryLabelsByDomain: { Obras: ['Obra A'] },
        },
      })
    )

    expect(result).toBe('En obras he encontrado un resultado: Obra A.')
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

    expect(result).toBe(
      'En obras he encontrado un resultado: Obra A. En organizaciones he encontrado un resultado: Compania X.'
    )
  })

  it('SCENAIA-003 Caso 2 por dominio: con un dominio con resultados y otro sin ellos, informa de ambas situaciones', () => {
    const result = buildDirectContent(
      fakeKnowledgeContext({
        knowledgeDomains: ['Obras', 'Organizaciones'],
        knowledgeSummary: {
          domainsRequested: ['Obras', 'Organizaciones'],
          domainsCovered: ['Obras', 'Organizaciones'],
          domainsNotCovered: [],
          entryLabelsByDomain: { Obras: ['Obra A'], Organizaciones: [] },
        },
      })
    )

    expect(result).not.toBeNull()
    expect(result).toBe(
      'En obras he encontrado un resultado: Obra A. En organizaciones no he encontrado ningún resultado.'
    )
  })

  it('nunca lanza excepcion, incluso ante un KnowledgeContext vacio en todos sus campos', () => {
    expect(() => buildDirectContent(fakeKnowledgeContext())).not.toThrow()
  })

  it('SCENAIA-002 Caso 1 / SCENAIA-003 Caso 3: advierte antes de los resultados cuando no se reconocio el criterio', () => {
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
      'En obras no he podido aplicar el criterio que pedías; aun así, he encontrado 2 resultados: Obra A y Obra B.'
    )
  })

  it('con multiples dominios, la advertencia de criterio no aplicado solo afecta al dominio correspondiente', () => {
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
      'En obras no he podido aplicar el criterio que pedías; aun así, he encontrado un resultado: Obra A. ' +
        'En organizaciones he encontrado un resultado: Compania X.'
    )
  })

  it('SCENAIA-003 Casos 2 y 3 combinados: sin criterio reconocido y sin ningun resultado', () => {
    const result = buildDirectContent(
      fakeKnowledgeContext({
        knowledgeDomains: ['Obras'],
        knowledgeSummary: { domainsRequested: ['Obras'], domainsCovered: ['Obras'], domainsNotCovered: [], entryLabelsByDomain: {} },
        knowledgeLimitations: [unfilteredCriteriaNote('Obras')],
      })
    )

    expect(result).toBe('En obras no he podido aplicar el criterio que pedías, y tampoco he encontrado ningún resultado.')
  })
})
