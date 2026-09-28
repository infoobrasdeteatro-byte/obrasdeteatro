import { describe, it, expect } from 'vitest'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { unfilteredCriteriaNote } from '@/lib/scenaia-knowledge-model'
import { buildDirectContent } from '../build-direct-content'

/**
 * SCENAIA-004B §4.6 -- texto de la respuesta con página del listado: el
 * recuento es el TOTAL, no las obras de la página; con total no determinado
 * no se da ninguna cifra; una página de continuación vacía lo dice. Sin
 * página, el texto es exactamente el de siempre.
 */

function obra(n: number) {
  return {
    domain: 'Obras' as const,
    data: { id: `w${n}`, title: `Obra ${n}`, author: 'Lope de Vega', genre: 'Comedia', year: 1600 + n } as never,
    provenance: {} as never,
    functions: [],
  }
}

function contexto(obras: number, overrides: Partial<KnowledgeContext> = {}): KnowledgeContext {
  const entidades = Array.from({ length: obras }, (_, i) => obra(i + 1))
  return {
    knowledgeSummary: {
      domainsRequested: ['Obras'],
      domainsCovered: ['Obras'],
      domainsNotCovered: [],
      entryLabelsByDomain: { Obras: entidades.map((e) => (e.data as { title: string }).title) },
    },
    knowledgeDomains: ['Obras'],
    knowledgeEntities: entidades,
    knowledgeRelations: null,
    knowledgeConfidence: 1,
    knowledgeCompleteness: 'completo',
    knowledgeLimitations: [],
    workOccupancy: {},
    knowledgeTimestamp: 'T',
    ...overrides,
  }
}

const FICHAS_10 = Array.from({ length: 10 }, (_, i) => `- Obra ${i + 1} — Lope de Vega · Comedia · ${1601 + i}`).join('\n')

describe('buildDirectContent — página del listado (SCENAIA-004B §4.6)', () => {
  it('con total numérico, el recuento es el total del listado, no las obras de la página', () => {
    const texto = buildDirectContent(contexto(10, { worksPage: { offset: 0, pageSize: 10, returned: 10, total: 11 } }))

    expect(texto).toBe(`En obras he encontrado 11 resultados:\n${FICHAS_10}`)
  })

  it('con total null, no da ninguna cifra: "estas son las obras encontradas"', () => {
    const texto = buildDirectContent(contexto(10, { worksPage: { offset: 0, pageSize: 10, returned: 10, total: null } }))

    expect(texto).toBe(`En obras, estas son las obras encontradas:\n${FICHAS_10}`)
    expect(texto).not.toMatch(/\d+ resultados/)
  })

  it('página de continuación vacía: "No hay más obras en este listado."', () => {
    const texto = buildDirectContent(contexto(0, { worksPage: { offset: 20, pageSize: 10, returned: 0, total: 11 } }))

    expect(texto).toBe('No hay más obras en este listado.')
  })

  it('una sola obra en la página: el recuento sigue siendo el total', () => {
    const texto = buildDirectContent(contexto(1, { worksPage: { offset: 10, pageSize: 10, returned: 1, total: 11 } }))

    expect(texto).toBe('En obras he encontrado 11 resultados:\n- Obra 1 — Lope de Vega · Comedia · 1601')
  })

  it('un total de 1 concuerda en singular', () => {
    const texto = buildDirectContent(contexto(1, { worksPage: { offset: 0, pageSize: 10, returned: 1, total: 1 } }))

    expect(texto).toBe('En obras he encontrado un resultado:\n- Obra 1 — Lope de Vega · Comedia · 1601')
  })

  it('una primera página vacía no es una continuación: el texto de siempre para "ningún resultado"', () => {
    const texto = buildDirectContent(contexto(0, { worksPage: { offset: 0, pageSize: 10, returned: 0, total: 0 } }))

    expect(texto).toBe('En obras no he encontrado ningún resultado.')
  })

  it('con criterio no aplicado, el aviso se conserva y el recuento es el total', () => {
    const texto = buildDirectContent(
      contexto(10, { knowledgeLimitations: [unfilteredCriteriaNote('Obras')], worksPage: { offset: 0, pageSize: 10, returned: 10, total: 11 } })
    )

    expect(texto).toBe(`En obras no he podido aplicar el criterio que pedías; aun así, he encontrado 11 resultados:\n${FICHAS_10}`)
  })

  describe('sin worksPage, el texto es idéntico al actual', () => {
    const casos: [string, KnowledgeContext][] = [
      ['diez obras', contexto(10)],
      ['una obra', contexto(1)],
      ['ninguna obra', contexto(0)],
      ['criterio no aplicado', contexto(3, { knowledgeLimitations: [unfilteredCriteriaNote('Obras')] })],
    ]

    it.each(casos)('%s (worksPage ausente, null o sin pasar)', (_caso, base) => {
      const sinCampo = buildDirectContent(base)
      const conNull = buildDirectContent({ ...base, worksPage: null })

      expect(conNull).toBe(sinCampo)
    })

    it('mantiene el recuento de obras recuperadas cuando no hay página', () => {
      expect(buildDirectContent(contexto(10))).toBe(`En obras he encontrado 10 resultados:\n${FICHAS_10}`)
      expect(buildDirectContent(contexto(0))).toBe('En obras no he encontrado ningún resultado.')
    })
  })
})
