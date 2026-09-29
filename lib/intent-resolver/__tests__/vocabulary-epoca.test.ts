import { describe, it, expect } from 'vitest'
import { detectKnowledgeDomains } from '@/lib/request-interpreter/domain-rules'
import { interpretWorkQuery } from '@/lib/knowledge-assets/interpret-work-query'
import { interpretOrganizationQuery } from '@/lib/knowledge-assets/interpret-organization-query'
import { interpretPersonQuery } from '@/lib/knowledge-assets/interpret-person-query'
import {
  RESOLVABLE_TERMS,
  CONCEPT_TERMS,
  EPOCA_CONCEPT_TERMS,
  buildResolverPrompt,
  composeAugmentedRequest,
  conceptTermsFor,
  mayNeedResolution,
  parseResolvedTerms,
  resolvableTermsFor,
} from '../vocabulary'
import { resolveVocabulary } from '../resolve-vocabulary'

/**
 * SCENAIA-007 PR 3 (§4.4): los términos de época del Intent Resolver, solo
 * con el interruptor encendido. Mantiene el invariante bidireccional de
 * vocabulary.test.ts (Bloque A2) en los DOS estados del interruptor: nada
 * emitible sin motor que lo reconozca, y nada reconocido que no sea emitible.
 */
const ON = { epocaHabilitada: true } as const
const OFF = { epocaHabilitada: false } as const

/** Un término lo reconoce algún motor determinista, en el modo indicado. */
function reconocido(term: string, opciones?: { epocaHabilitada: boolean }): boolean {
  return (
    detectKnowledgeDomains(term).length > 0 ||
    Object.keys(interpretWorkQuery(term, [], {}, opciones)).length > 0 ||
    Object.keys(interpretOrganizationQuery(term)).length > 0 ||
    Object.keys(interpretPersonQuery(term)).length > 0
  )
}

describe('sincronía del vocabulario en los dos estados del interruptor', () => {
  it('APAGADO: la frontera es exactamente la de antes y ningún término de época es emitible', () => {
    expect(resolvableTermsFor()).toEqual(RESOLVABLE_TERMS)
    expect(resolvableTermsFor(OFF)).toEqual(RESOLVABLE_TERMS)
    expect(conceptTermsFor(OFF)).toEqual(CONCEPT_TERMS)
    for (const term of EPOCA_CONCEPT_TERMS) expect(resolvableTermsFor(OFF), term).not.toContain(term)
  })

  it('APAGADO, dirección A: todo término emitible lo reconoce un motor con el interruptor apagado', () => {
    for (const term of resolvableTermsFor(OFF)) expect(reconocido(term, OFF), `término sin motor: ${term}`).toBe(true)
  })

  it('APAGADO: ningún término de época produce epocas (por eso no son emitibles); el motor responde como antes', () => {
    for (const term of EPOCA_CONCEPT_TERMS) {
      expect(interpretWorkQuery(term, [], {}, OFF).epocas, term).toBeUndefined()
      // Comportamiento anterior intacto: "neoclasico" sigue cayendo en el
      // género "clasico" por subcadena, como hoy; el resto no produce nada.
      expect(interpretWorkQuery(term, [], {}, OFF), term).toEqual(term === 'neoclasico' ? { genre: 'clasico' } : {})
    }
  })

  it('ENCENDIDO, dirección A: todo término emitible lo reconoce un motor con el interruptor encendido', () => {
    for (const term of resolvableTermsFor(ON)) expect(reconocido(term, ON), `término sin motor: ${term}`).toBe(true)
  })

  it('ENCENDIDO, dirección B: cada época de la lista cerrada tiene un término emitible que la produce', () => {
    const claves = new Set<string>()
    for (const term of resolvableTermsFor(ON)) {
      for (const clave of interpretWorkQuery(term, [], {}, ON).epocas ?? []) claves.add(clave)
    }
    for (const clave of ['grecolatino', 'medieval', 'renacimiento', 'siglo_de_oro', 'barroco', 'isabelino', 'neoclasico', 'romanticismo', 'realismo_naturalismo', 'vanguardias', 'posguerra', 'contemporaneo']) {
      expect(claves, `ningún término emitible produce: ${clave}`).toContain(clave)
    }
  })

  it('ENCENDIDO, término a término: cada término de época produce su propia clave, y "clasico" las 6 de clásico', () => {
    const esperado: Record<string, readonly string[]> = {
      grecolatino: ['grecolatino'], medieval: ['medieval'], renacimiento: ['renacimiento'], 'siglo de oro': ['siglo_de_oro'],
      barroco: ['barroco'], isabelino: ['isabelino'], neoclasico: ['neoclasico'], romanticismo: ['romanticismo'],
      realismo: ['realismo_naturalismo'], vanguardias: ['vanguardias'], posguerra: ['posguerra'],
    }
    expect(Object.keys(esperado).sort()).toEqual([...EPOCA_CONCEPT_TERMS].sort())
    for (const [term, claves] of Object.entries(esperado)) expect(interpretWorkQuery(term, [], {}, ON).epocas, term).toEqual(claves)
    expect(interpretWorkQuery('clasico', [], {}, ON).epocas).toEqual(['grecolatino', 'renacimiento', 'siglo_de_oro', 'barroco', 'isabelino', 'neoclasico'])
  })
})

describe('funciones del resolutor según el interruptor', () => {
  it('el prompt solo ofrece los términos de época con el interruptor encendido', () => {
    expect(buildResolverPrompt('teatro barroco')).not.toContain('siglo de oro')
    expect(buildResolverPrompt('teatro barroco', OFF)).toBe(buildResolverPrompt('teatro barroco'))
    expect(buildResolverPrompt('teatro barroco', ON)).toContain('siglo de oro')
  })

  it('el parser solo acepta términos de época con el interruptor encendido', () => {
    const respuesta = 'obra :: obras\nbarroco :: barrocas'
    expect(parseResolvedTerms(respuesta, 'obras barrocas')).toEqual(['obra'])
    expect(parseResolvedTerms(respuesta, 'obras barrocas', ON)).toEqual(['obra', 'barroco'])
  })

  it('el parser no confunde "neoclasico" con "clasico"', () => {
    expect(parseResolvedTerms('neoclasico :: neoclasicas', 'obras neoclasicas', ON)).toEqual(['neoclasico'])
    expect(parseResolvedTerms('neoclasico :: neoclasicas', 'obras neoclasicas')).toEqual([])
  })

  it('la guarda de coste da por entendidas las épocas solo con el interruptor encendido', () => {
    expect(mayNeedResolution('obras barrocas')).toBe(true)
    expect(mayNeedResolution('obras barrocas', ON)).toBe(false)
    expect(mayNeedResolution('obras del siglo de oro', ON)).toBe(false)
  })

  it('la composición añade el término de época como criterio, y el intérprete lo entiende', () => {
    const texto = composeAugmentedRequest('algo de los griegos antiguos', ['obra', 'grecolatino'], ON)
    expect(texto).toBe('algo de los griegos antiguos obra para grecolatino')
    expect(interpretWorkQuery(texto, [], {}, ON).epocas).toEqual(['grecolatino'])
    // Apagado, el término de época no es un criterio y no se añade.
    expect(composeAugmentedRequest('algo de los griegos antiguos', ['obra', 'grecolatino'])).toBe('algo de los griegos antiguos obra')
  })

  it('resolveVocabulary reenvía la opción: el mismo proveedor da términos de época solo con el interruptor encendido', async () => {
    const proveedor = async () => 'obra :: pieza\nbarroco :: barroca'
    expect(await resolveVocabulary('una pieza barroca para montar', proveedor)).toEqual(['obra'])
    expect(await resolveVocabulary('una pieza barroca para montar', proveedor, ON)).toEqual(['obra', 'barroco'])
  })
})
