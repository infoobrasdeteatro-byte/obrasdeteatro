import { describe, it, expect } from 'vitest'
import { isDomainCovered } from '../domain-coverage'

describe('isDomainCovered', () => {
  it('reconoce Obras y Organizaciones como cubiertos', () => {
    expect(isDomainCovered('Obras')).toBe(true)
    expect(isDomainCovered('Organizaciones')).toBe(true)
  })

  it('reconoce los 6 dominios restantes como no cubiertos', () => {
    const uncovered: Array<Parameters<typeof isDomainCovered>[0]> = [
      'Personas',
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
