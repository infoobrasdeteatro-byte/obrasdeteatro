import { describe, it, expect } from 'vitest'
import { normalizeText } from '../normalize-text'

describe('normalizeText', () => {
  it('recorta espacios, pasa a minusculas y colapsa espacios internos', () => {
    expect(normalizeText('  Hola   Mundo  ')).toBe('hola mundo')
  })

  it('elimina diacriticos', () => {
    expect(normalizeText('¿Qué Audición hay en el Teatro Español?')).toBe('¿que audicion hay en el teatro espanol?')
  })

  it('devuelve cadena vacia para entrada vacia o solo espacios', () => {
    expect(normalizeText('')).toBe('')
    expect(normalizeText('    ')).toBe('')
  })
})
