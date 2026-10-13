import { describe, it, expect } from 'vitest'
import { agregarActividad, enlaceActividad, paisInicial } from '../actividad'
import { PAISES, PUNTOS } from '../mapa-geo'
import { COUNTRIES } from '@/lib/geo/countries'

describe('actividad por país', () => {
  const filas = [
    { tipo: 'espacios', pais: 'ES', total: 138 },
    { tipo: 'profesionales', pais: 'ES', total: 7 },
    { tipo: 'castings', pais: 'España', total: 1 },
    { tipo: 'castings', pais: 'México', total: 2 },
    { tipo: 'noticias', pais: 'US', total: 9 },
    { tipo: 'otra', pais: 'AR', total: 5 },
  ]

  it('los 20 países, con ceros; castings por nombre; ignora lo que no es del ámbito', () => {
    const r = agregarActividad(filas)
    expect(r).toHaveLength(20)
    const es = r.find(p => p.code === 'ES')!
    expect(es).toMatchObject({ espacios: 138, profesionales: 7, castings: 1, total: 146 })
    expect(r.find(p => p.code === 'MX')!.castings).toBe(2)
    expect(r.find(p => p.code === 'AR')!.total).toBe(0)
  })

  it('enlaces a los listados filtrados', () => {
    const mx = { code: 'MX', nombre: 'México' }
    expect(enlaceActividad('profesionales', mx)).toBe('/directorio?pais=MX')
    expect(enlaceActividad('castings', mx)).toBe('/castings?pais=M%C3%A9xico')
    expect(enlaceActividad('convocatorias', mx)).toBe('/convocatoria?pais=MX')
    expect(enlaceActividad('espacios', mx)).toBe('/espacios?pais=MX')
    expect(enlaceActividad('noticias', mx)).toBe('/noticias?pais=MX')
  })

  it('país inicial: el de más actividad, o España', () => {
    expect(paisInicial(agregarActividad(filas))).toBe('ES')
    expect(paisInicial(agregarActividad([{ tipo: 'espacios', pais: 'CL', total: 3 }]))).toBe('CL')
    expect(paisInicial(null)).toBe('ES')
  })

  it('la geometría tiene silueta y capital para los 20', () => {
    for (const c of COUNTRIES) {
      expect(PAISES[c.code]?.length, c.code).toBeGreaterThan(10)
      expect(PUNTOS[c.code], c.code).toHaveLength(2)
    }
  })
})
