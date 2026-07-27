import { describe, it, expect } from 'vitest'
import { buildDecisionRationale } from '../rationale'

describe('buildDecisionRationale', () => {
  it('explica la necesidad de IA cuando el modo es IA, con el coste estimado real', () => {
    const result = buildDecisionRationale('IA', 'media', 0.5, 1)
    expect(result).toContain('IA necesaria')
    expect(result).toContain('Prioridad: media')
    expect(result).toContain('Coste estimado: 1 unidad(es) ScenaIA (estrategia inicial IA-004)')
    expect(result).toContain('Confianza de la decision: 0.5')
  })

  it('explica la ausencia de necesidad de IA cuando el modo es DIRECTO, sin coste aplicable', () => {
    const result = buildDecisionRationale('DIRECTO', 'baja', 1, null)
    expect(result).toContain('IA no necesaria')
    expect(result).toContain('Coste estimado: no aplica (no se requiere IA)')
  })
})
