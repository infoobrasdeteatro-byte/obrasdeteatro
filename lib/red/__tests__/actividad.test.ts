import { describe, expect, it } from 'vitest'
import { textoActividad } from '../actividad'

describe('textoActividad', () => {
  it('un texto por tramo', () => {
    expect(textoActividad('hoy')).toBe('Última actividad: hoy')
    expect(textoActividad('semana')).toBe('Última actividad: esta semana')
    expect(textoActividad('mes')).toBe('Última actividad: este mes')
    expect(textoActividad('antes')).toBe('Última actividad: hace más de un mes')
  })
  it('sin tramo o desconocido: nada', () => {
    expect(textoActividad(null)).toBeNull()
    expect(textoActividad('ayer')).toBeNull()
  })
})
