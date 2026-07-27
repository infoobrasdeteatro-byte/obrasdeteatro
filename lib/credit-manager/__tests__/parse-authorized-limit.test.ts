import { describe, it, expect } from 'vitest'
import { parseAuthorizedLimit } from '../parse-authorized-limit'

describe('parseAuthorizedLimit', () => {
  it('interpreta una cadena numerica plana como limite valido', () => {
    expect(parseAuthorizedLimit('30')).toEqual({ kind: 'LIMITADO', value: 30 })
    expect(parseAuthorizedLimit('0')).toEqual({ kind: 'LIMITADO', value: 0 })
    expect(parseAuthorizedLimit(' 30 ')).toEqual({ kind: 'LIMITADO', value: 30 })
  })

  it('interpreta el literal ILIMITADO como plan sin control de cuota (IA-AUTH-001, PRD-001)', () => {
    expect(parseAuthorizedLimit('ILIMITADO')).toEqual({ kind: 'ILIMITADO' })
    expect(parseAuthorizedLimit(' ILIMITADO ')).toEqual({ kind: 'ILIMITADO' })
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
