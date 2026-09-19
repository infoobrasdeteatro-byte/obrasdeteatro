import { describe, it, expect } from 'vitest'
import { safeNextPath, loginUrlWithNext } from '../next-param'

describe('safeNextPath', () => {
  it.each(['/precios', '/precios?plan=premium', '/cuenta', '/'])('acepta la ruta interna %s', (ruta) => {
    expect(safeNextPath(ruta)).toBe(ruta)
  })

  it.each([
    ['vacío', ''],
    ['null', null],
    ['undefined', undefined],
    ['URL absoluta', 'https://evil.example.com'],
    ['sin barra inicial', 'precios'],
    ['doble barra (otro dominio)', '//evil.example.com'],
    ['barra invertida (otro dominio)', '/\\evil.example.com'],
    ['javascript:', 'javascript:alert(1)'],
    ['salto de línea', '/precios\n//evil.example.com'],
    ['tabulador', '/\t/evil.example.com'],
  ])('rechaza %s', (_caso, valor) => {
    expect(safeNextPath(valor as string | null | undefined)).toBeNull()
  })
})

describe('loginUrlWithNext', () => {
  it('construye el login con la ruta de vuelta codificada', () => {
    expect(loginUrlWithNext('/precios')).toBe('/auth/login?next=%2Fprecios')
  })

  it('con un destino no válido, el login va sin next', () => {
    expect(loginUrlWithNext('https://evil.example.com')).toBe('/auth/login')
  })
})
