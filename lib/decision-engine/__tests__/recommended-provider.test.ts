import { describe, it, expect } from 'vitest'
import { selectRecommendedProvider } from '../recommended-provider'

describe('selectRecommendedProvider', () => {
  it('selecciona el primer proveedor del catalogo oficial (IA-OPENAI-001: OpenAI, primer proveedor aprobado)', () => {
    expect(selectRecommendedProvider()).toBe('openai')
  })

  it('selecciona exclusivamente del catalogo recibido, nunca un valor ajeno a el', () => {
    const catalogoDePrueba = [{ id: 'proveedor-prueba', name: 'Proveedor de prueba' }]
    expect(selectRecommendedProvider(catalogoDePrueba)).toBe('proveedor-prueba')
  })

  it('devuelve null cuando el catalogo recibido esta vacio, aunque no sea el catalogo oficial', () => {
    expect(selectRecommendedProvider([])).toBeNull()
  })
})
