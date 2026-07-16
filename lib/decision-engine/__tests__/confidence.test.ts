import { describe, it, expect } from 'vitest'
import { estimateDecisionConfidence } from '../confidence'

describe('estimateDecisionConfidence', () => {
  it('devuelve el mínimo entre las dos confianzas recibidas', () => {
    expect(estimateDecisionConfidence(1, 0.5)).toBe(0.5)
    expect(estimateDecisionConfidence(0.5, 1)).toBe(0.5)
    expect(estimateDecisionConfidence(0, 1)).toBe(0)
    expect(estimateDecisionConfidence(1, 1)).toBe(1)
  })
})
