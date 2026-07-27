import { describe, it, expect } from 'vitest'
import { ProviderAdapterError } from '../provider-adapter'

describe('ProviderAdapterError', () => {
  it('es una instancia de Error, con el mensaje normalizado preservado', () => {
    const error = new ProviderAdapterError('fallo de prueba')

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('fallo de prueba')
  })
})
