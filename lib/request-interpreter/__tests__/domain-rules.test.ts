import { describe, it, expect } from 'vitest'
import { detectKnowledgeDomains } from '../domain-rules'

describe('detectKnowledgeDomains', () => {
  it('detecta un unico dominio por palabra clave', () => {
    expect(detectKnowledgeDomains('quiero ver el casting de la semana')).toEqual(['Oportunidades'])
  })

  it('detecta multiples dominios cuando el usuario los coordina de verdad', () => {
    const domains = detectKnowledgeDomains('busco obras y companias')
    expect(domains).toEqual(expect.arrayContaining(['Organizaciones', 'Obras']))
    expect(domains).toHaveLength(2)
  })

  it('devuelve lista vacia cuando no hay ninguna coincidencia', () => {
    expect(detectKnowledgeDomains('hola, buenos dias')).toEqual([])
  })

  it('nunca detecta el dominio Inteligencia (sin palabras clave propias en v1)', () => {
    expect(detectKnowledgeDomains('inteligencia')).toEqual([])
  })
})

describe('detectKnowledgeDomains — nucleo de la peticion frente a complemento', () => {
  it('A) "obra corta para pocos actores" pide Obras: el reparto es un criterio, no una peticion de Personas', () => {
    expect(detectKnowledgeDomains('teneis alguna obra corta para pocos actores?')).toEqual(['Obras'])
  })

  it('B) "obras de teatro" pide Obras: "teatro" complementa a "obras", no pide Organizaciones', () => {
    expect(detectKnowledgeDomains('que obras de teatro tienes?')).toEqual(['Obras'])
  })

  it('C) "companias de teatro" pide Organizaciones', () => {
    expect(detectKnowledgeDomains('que companias de teatro hay?')).toEqual(['Organizaciones'])
  })

  it('D) "actores de esta obra" pide Personas: aqui el nucleo es el reparto', () => {
    expect(detectKnowledgeDomains('que actores participan en esta obra?')).toEqual(['Personas'])
    expect(detectKnowledgeDomains('quiero los actores de esta obra')).toEqual(['Personas'])
  })

  it('E) la coordinacion conserva la deteccion multiple: "y" no subordina', () => {
    expect(detectKnowledgeDomains('busco obras y castings')).toEqual(['Obras', 'Oportunidades'])
    expect(detectKnowledgeDomains('quiero obras, companias y convocatorias')).toEqual([
      'Obras',
      'Organizaciones',
      'Oportunidades',
    ])
  })

  it('la regla es gramatical, no una lista de excepciones: funciona con dominios no previstos en los ejemplos', () => {
    expect(detectKnowledgeDomains('convocatorias para dramaturgos')).toEqual(['Oportunidades'])
    expect(detectKnowledgeDomains('festivales de teatro en barcelona')).toEqual(['Organizaciones'])
    expect(detectKnowledgeDomains('trayectoria de una compania')).toEqual(['Trayectoria'])
  })

  it('sin nucleo previo, una palabra clave tras preposicion si abre dominio', () => {
    expect(detectKnowledgeDomains('busco algo en teatro')).toEqual(['Organizaciones'])
    expect(detectKnowledgeDomains('trabajo con actores')).toEqual(['Personas'])
  })

  it('el limite de clausula corta la subordinacion: tras un signo, la preposicion deja de regir', () => {
    expect(detectKnowledgeDomains('que obras tienes? y actores?')).toEqual(['Personas', 'Obras'])
  })

  it('exige limite de palabra: ya no confunde una clave dentro de otra palabra', () => {
    expect(detectKnowledgeDomains('una maniobra complicada')).toEqual([])
    expect(detectKnowledgeDomains('me sobra tiempo')).toEqual([])
  })

  it('tolera la flexion del castellano sin recurrir a subcadena', () => {
    expect(detectKnowledgeDomains('obras')).toEqual(['Obras'])
    expect(detectKnowledgeDomains('actores')).toEqual(['Personas'])
    expect(detectKnowledgeDomains('festivales')).toEqual(['Organizaciones'])
    expect(detectKnowledgeDomains('companias')).toEqual(['Organizaciones'])
    expect(detectKnowledgeDomains('instituciones')).toEqual(['Organizaciones'])
  })

  it('el orden de salida es el de declaracion, nunca el de aparicion en el texto', () => {
    expect(detectKnowledgeDomains('castings y obras')).toEqual(['Obras', 'Oportunidades'])
    expect(detectKnowledgeDomains('obras y castings')).toEqual(['Obras', 'Oportunidades'])
  })

  it('es determinista', () => {
    const frase = 'teneis alguna obra corta para pocos actores?'
    expect(detectKnowledgeDomains(frase)).toEqual(detectKnowledgeDomains(frase))
  })
})
