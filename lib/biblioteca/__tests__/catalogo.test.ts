import { describe, expect, it } from 'vitest'
import {
  formatearMiles, leerFiltrosCatalogo, obraAnonimaAntigua, libreEnTodosLosPaises, OBRAS_POR_PAGINA,
  patronBusqueda, rangoPagina, totalPaginas, urlCatalogo,
} from '../catalogo'

describe('filtros del catálogo', () => {
  it('lee la búsqueda y la página, saneadas', () => {
    expect(leerFiltrosCatalogo({ q: '  Lope   de Vega ', pagina: '3' })).toEqual({ q: 'Lope de Vega', pagina: 3 })
    expect(leerFiltrosCatalogo({ pagina: 'abc' })).toEqual({ q: '', pagina: 1 })
    expect(leerFiltrosCatalogo({ pagina: '-2' }).pagina).toBe(1)
    expect(leerFiltrosCatalogo({ q: 'x'.repeat(200) }).q).toHaveLength(80)
  })

  it('el patrón de búsqueda no deja pasar caracteres que rompan el filtro', () => {
    expect(patronBusqueda('dama boba')).toBe('%dama boba%')
    expect(patronBusqueda('Calderón')).toBe('%calderon%')
    expect(patronBusqueda('a,b(c)%_')).toBe('%a b c%')
    expect(patronBusqueda('  ,() ')).toBeNull()
  })

  it('pagina de 48 en 48', () => {
    expect(rangoPagina(1)).toEqual([0, OBRAS_POR_PAGINA - 1])
    expect(rangoPagina(3)).toEqual([96, 143])
    expect(totalPaginas(4492)).toBe(94)
    expect(totalPaginas(0)).toBe(1)
  })

  it('las URL conservan la búsqueda y omiten la página 1', () => {
    expect(urlCatalogo('', 1)).toBe('/obras#catalogo')
    expect(urlCatalogo('Calderón', 2)).toBe('/obras?q=Calder%C3%B3n&pagina=2#catalogo')
  })
})

describe('dominio público en los 20 países', () => {
  const hoy = new Date('2026-10-20')
  it('libre si el autor murió hace más de 100 años', () => {
    expect(libreEnTodosLosPaises(1635, hoy)).toBe(true)
    expect(libreEnTodosLosPaises(1925, hoy)).toBe(true)
  })
  it('no si murió en 1926 o después, o si no consta', () => {
    expect(libreEnTodosLosPaises(1926, hoy)).toBe(false)
    expect(libreEnTodosLosPaises(1936, hoy)).toBe(false)
    expect(libreEnTodosLosPaises(null, hoy)).toBe(false)
  })
})

it('formatea miles con punto', () => {
  expect(formatearMiles(4492)).toBe('4.492')
  expect(formatearMiles(11)).toBe('11')
})

it('reconoce las obras anónimas antiguas de la BNE', () => {
  expect(obraAnonimaAntigua({ author: 'Anónimo', external_ref: 'bne:a123' })).toBe(true)
  expect(obraAnonimaAntigua({ author: 'Anónimo', external_ref: null })).toBe(false)
  expect(obraAnonimaAntigua({ author: 'Lope de Vega', external_ref: 'bne:a1' })).toBe(false)
})
