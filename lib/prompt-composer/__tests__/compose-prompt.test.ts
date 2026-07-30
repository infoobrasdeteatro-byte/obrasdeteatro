import { describe, it, expect } from 'vitest'
import { composePrompt } from '../compose-prompt'
import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'

function fakeNormalizedRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    requestId: 'req-1',
    originalRequest: '¿Qué obras me recomiendas de Lorca?',
    normalizedIntent: 'que obras me recomiendas de lorca?',
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

function fakeKnowledgeContext(overrides: Partial<KnowledgeContext> = {}): KnowledgeContext {
  return {
    knowledgeSummary: {
      domainsRequested: ['Obras'],
      domainsCovered: ['Obras'],
      domainsNotCovered: [],
      entryLabelsByDomain: {},
    },
    knowledgeDomains: ['Obras'],
    knowledgeEntities: [],
    knowledgeRelations: null,
    knowledgeConfidence: 1,
    knowledgeCompleteness: 'completo',
    knowledgeLimitations: [],
    knowledgeTimestamp: new Date().toISOString(),
    ...overrides,
  }
}

describe('composePrompt', () => {
  it('incluye las etiquetas reales de un dominio cubierto con entidades', () => {
    const knowledgeContext = fakeKnowledgeContext({
      knowledgeSummary: {
        domainsRequested: ['Obras'],
        domainsCovered: ['Obras'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: ['La vida es sueño', 'Fuente Ovejuna'] },
      },
    })

    const result = composePrompt(fakeNormalizedRequest(), knowledgeContext)

    expect(result).toContain('Obras: La vida es sueño, Fuente Ovejuna')
    expect(result).toContain('¿Qué obras me recomiendas de Lorca?')
  })

  it('incluye las etiquetas reales de Organizaciones', () => {
    const knowledgeContext = fakeKnowledgeContext({
      knowledgeSummary: {
        domainsRequested: ['Organizaciones'],
        domainsCovered: ['Organizaciones'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Organizaciones: ['Teatro Español', 'Compañía Nacional'] },
      },
    })

    const result = composePrompt(
      fakeNormalizedRequest({ originalRequest: '¿Qué compañías de teatro hay?' }),
      knowledgeContext
    )

    expect(result).toContain('Organizaciones: Teatro Español, Compañía Nacional')
  })

  it('degrada de forma elegante cuando no hay ninguna etiqueta disponible -- nunca inventa contenido', () => {
    const knowledgeContext = fakeKnowledgeContext({
      knowledgeSummary: {
        domainsRequested: ['Oportunidades'],
        domainsCovered: [],
        domainsNotCovered: ['Oportunidades'],
        entryLabelsByDomain: {},
      },
      knowledgeCompleteness: 'vacio',
    })

    const result = composePrompt(
      fakeNormalizedRequest({ originalRequest: '¿Qué convocatorias hay disponibles?' }),
      knowledgeContext
    )

    expect(result).not.toContain('Conocimiento real disponible')
    expect(result).toContain('¿Qué convocatorias hay disponibles?')
  })

  it('omite un dominio cubierto cuya lista de etiquetas está vacía', () => {
    const knowledgeContext = fakeKnowledgeContext({
      knowledgeSummary: {
        domainsRequested: ['Obras'],
        domainsCovered: ['Obras'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: [] },
      },
    })

    const result = composePrompt(fakeNormalizedRequest(), knowledgeContext)

    expect(result).not.toContain('Conocimiento real disponible')
  })

  it('es determinista: misma entrada produce siempre la misma salida', () => {
    const normalizedRequest = fakeNormalizedRequest()
    const knowledgeContext = fakeKnowledgeContext({
      knowledgeSummary: {
        domainsRequested: ['Obras'],
        domainsCovered: ['Obras'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: ['La dama boba'] },
      },
    })

    const first = composePrompt(normalizedRequest, knowledgeContext)
    const second = composePrompt(normalizedRequest, knowledgeContext)

    expect(first).toBe(second)
  })

  it('instruye explicitamente a no presentar un listado sin filtrar como si respondiera a un criterio especifico (revision funcional post-cierre SCENAIA-002, Caso 1)', () => {
    const result = composePrompt(fakeNormalizedRequest(), fakeKnowledgeContext())

    expect(result).toContain('indicalo explicitamente en tu respuesta')
    expect(result).toContain('nunca presentes la lista general como si respondiera a ese criterio')
  })

  it('usa el texto original de la peticion (con mayusculas y tildes), no la version normalizada', () => {
    const result = composePrompt(
      fakeNormalizedRequest({ originalRequest: '¿Qué OBRAS hay?', normalizedIntent: 'que obras hay?' }),
      fakeKnowledgeContext()
    )

    expect(result).toContain('¿Qué OBRAS hay?')
    expect(result).not.toContain('que obras hay?')
  })
})
