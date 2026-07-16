import { describe, it, expect } from 'vitest'
import { buildDecisionRationale } from '../rationale'

describe('buildDecisionRationale', () => {
  it('explica la necesidad de IA cuando el modo es IA', () => {
    const result = buildDecisionRationale('IA', 'media', 0.5)
    expect(result).toContain('IA necesaria')
    expect(result).toContain('Prioridad: media')
    expect(result).toContain('Coste estimado: no disponible (IA-004')
    expect(result).toContain('Confianza de la decision: 0.5')
  })

  it('explica la ausencia de necesidad de IA cuando el modo es DIRECTO', () => {
    const result = buildDecisionRationale('DIRECTO', 'baja', 1)
    expect(result).toContain('IA no necesaria')
  })
})
