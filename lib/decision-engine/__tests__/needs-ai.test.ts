import { describe, it, expect } from 'vitest'
import { needsAI } from '../needs-ai'

describe('needsAI', () => {
  it('devuelve false cuando el conocimiento recuperado esta completo', () => {
    expect(needsAI('completo')).toBe(false)
  })

  it('devuelve true cuando el conocimiento recuperado es parcial o vacio', () => {
    expect(needsAI('parcial')).toBe(true)
    expect(needsAI('vacio')).toBe(true)
  })
})
