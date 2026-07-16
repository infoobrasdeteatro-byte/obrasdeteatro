import { describe, it, expect } from 'vitest'
import { detectKnowledgeDomains } from '../domain-rules'

describe('detectKnowledgeDomains', () => {
  it('detecta un unico dominio por palabra clave', () => {
    expect(detectKnowledgeDomains('quiero ver el casting de la semana')).toEqual(['Oportunidades'])
  })

  it('detecta multiples dominios cuando coinciden varias palabras clave', () => {
    const domains = detectKnowledgeDomains('busco una compania para representar mi obra')
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
