import { describe, it, expect } from 'vitest'
import { isDefinitionalRequest } from '../speech-act'
import { detectKnowledgeDomains } from '../domain-rules'
import { normalizeRequest } from '../interpreter'

/**
 * F5F-1: `normalizeRequest` ya no acuña identidad -- la recibe. Estas
 * pruebas verifican INTERPRETACION, no identidad, asi que la fijan a un
 * valor constante y siguen expresando exactamente lo que expresaban antes.
 * La identidad tiene sus propias pruebas al final del fichero.
 */
const ID_DE_PRUEBA = 'turno-de-prueba'

function interpretar(
  originalRequest: string,
  previousUserRequests: readonly string[] = [],
  previousDomain: Parameters<typeof normalizeRequest>[3] = null
) {
  return normalizeRequest(originalRequest, ID_DE_PRUEBA, previousUserRequests, previousDomain)
}


/**
 * A3.1-alfa. La regla se comprueba SIEMPRE por parejas: la misma palabra del
 * vocabulario en una construccion definicional y en una de catalogo. Si un
 * dia la implementacion degenerase en una lista de temas, estas parejas
 * fallarian -- es lo que las hace utiles.
 */
describe('isDefinitionalRequest — reconoce la construccion, no el tema', () => {
  it('reconoce las formulas con que el castellano pregunta por un significado', () => {
    expect(isDefinitionalRequest('que es el teatro del absurdo?')).toBe(true)
    expect(isDefinitionalRequest('que significa teatro del absurdo?')).toBe(true)
    expect(isDefinitionalRequest('definicion de teatro del absurdo')).toBe(true)
    expect(isDefinitionalRequest('que quiere decir dramaturgia?')).toBe(true)
    expect(isDefinitionalRequest('a que se llama teatro de calle?')).toBe(true)
    expect(isDefinitionalRequest('que son los festivales de teatro?')).toBe(true)
  })

  it('no conoce ningun tema: funciona con un termino que no existe', () => {
    expect(isDefinitionalRequest('que es el teatro fistroide?')).toBe(true)
    expect(isDefinitionalRequest('que significa zurumbatico?')).toBe(true)
  })

  it('una peticion de catalogo no es definicional, aunque comparta las palabras', () => {
    expect(isDefinitionalRequest('que teatros hay en madrid?')).toBe(false)
    expect(isDefinitionalRequest('que obras de teatro tienes?')).toBe(false)
    expect(isDefinitionalRequest('que companias de teatro hay?')).toBe(false)
    expect(isDefinitionalRequest('busco una compania de teatro')).toBe(false)
  })

  it('un verbo de aportacion delata que se piden entidades pese a la forma definicional', () => {
    // "que es lo que tienes" pide obras, no una definicion.
    expect(isDefinitionalRequest('que es lo que tienes de obras?')).toBe(false)
    expect(isDefinitionalRequest('que es una compania de teatro que tienes')).toBe(false)
    expect(isDefinitionalRequest('que es lo que hay?')).toBe(false)
  })

  it('exige palabra completa: no se dispara desde el interior de otra', () => {
    expect(isDefinitionalRequest('lo que estas obras representan')).toBe(false)
    expect(isDefinitionalRequest('busco un texto que escenifique algo')).toBe(false)
  })

  it('es pura y determinista', () => {
    expect(isDefinitionalRequest('que es el teatro del absurdo?')).toBe(
      isDefinitionalRequest('que es el teatro del absurdo?')
    )
  })
})

describe('detectKnowledgeDomains — una peticion definicional no abre catalogo', () => {
  it('DEFINICIONAL: ninguna palabra abre dominio', () => {
    for (const peticion of [
      'que es el teatro del absurdo?',
      'que significa teatro del absurdo?',
      'definicion de teatro del absurdo',
      'que es una compania de teatro?',
      'que es una obra de teatro?',
      'que son los festivales de teatro?',
    ]) {
      expect(detectKnowledgeDomains(peticion), peticion).toEqual([])
    }
  })

  it('CATALOGO: sigue abriendo exactamente los mismos dominios que antes', () => {
    expect(detectKnowledgeDomains('que obras hay?')).toEqual(['Obras'])
    expect(detectKnowledgeDomains('que obras de teatro tienes?')).toEqual(['Obras'])
    expect(detectKnowledgeDomains('que teatros hay en madrid?')).toEqual(['Organizaciones'])
    expect(detectKnowledgeDomains('que companias de teatro hay?')).toEqual(['Organizaciones'])
    expect(detectKnowledgeDomains('que actores hay?')).toEqual(['Personas'])
  })

  it('PAREJA MINIMA: la misma palabra, dos construcciones, dos resultados', () => {
    expect(detectKnowledgeDomains('que es una compania de teatro?')).toEqual([])
    expect(detectKnowledgeDomains('que companias de teatro hay?')).toEqual(['Organizaciones'])

    expect(detectKnowledgeDomains('que es una obra de teatro?')).toEqual([])
    expect(detectKnowledgeDomains('que obras de teatro tienes?')).toEqual(['Obras'])
  })

  it('NO SOBREDISPARA: "es" dentro de una peticion de catalogo no la bloquea', () => {
    expect(detectKnowledgeDomains('cual es la obra mas corta?')).toEqual(['Obras'])
    expect(detectKnowledgeDomains('que obra es la mas corta?')).toEqual(['Obras'])
    expect(detectKnowledgeDomains('que obras es lo que tienes?')).toEqual(['Obras'])
  })

  it('NO REGRESION: las reglas de nucleo, subordinacion y coordinacion siguen intactas', () => {
    expect(detectKnowledgeDomains('quiero una obra para pocos actores')).toEqual(['Obras'])
    expect(detectKnowledgeDomains('quiero actores para una obra')).toEqual(['Personas'])
    expect(detectKnowledgeDomains('busco obras y companias')).toEqual(['Obras', 'Organizaciones'])
    expect(detectKnowledgeDomains('obra de teatro')).toEqual(['Obras'])
    expect(detectKnowledgeDomains('obra, teatro')).toEqual(['Obras', 'Organizaciones'])
  })

  it('NO REGRESION de A1: los terminos que anade el resolutor siguen abriendo Personas', () => {
    expect(detectKnowledgeDomains('necesito personas para el reparto perfil')).toEqual(['Personas'])
    expect(detectKnowledgeDomains('busco gente para una obra obra perfil')).toEqual(['Personas', 'Obras'])
  })
})

describe('normalizeRequest — efecto extremo a extremo', () => {
  it('una peticion definicional llega sin dominios: no habra nada que recuperar', () => {
    const resultado = interpretar('¿Qué es el teatro del absurdo?')

    expect(resultado.requestedKnowledgeDomains).toEqual([])
  })

  it('la peticion de catalogo equivalente conserva su dominio', () => {
    expect(interpretar('¿Qué teatros hay en Madrid?').requestedKnowledgeDomains).toEqual(['Organizaciones'])
  })

  it('el texto original y la consulta de recuperacion no se alteran', () => {
    const resultado = interpretar('¿Qué es el teatro del absurdo?')

    expect(resultado.originalRequest).toBe('¿Qué es el teatro del absurdo?')
    expect(resultado.retrievalQuery).toBe(resultado.normalizedIntent)
  })

  it('CONTINUIDAD intacta: un turno de seguimiento sigue heredando el contexto anterior', () => {
    const resultado = interpretar('¿y alguna más corta?', ['¿Qué obras de comedia tienes?'])

    expect(resultado.requestedKnowledgeDomains).toEqual(['Obras'])
    expect(resultado.retrievalQuery).toContain('comedia')
  })
})
