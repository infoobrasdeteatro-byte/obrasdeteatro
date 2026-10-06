import { describe, it, expect } from 'vitest'
import { cambiosDeEdicion, fechaEnMadrid, validarEdicion, type CamposEdicion } from '../edicion'

const AHORA = new Date('2026-10-06T10:00:00Z')

const CAMPOS: CamposEdicion = {
  title: 'Residencia de dramaturgia',
  description: 'Resumen propio de la convocatoria.',
  category: 'residencia',
  pais_code: 'MX',
  ciudad: 'Oaxaca',
  fecha_limite: '2026-11-30',
}

describe('edición de una convocatoria de la Redacción', () => {
  it('válida: sin problemas', () => {
    expect(validarEdicion(CAMPOS, AHORA)).toBeNull()
  })

  it('fecha de hoy o pasada: no se admite', () => {
    expect(validarEdicion({ ...CAMPOS, fecha_limite: '2026-10-06' }, AHORA)).toMatch(/posterior a hoy/)
  })

  it('país fuera del ámbito o categoría desconocida: no se admite', () => {
    expect(validarEdicion({ ...CAMPOS, pais_code: 'US' }, AHORA)).toMatch(/país/)
    expect(validarEdicion({ ...CAMPOS, category: 'casting' }, AHORA)).toMatch(/categoría/)
  })

  it('el UPDATE nunca lleva estado y guarda la fecha como fin del día en Madrid', () => {
    const cambios = cambiosDeEdicion({ ...CAMPOS, ciudad: '  ' })
    expect(cambios).not.toHaveProperty('estado')
    expect(cambios.ciudad).toBeNull()
    expect(cambios.deadline).toBe('2026-11-30T23:59:59+01:00')
  })

  it('la fecha guardada se muestra como el día de Madrid', () => {
    expect(fechaEnMadrid('2026-11-30T22:59:59Z')).toBe('2026-11-30')
  })
})
