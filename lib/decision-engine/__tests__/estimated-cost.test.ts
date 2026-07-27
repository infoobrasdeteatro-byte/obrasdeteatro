import { describe, it, expect } from 'vitest'
import { estimateCost } from '../estimated-cost'

describe('estimateCost', () => {
  it('devuelve 1 unidad ScenaIA cuando se necesita IA (estrategia inicial IA-004)', () => {
    expect(estimateCost(true)).toBe(1)
  })

  it('devuelve null cuando no se necesita IA (no aplica ninguna operacion economica)', () => {
    expect(estimateCost(false)).toBeNull()
  })
})
