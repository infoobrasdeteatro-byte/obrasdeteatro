import { describe, it, expect } from 'vitest'
import { parseAuthorizedLimit } from '../parse-authorized-limit'

describe('parseAuthorizedLimit', () => {
  it('interpreta una cadena numerica plana como limite valido', () => {
    expect(parseAuthorizedLimit('30')).toBe(30)
    expect(parseAuthorizedLimit('0')).toBe(0)
    expect(parseAuthorizedLimit(' 30 ')).toBe(30)
  })

  it('devuelve null para null', () => {
    expect(parseAuthorizedLimit(null)).toBeNull()
  })

  it('devuelve null para cadena vacia o solo espacios (no es un limite real de cero)', () => {
    expect(parseAuthorizedLimit('')).toBeNull()
    expect(parseAuthorizedLimit('   ')).toBeNull()
  })

  it('devuelve null para representaciones no numericas (p.ej. nombre de plan)', () => {
    expect(parseAuthorizedLimit('premium')).toBeNull()
  })

  it('devuelve null para valores no finitos o negativos', () => {
    expect(parseAuthorizedLimit('Infinity')).toBeNull()
    expect(parseAuthorizedLimit('-5')).toBeNull()
  })
})
