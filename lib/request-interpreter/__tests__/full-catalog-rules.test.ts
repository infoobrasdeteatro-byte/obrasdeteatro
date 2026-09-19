import { describe, it, expect } from 'vitest'
import { detectFullCatalogRequest } from '../full-catalog-rules'
import { normalizeText } from '../normalize-text'

function pideCatalogoCompleto(texto: string): boolean {
  return detectFullCatalogRequest(normalizeText(texto))
}

describe('detectFullCatalogRequest — expresiones de la lista cerrada', () => {
  it('reconoce cada expresion, con y sin tildes', () => {
    for (const consulta of [
      'todas las obras',
      'todas las piezas',
      'todo el catálogo',
      'todo el catalogo',
      'toda la biblioteca',
      'todo el repertorio',
      'el catálogo completo',
      'el catalogo completo',
      'cualquier obra',
      'cualquier pieza',
      'sin filtros',
      'sin criterios',
    ]) {
      expect(pideCatalogoCompleto(consulta), consulta).toBe(true)
    }
  })

  it('reconoce la expresion dentro de una peticion sin criterios propios', () => {
    for (const consulta of [
      'dame una lista de todas las obras',
      'Muéstrame todas las obras',
      'dame todo el catálogo',
      '¿y cualquier obra?',
      'Sin filtros, ¿qué obras tienes?',
      'quiero ver el catálogo completo, por favor',
    ]) {
      expect(pideCatalogoCompleto(consulta), consulta).toBe(true)
    }
  })
})

describe('detectFullCatalogRequest — ante la duda, no actua', () => {
  it('no actua si la peticion trae un criterio propio', () => {
    for (const consulta of [
      'todas las obras cortas',
      'cualquier obra corta',
      'todas las obras de Lorca',
      'todas las comedias',
      'todo el catálogo para tres actores',
      'sin filtros, obras infantiles',
    ]) {
      expect(pideCatalogoCompleto(consulta), consulta).toBe(false)
    }
  })

  it('no actua sin una expresion de la lista', () => {
    for (const consulta of [
      '¿y alguna más corta?',
      'obras de todo tipo de Lorca',
      '¿qué obras tienes?',
      'dame la lista',
      'todas',
      'dame todas',
    ]) {
      expect(pideCatalogoCompleto(consulta), consulta).toBe(false)
    }
  })
})
