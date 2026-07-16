import { describe, it, expect } from 'vitest'
import { buildSubscriptionSection } from '../subscription-section'

describe('buildSubscriptionSection', () => {
  it('produce siempre las 4 propiedades como no disponible (IA-001 diferida)', () => {
    expect(buildSubscriptionSection()).toEqual({
      plan: null,
      status: null,
      availableCapabilities: null,
      usageLimits: null,
    })
  })
})
