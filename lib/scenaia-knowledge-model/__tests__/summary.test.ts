import { describe, it, expect } from 'vitest'
import { buildKnowledgeSummary } from '../summary'

const WORK_ITEM = { domain: 'Obras' as const, data: { title: 'La Casa de Bernarda Alba' } as never, provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }
const ORG_ITEM = { domain: 'Organizaciones' as const, data: { name: 'Teatro Español' } as never, provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }

describe('buildKnowledgeSummary', () => {
  it('sintetiza dominios solicitados/cubiertos/no cubiertos y etiquetas reales por dominio', () => {
    const result = buildKnowledgeSummary(['Obras', 'Personas'], ['Obras'], [WORK_ITEM])

    expect(result).toEqual({
      domainsRequested: ['Obras', 'Personas'],
      domainsCovered: ['Obras'],
      domainsNotCovered: ['Personas'],
      entryLabelsByDomain: { Obras: ['La Casa de Bernarda Alba'] },
    })
  })

  it('usa el nombre (no el título) como etiqueta para Organizaciones', () => {
    const result = buildKnowledgeSummary(['Organizaciones'], ['Organizaciones'], [ORG_ITEM])

    expect(result.entryLabelsByDomain).toEqual({ Organizaciones: ['Teatro Español'] })
  })

  it('no incluye clave alguna en entryLabelsByDomain para dominios no cubiertos', () => {
    const result = buildKnowledgeSummary(['Personas'], [], [])

    expect(result.entryLabelsByDomain).toEqual({})
    expect(result.domainsNotCovered).toEqual(['Personas'])
  })
})
