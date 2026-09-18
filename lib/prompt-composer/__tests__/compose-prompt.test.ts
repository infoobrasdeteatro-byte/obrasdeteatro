import { describe, it, expect } from 'vitest'
import { composePrompt } from '../compose-prompt'
import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import type { KnowledgeDomain } from '@/lib/knowledge-assets'
import type { Organization, Work } from '@/lib/repository-layer'
import { partiallyAppliedCriteriaNote, unfilteredCriteriaNote } from '@/lib/scenaia-knowledge-model'

function fakeNormalizedRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    requestId: 'req-1',
    originalRequest: '¿Qué obras me recomiendas de Lorca?',
    normalizedIntent: 'que obras me recomiendas de lorca?',
    retrievalQuery: 'que obras me recomiendas de lorca?',
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
    workOccupancy: {},
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

  it('UX-001A: sin historial (parametro omitido), no incluye ninguna seccion de historial -- comportamiento previo preservado', () => {
    const result = composePrompt(fakeNormalizedRequest(), fakeKnowledgeContext())

    expect(result).not.toContain('Historial de la conversacion')
  })

  it('UX-001A: con historial, lo incluye formateado por turno, antes de la peticion actual', () => {
    const result = composePrompt(fakeNormalizedRequest(), fakeKnowledgeContext(), [
      { role: 'user', content: 'obras de lope de vega' },
      { role: 'assistant', content: 'Resultados encontrados: El caballero de Olmedo.' },
    ])

    expect(result).toContain('Historial de la conversacion')
    expect(result).toContain('Usuario: obras de lope de vega')
    expect(result).toContain('ScenaIA: Resultados encontrados: El caballero de Olmedo.')
    expect(result.indexOf('Historial de la conversacion')).toBeLessThan(result.indexOf('Peticion del usuario'))
  })

  it('UX-001A: un historial vacío se comporta igual que ausencia de historial', () => {
    const withEmptyArray = composePrompt(fakeNormalizedRequest(), fakeKnowledgeContext(), [])
    const withoutParam = composePrompt(fakeNormalizedRequest(), fakeKnowledgeContext())

    expect(withEmptyArray).toBe(withoutParam)
  })

  it('UX-001A: nunca reinterpreta el contenido de los turnos -- los transporta tal cual, sin normalizar ni recortar', () => {
    const result = composePrompt(fakeNormalizedRequest(), fakeKnowledgeContext(), [
      { role: 'user', content: '¿Y de Federico García Lorca?' },
    ])

    expect(result).toContain('Usuario: ¿Y de Federico García Lorca?')
  })
})

function fakeWork(overrides: Partial<Work> = {}): Work {
  return {
    id: 'w-1',
    title: 'La casa de Bernarda Alba',
    subtitle: null,
    author: 'Federico García Lorca',
    genre: 'drama',
    synopsis: 'Sinopsis larga que no debe viajar al proveedor en esta version.',
    language: 'es',
    year: 1936,
    slug: 'la-casa-de-bernarda-alba',
    minAge: null,
    durationMinutes: 110,
    castSizeMax: 8, sourceName: null, sourceUrl: null,
    ...overrides,
  }
}

function fakeOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'o-1',
    name: 'Teatro Español',
    type: 'teatro',
    countryCode: 'ES',
    region: null,
    city: null,
    website: 'https://ejemplo.invalid',
    slug: 'teatro-espanol',
    ...overrides,
  }
}

function contextWithEntities(entities: KnowledgeContext['knowledgeEntities']): KnowledgeContext {
  const obras = entities.filter((item) => item.domain === 'Obras').map((item) => item.data.title)
  const organizaciones = entities.filter((item) => item.domain === 'Organizaciones').map((item) => item.data.name)
  const entryLabelsByDomain: KnowledgeContext['knowledgeSummary']['entryLabelsByDomain'] = {}
  if (obras.length > 0) entryLabelsByDomain.Obras = obras
  if (organizaciones.length > 0) entryLabelsByDomain.Organizaciones = organizaciones

  return fakeKnowledgeContext({
    knowledgeEntities: entities,
    knowledgeSummary: {
      domainsRequested: Object.keys(entryLabelsByDomain) as KnowledgeDomain[],
      domainsCovered: Object.keys(entryLabelsByDomain) as KnowledgeDomain[],
      domainsNotCovered: [],
      entryLabelsByDomain,
    },
  })
}

describe('composePrompt — conocimiento estructurado (reconexion AE-CONV-04)', () => {
  it('describe cada obra con los atributos reales ya recuperados, no solo con su titulo', () => {
    const result = composePrompt(fakeNormalizedRequest(), contextWithEntities([{ domain: 'Obras', data: fakeWork() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }]))

    expect(result).toContain(
      '- La casa de Bernarda Alba (autor: Federico García Lorca; genero: drama; ano: 1936; duracion: 110 min; reparto maximo: 8; idioma: es)'
    )
  })

  it('omite por completo todo atributo que sea null en el dato real -- nunca lo rellena ni lo aproxima', () => {
    const result = composePrompt(
      fakeNormalizedRequest(),
      contextWithEntities([
        { domain: 'Obras' as const, data: fakeWork({ genre: null, year: null, durationMinutes: null, castSizeMax: null, sourceName: null, sourceUrl: null, language: null }), provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] },
      ])
    )

    expect(result).toContain('- La casa de Bernarda Alba (autor: Federico García Lorca)')
    expect(result).not.toMatch(/genero:|ano:|duracion:|reparto maximo:|idioma:/)
  })

  it('nunca envia synopsis ni website al proveedor en esta version', () => {
    const result = composePrompt(
      fakeNormalizedRequest(),
      contextWithEntities([
        { domain: 'Obras', data: fakeWork() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] },
        { domain: 'Organizaciones', data: fakeOrganization() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] },
      ])
    )

    expect(result).not.toContain('Sinopsis larga')
    expect(result).not.toContain('ejemplo.invalid')
  })

  it('describe las organizaciones con su tipo y pais reales', () => {
    const result = composePrompt(
      fakeNormalizedRequest(),
      contextWithEntities([{ domain: 'Organizaciones', data: fakeOrganization() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }])
    )

    expect(result).toContain('- Teatro Español (tipo: teatro; pais: ES)')
  })

  it('nunca emite una etiqueta que no figure en entryLabelsByDomain, aunque exista en knowledgeEntities', () => {
    const context = fakeKnowledgeContext({
      knowledgeEntities: [
        { domain: 'Obras', data: fakeWork() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] },
        { domain: 'Obras' as const, data: fakeWork({ id: 'w-2', title: 'Obra no autorizada', author: null }), provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] },
      ],
      knowledgeSummary: {
        domainsRequested: ['Obras'],
        domainsCovered: ['Obras'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: ['La casa de Bernarda Alba'] },
      },
    })

    const result = composePrompt(fakeNormalizedRequest(), context)

    expect(result).toContain('La casa de Bernarda Alba')
    expect(result).not.toContain('Obra no autorizada')
  })

  it('conserva el formato anterior cuando ninguna etiqueta tiene entidad real asociada (degradacion elegante)', () => {
    const result = composePrompt(
      fakeNormalizedRequest(),
      fakeKnowledgeContext({
        knowledgeSummary: {
          domainsRequested: ['Obras'],
          domainsCovered: ['Obras'],
          domainsNotCovered: [],
          entryLabelsByDomain: { Obras: ['La vida es sueño', 'Fuente Ovejuna'] },
        },
      })
    )

    expect(result).toContain('Obras: La vida es sueño, Fuente Ovejuna')
  })

  it('mezcla etiquetas con y sin entidad asociada sin perder ninguna', () => {
    const context = fakeKnowledgeContext({
      knowledgeEntities: [{ domain: 'Obras', data: fakeWork() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }],
      knowledgeSummary: {
        domainsRequested: ['Obras'],
        domainsCovered: ['Obras'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: ['La casa de Bernarda Alba', 'Fuente Ovejuna'] },
      },
    })

    const result = composePrompt(fakeNormalizedRequest(), context)

    expect(result).toContain('- La casa de Bernarda Alba (autor: Federico García Lorca')
    expect(result).toContain('- Fuente Ovejuna')
  })

  it('sigue siendo determinista con conocimiento estructurado', () => {
    const context = contextWithEntities([{ domain: 'Obras', data: fakeWork() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }])

    expect(composePrompt(fakeNormalizedRequest(), context)).toBe(composePrompt(fakeNormalizedRequest(), context))
  })
})

describe('composePrompt — advertencia de criterio no aplicado', () => {
  const contextoSinFiltrar = (): KnowledgeContext =>
    fakeKnowledgeContext({
      knowledgeDomains: ['Obras'],
      knowledgeEntities: [{ domain: 'Obras', data: fakeWork() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }],
      knowledgeSummary: {
        domainsRequested: ['Obras'],
        domainsCovered: ['Obras'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: ['La casa de Bernarda Alba'] },
      },
      knowledgeLimitations: [unfilteredCriteriaNote('Obras')],
    })

  it('advierte al proveedor cuando el listado de un dominio no se filtro por el criterio pedido', () => {
    const result = composePrompt(fakeNormalizedRequest(), contextoSinFiltrar())

    expect(result).toContain('Advertencia sobre el conocimiento anterior:')
    expect(result).toContain('Obras: el listado NO esta filtrado por el criterio pedido.')
  })

  it('la advertencia aparece despues del conocimiento y antes de la peticion del usuario', () => {
    const result = composePrompt(fakeNormalizedRequest(), contextoSinFiltrar())

    expect(result.indexOf('Conocimiento real')).toBeLessThan(result.indexOf('Advertencia sobre'))
    expect(result.indexOf('Advertencia sobre')).toBeLessThan(result.indexOf('Peticion del usuario'))
  })

  it('no advierte nada cuando el criterio si se aplico', () => {
    const result = composePrompt(fakeNormalizedRequest(), contextWithEntities([{ domain: 'Obras', data: fakeWork() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }]))

    expect(result).not.toContain('Advertencia sobre el conocimiento anterior')
  })

  it('solo advierte del dominio afectado, nunca de los demas', () => {
    const context = fakeKnowledgeContext({
      knowledgeDomains: ['Obras', 'Organizaciones'],
      knowledgeEntities: [
        { domain: 'Obras', data: fakeWork() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] },
        { domain: 'Organizaciones', data: fakeOrganization() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] },
      ],
      knowledgeSummary: {
        domainsRequested: ['Obras', 'Organizaciones'],
        domainsCovered: ['Obras', 'Organizaciones'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: ['La casa de Bernarda Alba'], Organizaciones: ['Teatro Español'] },
      },
      knowledgeLimitations: [unfilteredCriteriaNote('Organizaciones')],
    })

    const result = composePrompt(fakeNormalizedRequest(), context)

    expect(result).toContain('Organizaciones: el listado NO esta filtrado')
    expect(result).not.toContain('Obras: el listado NO esta filtrado')
  })

  it('nunca transporta la nota generica de IA-003, que seria falsa ante un listado si filtrado', () => {
    const context = fakeKnowledgeContext({
      knowledgeDomains: ['Obras'],
      knowledgeEntities: [{ domain: 'Obras', data: fakeWork() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }],
      knowledgeSummary: {
        domainsRequested: ['Obras'],
        domainsCovered: ['Obras'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Obras: ['La casa de Bernarda Alba'] },
      },
      knowledgeLimitations: [
        'los dominios cubiertos se enumeran sin relevancia ni relacion con el texto de la peticion -- sin motor de busqueda (IA-003)',
      ],
    })

    const result = composePrompt(fakeNormalizedRequest(), context)

    expect(result).not.toContain('IA-003')
    expect(result).not.toContain('sin relevancia')
    expect(result).not.toContain('Advertencia sobre el conocimiento anterior')
  })
})

describe('composePrompt — distingue criterio parcial de criterio no aplicado', () => {
  const base = (limitations: string[]): KnowledgeContext =>
    fakeKnowledgeContext({
      knowledgeDomains: ['Organizaciones'],
      knowledgeEntities: [{ domain: 'Organizaciones', data: fakeOrganization() , provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }],
      knowledgeSummary: {
        domainsRequested: ['Organizaciones'],
        domainsCovered: ['Organizaciones'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Organizaciones: ['Teatro Español'] },
      },
      knowledgeLimitations: limitations,
    })

  it('2) criterio PARCIAL: advierte que el filtrado es incompleto, nunca que no se filtro', () => {
    const result = composePrompt(fakeNormalizedRequest(), base([partiallyAppliedCriteriaNote('Organizaciones')]))

    expect(result).toContain('el listado esta filtrado solo EN PARTE')
    expect(result).not.toContain('NO esta filtrado por el criterio pedido')
  })

  it('3) criterio NO APLICADO: mantiene la advertencia original', () => {
    const result = composePrompt(fakeNormalizedRequest(), base([unfilteredCriteriaNote('Organizaciones')]))

    expect(result).toContain('NO esta filtrado por el criterio pedido')
    // La comprobacion apunta a la linea de ADVERTENCIA, no a todo el prompt:
    // desde el Bloque 3 la regla 4 de las instrucciones nombra los dos
    // estados para que el proveedor sepa distinguirlos, de modo que la
    // expresion "solo EN PARTE" aparece siempre en el prompt. Lo que no
    // debe aparecer es la advertencia concreta de criterio parcial.
    expect(result).not.toContain('el listado esta filtrado solo EN PARTE')
  })

  it('4) SIN criterio: ninguna advertencia -- el usuario no pidio nada que filtrar', () => {
    const result = composePrompt(fakeNormalizedRequest(), base([]))

    expect(result).not.toContain('Advertencia sobre el conocimiento anterior')
  })
})

describe('composePrompt — la funcion teatral llega al proveedor', () => {
  const conFuncion = (functions: string[]): KnowledgeContext =>
    fakeKnowledgeContext({
      knowledgeDomains: ['Organizaciones'],
      knowledgeEntities: [
        { domain: 'Organizaciones', data: fakeOrganization(), provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: functions as never },
      ],
      knowledgeSummary: {
        domainsRequested: ['Organizaciones'],
        domainsCovered: ['Organizaciones'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Organizaciones: ['Teatro Español'] },
      },
    })

  it('emite la funcion declarada junto al resto de atributos reales', () => {
    const result = composePrompt(fakeNormalizedRequest(), conFuncion(['distribucion']))

    expect(result).toContain('funcion: distribucion')
  })

  it('emite varias funciones cuando la entidad desempena mas de una', () => {
    const result = composePrompt(fakeNormalizedRequest(), conFuncion(['produccion', 'distribucion']))

    expect(result).toContain('funcion: produccion, distribucion')
  })

  it('sin funcion declarada no emite ninguna: nunca inventa un papel', () => {
    const result = composePrompt(fakeNormalizedRequest(), conFuncion([]))

    expect(result).not.toContain('funcion:')
  })
})

describe('composePrompt — dominio Personas', () => {
  const persona = (overrides = {}) => ({
    domain: 'Personas' as const,
    data: {
      id: 'p-1',
      name: 'Ana Ruiz',
      profileType: 'dramaturgo',
      bio: null,
      city: 'Madrid',
      region: 'Comunidad de Madrid',
      countryCode: 'ES',
      slug: 'ana-ruiz',
      isVerified: true,
      ...overrides,
    },
    provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null },
    functions: ['dramaturgia'] as never,
  })

  const contexto = (item: ReturnType<typeof persona>): KnowledgeContext =>
    fakeKnowledgeContext({
      knowledgeDomains: ['Personas'],
      knowledgeEntities: [item as never],
      knowledgeSummary: {
        domainsRequested: ['Personas'],
        domainsCovered: ['Personas'],
        domainsNotCovered: [],
        entryLabelsByDomain: { Personas: [item.data.name] },
      },
    })

  it('emite perfil, ubicacion real y funcion derivada', () => {
    const result = composePrompt(fakeNormalizedRequest(), contexto(persona()))

    expect(result).toContain('- Ana Ruiz (perfil: dramaturgo; ciudad: Madrid; region: Comunidad de Madrid; pais: ES; perfil verificado; funcion: dramaturgia)')
  })

  it('omite por completo toda ubicacion nula: nunca inventa una ciudad', () => {
    const result = composePrompt(
      fakeNormalizedRequest(),
      contexto(persona({ city: null, region: null, countryCode: null }))
    )

    expect(result).toContain('- Ana Ruiz (perfil: dramaturgo; perfil verificado; funcion: dramaturgia)')
    expect(result).not.toMatch(/ciudad:|region:|pais:/)
  })

  it('un perfil sin funcion derivada no recibe ninguna inventada', () => {
    const sinFuncion = { ...persona({ profileType: 'profesional' }), functions: [] as never }
    const result = composePrompt(fakeNormalizedRequest(), contexto(sinFuncion))

    expect(result).toContain('perfil: profesional')
    expect(result).not.toContain('funcion:')
  })
})

/**
 * Politica de procedencia (Bloque 3). Las instrucciones son el unico punto
 * del sistema donde se gobierna que hace el proveedor con el conocimiento
 * que se le entrega: aqui se fija su contenido, no su redaccion literal --
 * cada test comprueba una regla, no una frase.
 */
describe('composePrompt — politica de procedencia del conocimiento', () => {
  const prompt = () => composePrompt(fakeNormalizedRequest(), fakeKnowledgeContext())

  it('nombra los tres dominios cubiertos: Personas ya no queda fuera de la instruccion', () => {
    const result = prompt()

    expect(result).toContain('Obras, Personas u Organizaciones')
  })

  it('da prioridad explicita al conocimiento del ecosistema', () => {
    expect(prompt()).toContain('usalo SIEMPRE primero')
  })

  it('prohibe inventar entidades del ecosistema, enumerando las que existen', () => {
    const result = prompt()

    expect(result).toContain('Nunca inventes obras, personas, organizaciones, autores, ubicaciones, eventos')
    expect(result).toContain('no lo presentes como parte del catalogo')
  })

  it('conserva la instruccion de no presentar un listado sin filtrar como si cumpliera el criterio (SCENAIA-002, Caso 1)', () => {
    const result = prompt()

    expect(result).toContain('indicalo explicitamente en tu respuesta')
    expect(result).toContain('nunca presentes la lista general como si respondiera a ese criterio')
  })

  it('exige declarar que parte del criterio no se pudo aplicar, y ofrecer igualmente lo recuperado', () => {
    const result = prompt()

    expect(result).toContain('que parte de lo pedido no se ha podido aplicar')
    expect(result).toContain('ofrece igualmente lo que si tienes')
    expect(result).toContain('sin atribuirle una caracteristica que no cumple')
  })

  it('PERMITE el conocimiento general del modelo -- ScenaIA no queda encerrada en su catalogo', () => {
    expect(prompt()).toContain('Puedes responder con tu conocimiento general')
  })

  it('pero lo permite SOLO con declaracion obligatoria e inequivoca de procedencia', () => {
    const result = prompt()

    expect(result).toContain('DEBES declararlo de forma inequivoca')
    expect(result).toContain('no procede del catalogo de ObrasDeTeatro')
  })

  it('prohibe mezclar ambas procedencias de forma indistinguible', () => {
    const result = prompt()

    expect(result).toContain('Nunca mezcles ambas procedencias')
    expect(result).toContain('el usuario no pueda distinguirlas')
  })

  it('prohibe remitir a directorios o plataformas externas como sustituto del ecosistema', () => {
    const result = prompt()

    expect(result).toContain('No remitas al usuario a directorios, plataformas, bases de datos ni servicios externos')
    expect(result).toContain('ofrece lo que si hay')
  })

  it('la politica encabeza el prompt: gobierna todo lo que viene despues', () => {
    const result = prompt()

    expect(result.indexOf('Reglas sobre lo que dices y de donde procede')).toBeLessThan(
      result.indexOf('Peticion del usuario')
    )
  })

  it('se emite siempre, tambien sin conocimiento recuperado -- es cuando mas falta hace', () => {
    const sinConocimiento = composePrompt(
      fakeNormalizedRequest(),
      fakeKnowledgeContext({
        knowledgeDomains: [],
        knowledgeEntities: [],
        knowledgeSummary: {
          domainsRequested: [],
          domainsCovered: [],
          domainsNotCovered: [],
          entryLabelsByDomain: {},
        },
      })
    )

    expect(sinConocimiento).toContain('Puedes responder con tu conocimiento general')
    expect(sinConocimiento).toContain('no procede del catalogo de ObrasDeTeatro')
  })

  it('sigue siendo determinista: la politica no introduce variacion alguna', () => {
    expect(prompt()).toBe(prompt())
  })
})
