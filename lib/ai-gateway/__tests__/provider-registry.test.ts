import { describe, it, expect } from 'vitest'
import { findProviderAdapter } from '../provider-registry'

describe('findProviderAdapter', () => {
  it('encuentra el adaptador registrado para "openai"', () => {
    const adapter = findProviderAdapter('openai')

    expect(adapter).not.toBeNull()
    expect(adapter?.providerId).toBe('openai')
  })

  it('devuelve null para un proveedor no registrado', () => {
    expect(findProviderAdapter('proveedor-inexistente')).toBeNull()
  })
})
