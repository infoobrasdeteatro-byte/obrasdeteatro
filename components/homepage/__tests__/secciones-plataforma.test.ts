import { describe, expect, it } from 'vitest'
import { formatearMiles, textoSeccion } from '../SeccionesPlataforma'

describe('casilla «Espacios escénicos» de la portada', () => {
  it('antepone el total con punto de miles', () => {
    expect(textoSeccion('/espacios', 'Teatros y salas de los 20 países', 3941)).toBe('3.941 teatros y salas de los 20 países')
    expect(formatearMiles(10000)).toBe('10.000')
    expect(formatearMiles(950)).toBe('950')
  })
  it('sin cifra deja el texto de siempre, y no toca las demás casillas', () => {
    expect(textoSeccion('/espacios', 'Teatros y salas de los 20 países', null)).toBe('Teatros y salas de los 20 países')
    expect(textoSeccion('/espacios', 'Teatros y salas de los 20 países', 0)).toBe('Teatros y salas de los 20 países')
    expect(textoSeccion('/castings', 'Audiciones y castings abiertos', 3941)).toBe('Audiciones y castings abiertos')
  })
})
