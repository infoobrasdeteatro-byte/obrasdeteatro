import { describe, it, expect } from 'vitest'
import { normalizeLocationValue, resolveLocationVariants } from '../location-normalization'

describe('normalizeLocationValue — forma canonica para comparar', () => {
  it('resuelve las tres suciedades observadas en datos reales', () => {
    expect(normalizeLocationValue('tenerife ')).toBe('tenerife')
    expect(normalizeLocationValue('CAPITAL FEDERAL')).toBe('capital federal')
    expect(normalizeLocationValue('  Comunidad  de   Madrid ')).toBe('comunidad de madrid')
  })

  it('ignora los diacriticos sin destruir la letra', () => {
    expect(normalizeLocationValue('Cádiz')).toBe('cadiz')
    expect(normalizeLocationValue('Bogotá')).toBe('bogota')
    expect(normalizeLocationValue('A Coruña')).toBe('a coruna')
  })

  it('no conoce ninguna geografia: no traduce, no corrige, no completa', () => {
    expect(normalizeLocationValue('Sta. Cruz')).toBe('sta. cruz')
    expect(normalizeLocationValue('CDMX')).toBe('cdmx')
    // "Cuenca" no se convierte en nada distinto de si misma.
    expect(normalizeLocationValue('Cuenca')).toBe('cuenca')
  })

  it('es idempotente y determinista', () => {
    expect(normalizeLocationValue(normalizeLocationValue('tenerife '))).toBe('tenerife')
  })

  it('la cadena vacia sigue siendo vacia: no inventa un valor por defecto', () => {
    expect(normalizeLocationValue('   ')).toBe('')
  })
})

describe('resolveLocationVariants — del criterio canonico a los valores reales', () => {
  const CATALOGO = ['tenerife ', 'Tenerife', 'CAPITAL FEDERAL', 'Cuenca', 'Madrid']

  it('recupera TODAS las variantes de la misma ubicacion, tal cual estan almacenadas', () => {
    expect(resolveLocationVariants('tenerife', CATALOGO).sort()).toEqual(['Tenerife', 'tenerife '])
  })

  it('devuelve el dato ORIGINAL, nunca una version corregida', () => {
    expect(resolveLocationVariants('tenerife', CATALOGO)).toContain('tenerife ')
  })

  it('no arrastra ubicaciones distintas: no hay coincidencia parcial', () => {
    expect(resolveLocationVariants('tenerife', CATALOGO)).not.toContain('Cuenca')
    expect(resolveLocationVariants('capital', CATALOGO)).toEqual([])
    expect(resolveLocationVariants('madr', CATALOGO)).toEqual([])
  })

  it('una ubicacion ausente del catalogo devuelve lista vacia, no el catalogo entero', () => {
    expect(resolveLocationVariants('barcelona', CATALOGO)).toEqual([])
  })

  it('elimina duplicados exactos sin fusionar variantes distintas', () => {
    expect(resolveLocationVariants('tenerife', ['Tenerife', 'Tenerife', 'tenerife '])).toEqual([
      'Tenerife',
      'tenerife ',
    ])
  })

  it('un catalogo vacio no produce ninguna variante', () => {
    expect(resolveLocationVariants('tenerife', [])).toEqual([])
  })

  it('es pura: no modifica el catalogo recibido', () => {
    const catalogo = ['tenerife ', 'Tenerife']
    resolveLocationVariants('tenerife', catalogo)

    expect(catalogo).toEqual(['tenerife ', 'Tenerife'])
  })
})
