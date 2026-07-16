import { describe, it, expect } from 'vitest'
import { buildSessionSection } from '../session-section'

describe('buildSessionSection', () => {
  it('refleja exclusivamente el estado de la petición en curso, con timestamp propio', () => {
    const before = new Date().toISOString()
    const result = buildSessionSection({ route: '/scenaia', module: 'biblioteca', locale: 'es' })
    const after = new Date().toISOString()

    expect(result.route).toBe('/scenaia')
    expect(result.module).toBe('biblioteca')
    expect(result.locale).toBe('es')
    expect(result.timestamp >= before && result.timestamp <= after).toBe(true)
  })

  it('acepta route/module ausentes como null, sin inventar un valor', () => {
    const result = buildSessionSection({ route: null, module: null, locale: 'es' })

    expect(result.route).toBeNull()
    expect(result.module).toBeNull()
  })
})
