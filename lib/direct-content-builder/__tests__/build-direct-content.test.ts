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
    workOccupancy: {},
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

/**
 * SCENAIA-004 §4.3 — la ficha.
 *
 * Amplía el Caso 1 de SCENAIA-003, que se limitaba a los títulos. Los
 * datos salen de `knowledgeEntities`, que ya viajaba en el contexto: no se
 * recupera nada nuevo y no se escribe nada que el catálogo no traiga.
 */
describe('buildDirectContent — fichas de obra (SCENAIA-004)', () => {
  function obra(data: Record<string, unknown>) {
    return { domain: 'Obras', data, provenance: {}, functions: [] } as never
  }

  const LA_VIDA_ES_SUENO = {
    title: 'La vida es sueño',
    author: 'Pedro Calderón de la Barca',
    genre: 'drama',
    year: 1635,
    durationMinutes: 120,
    castSizeMax: 6,
    minAge: 12,
    language: 'es',
  }

  function contextoConObras(datos: readonly Record<string, unknown>[]): KnowledgeContext {
    return fakeKnowledgeContext({
      knowledgeDomains: ['Obras'],
      knowledgeEntities: datos.map(obra),
      knowledgeSummary: {
        domainsRequested: ['Obras'],
        domainsCovered: ['Obras'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: datos.map((d) => String(d.title)) },
      },
    })
  }

  it('compone la ficha con todos los campos que el catálogo trae', () => {
    const salida = buildDirectContent(contextoConObras([LA_VIDA_ES_SUENO])) as string

    expect(salida).toContain('En obras he encontrado un resultado:')
    expect(salida).toContain(
      '- La vida es sueño — Pedro Calderón de la Barca · drama · 1635 · 120 min · reparto de hasta 6 · a partir de 12 años · Español'
    )
  })

  it('traduce el idioma con la tabla compartida, nunca con su código', () => {
    const salida = buildDirectContent(contextoConObras([{ ...LA_VIDA_ES_SUENO, language: 'en' }])) as string

    expect(salida).toContain('Inglés')
    expect(salida).not.toContain('· en')
  })

  it('un campo ausente sencillamente no se menciona: jamás se rellena', () => {
    const salida = buildDirectContent(
      contextoConObras([{ title: 'Obra mínima', author: null, genre: null, year: null, durationMinutes: null, castSizeMax: null, minAge: null, language: null }])
    ) as string

    expect(salida).toContain('- Obra mínima')
    expect(salida).not.toMatch(/·|min|años|null|undefined/)
  })

  it('una ficha por línea, en el orden en que llegaron, con su recuento', () => {
    const salida = buildDirectContent(
      contextoConObras([
        { title: 'La dama boba', author: 'Lope de Vega' },
        { title: 'Fuenteovejuna', author: 'Lope de Vega' },
        { title: 'La vida es sueño', author: 'Pedro Calderón de la Barca' },
      ])
    ) as string

    const lineas = salida.split('\n')
    expect(lineas[0]).toBe('En obras he encontrado 3 resultados:')
    expect(lineas[1]).toBe('- La dama boba — Lope de Vega')
    expect(lineas[2]).toBe('- Fuenteovejuna — Lope de Vega')
    expect(lineas[3]).toBe('- La vida es sueño — Pedro Calderón de la Barca')
  })

  it('conserva la advertencia de criterio no aplicado delante de las fichas', () => {
    const contexto = fakeKnowledgeContext({
      knowledgeDomains: ['Obras'],
      knowledgeEntities: [obra(LA_VIDA_ES_SUENO)],
      knowledgeLimitations: [unfilteredCriteriaNote('Obras')],
      knowledgeSummary: {
        domainsRequested: ['Obras'],
        domainsCovered: ['Obras'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: ['La vida es sueño'] },
      },
    })

    const salida = buildDirectContent(contexto) as string

    expect(salida).toContain('no he podido aplicar el criterio que pedías; aun así, he encontrado un resultado:')
    expect(salida).toContain('- La vida es sueño —')
  })

  it('sin obras recuperadas, el formato anterior se conserva intacto', () => {
    const soloEtiquetas = fakeKnowledgeContext({
      knowledgeDomains: ['Obras'],
      knowledgeEntities: [],
      knowledgeSummary: {
        domainsRequested: ['Obras'],
        domainsCovered: ['Obras'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: ['Obra A', 'Obra B'] },
      },
    })

    expect(buildDirectContent(soloEtiquetas)).toBe('En obras he encontrado 2 resultados: Obra A y Obra B.')
  })

  it('otros dominios conservan su formato, y cada bloque va por separado', () => {
    const mixto = fakeKnowledgeContext({
      knowledgeDomains: ['Obras', 'Organizaciones'],
      knowledgeEntities: [obra({ title: 'La dama boba', author: 'Lope de Vega' })],
      knowledgeSummary: {
        domainsRequested: ['Obras', 'Organizaciones'],
        domainsCovered: ['Obras', 'Organizaciones'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: ['La dama boba'], Organizaciones: ['Teatro Español'] },
      },
    })

    const salida = buildDirectContent(mixto) as string

    expect(salida).toContain('- La dama boba — Lope de Vega')
    expect(salida).toContain('En organizaciones he encontrado un resultado: Teatro Español.')
    expect(salida.split('\n\n')).toHaveLength(2)
  })
})
