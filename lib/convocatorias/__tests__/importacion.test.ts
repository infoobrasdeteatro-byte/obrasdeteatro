import { describe, it, expect } from 'vitest'
import { esFechaValida, estaVencida, finDelDiaEnMadrid, hoyEnMadrid } from '../importacion'

describe('fechas de la importación (Europe/Madrid)', () => {
  it('fin del día respeta el horario de verano y el de invierno', () => {
    expect(finDelDiaEnMadrid('2027-07-15')).toBe('2027-07-15T23:59:59+02:00')
    expect(finDelDiaEnMadrid('2027-01-15')).toBe('2027-01-15T23:59:59+01:00')
  })

  it('hoy en Madrid: a las 23:30 UTC del 31 de diciembre ya es 1 de enero', () => {
    expect(hoyEnMadrid(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01')
  })

  it('vencida = hoy o antes; mañana no lo está', () => {
    const ahora = new Date('2026-10-06T10:00:00Z')
    expect(estaVencida('2026-10-05', ahora)).toBe(true)
    expect(estaVencida('2026-10-06', ahora)).toBe(true)
    expect(estaVencida('2026-10-07', ahora)).toBe(false)
  })

  it('solo fechas YYYY-MM-DD que existen', () => {
    expect(esFechaValida('2027-02-28')).toBe(true)
    expect(esFechaValida('2027-02-30')).toBe(false)
    expect(esFechaValida('28-02-2027')).toBe(false)
  })
})
