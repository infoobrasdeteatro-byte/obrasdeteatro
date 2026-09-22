import { describe, it, expect } from 'vitest'
import { detectPlainListingRequest } from '../plain-listing-rules'
import { normalizeText } from '../normalize-text'
import { normalizeRequest } from '../interpreter'

function pideUnListado(texto: string): boolean {
  return detectPlainListingRequest(normalizeText(texto))
}

describe('detectPlainListingRequest — condición (a): pide un listado', () => {
  it('reconoce las expresiones de listado, con y sin tildes', () => {
    for (const consulta of [
      'dame una lista de todas las obras',
      'dame la lista de obras',
      'dame el listado de obras',
      'enumérame las obras',
      'quiero ver el catálogo',
      'dame todo el catálogo',
      'muéstrame todas las obras',
      'muestrame las obras',
      'enséñame las obras',
      '¿qué obras tienes?',
      '¿qué obras hay?',
      '¿cuántas obras tenéis?',
      'todas las piezas',
      'lístame las obras de Calderón',
    ]) {
      expect(pideUnListado(consulta), consulta).toBe(true)
    }
  })

  it('un verbo suelto NO es una petición de listado: "dame algo" pide una sugerencia', () => {
    for (const consulta of ['dame algo divertido', 'dame una obra para el sábado', 'muéstrame algo', 'quiero ver teatro']) {
      expect(pideUnListado(consulta), consulta).toBe(false)
    }
  })

  it('sin ninguna expresión de listado no se activa', () => {
    for (const consulta of ['obras de Calderón', 'hola, ¿qué tal?', 'teatro infantil', '¿y alguna para tres actores?']) {
      expect(pideUnListado(consulta), consulta).toBe(false)
    }
  })
})

describe('detectPlainListingRequest — condición (b): nada que pida razonar', () => {
  it('cualquier palabra de razonamiento devuelve el turno a la IA, aunque parezca un listado', () => {
    for (const consulta of [
      'recomiéndame una lista de obras',
      'dame la lista de obras que me recomiendas',
      '¿cuál de todas las obras es la mejor?',
      'dame el listado y compáralas',
      'resume todas las obras',
      'explícame el catálogo',
      'dame la lista de las obras más cortas',
      'dame todas las obras con menos actores',
      'dame una lista de obras adecuadas para un instituto',
      '¿qué obras me sugieres?',
      'dame el listado de la mejor obra',
    ]) {
      expect(pideUnListado(consulta), consulta).toBe(false)
    }
  })
})

describe('requestsPlainListing — el campo del contrato', () => {
  const ID = 'turno-de-prueba'

  it('viaja en NormalizedRequest, resuelto solo con el texto del turno', () => {
    expect(normalizeRequest('dame una lista de todas las obras', ID).requestsPlainListing).toBe(true)
    expect(normalizeRequest('recomiéndame una comedia', ID).requestsPlainListing).toBe(false)
  })

  it('no declara nada sobre la IA ni sobre el dominio: solo que el texto pide una lista', () => {
    // "dame el listado", sin nombrar dominio, lleva el campo activo igual:
    // que ese turno acabe o no sin IA lo decide Decision Engine con las
    // otras tres condiciones, no este componente.
    const sinDominio = normalizeRequest('dame el listado', ID)

    expect(sinDominio.requestsPlainListing).toBe(true)
    expect(sinDominio.requestedKnowledgeDomains).toEqual([])
    expect(normalizeRequest('dame el listado de obras', ID).requestsPlainListing).toBe(true)
  })
})
