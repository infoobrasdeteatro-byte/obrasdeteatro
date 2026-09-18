import { describe, it, expect } from 'vitest'
import { needsAI } from '../needs-ai'

describe('needsAI', () => {
  it('devuelve true cuando el conocimiento recuperado es parcial o vacio (comportamiento original, sin cambios)', () => {
    expect(needsAI('parcial', 0)).toBe(true)
    expect(needsAI('parcial', 7)).toBe(true)
    expect(needsAI('vacio', 0)).toBe(true)
    expect(needsAI('vacio', 3)).toBe(true)
  })

  it('devuelve false cuando el conocimiento esta completo y no se recupero ninguna entidad: enumerar es la respuesta completa', () => {
    expect(needsAI('completo', 0)).toBe(false)
  })

  it('devuelve true cuando el conocimiento esta completo y si hay entidades recuperadas: enumerarlas no es conversar', () => {
    expect(needsAI('completo', 1)).toBe(true)
    expect(needsAI('completo', 20)).toBe(true)
  })

  it('es puro y determinista: misma entrada, misma salida', () => {
    expect(needsAI('completo', 5)).toBe(needsAI('completo', 5))
    expect(needsAI('completo', 0)).toBe(needsAI('completo', 0))
  })

  it('nunca depende del recuento cuando el conocimiento no esta completo', () => {
    for (const count of [0, 1, 99]) {
      expect(needsAI('parcial', count)).toBe(true)
      expect(needsAI('vacio', count)).toBe(true)
    }
  })
})
