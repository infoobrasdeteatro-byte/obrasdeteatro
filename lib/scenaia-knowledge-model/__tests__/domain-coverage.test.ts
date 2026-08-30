import { describe, it, expect } from 'vitest'
import { isDomainCovered } from '../domain-coverage'

describe('isDomainCovered', () => {
  it('reconoce Obras y Organizaciones como cubiertos', () => {
    expect(isDomainCovered('Obras')).toBe(true)
    expect(isDomainCovered('Organizaciones')).toBe(true)
  })

  // 'Personas' salio de esta lista al quedar cubierto en la Fase Personas
  // (pasos 1-3 autorizados): profiles -> Repository Layer -> persons-knowledge.
  it('reconoce los 5 dominios restantes como no cubiertos', () => {
    const uncovered: Array<Parameters<typeof isDomainCovered>[0]> = [
      'Oportunidades',
      'Editorial',
      'Relaciones',
      'Trayectoria',
      'Inteligencia',
    ]
    for (const domain of uncovered) {
      expect(isDomainCovered(domain)).toBe(false)
    }
  })
})
