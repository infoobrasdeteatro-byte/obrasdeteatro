import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPublishedWorkAuthors, listOrganizationLocations, listPersonLocations } from '@/lib/repository-layer'
import { listWorkKnowledge } from '../works-knowledge'
import { listOrganizationKnowledge } from '../organizations-knowledge'
import { listPersonKnowledge } from '../persons-knowledge'
import { interpretWorkQuery } from '../interpret-work-query'
import { retrieveRelevantKnowledge } from '../semantic-retriever'

// Solo se simulan los accesores a persistencia. La normalizacion de
// ubicaciones es una funcion pura del mismo barril y se usa REAL: simularla
// falsearia justamente lo que estos tests comprueban.
vi.mock('@/lib/repository-layer', async () => {
  const { normalizeLocationValue, resolveLocationVariants } = await import('@/lib/repository-layer/location-normalization')

  return {
    normalizeLocationValue,
    resolveLocationVariants,
    listPublishedWorkAuthors: vi.fn(),
    listOrganizationLocations: vi.fn(),
    listPersonLocations: vi.fn(),
  }
})
vi.mock('../works-knowledge', () => ({ listWorkKnowledge: vi.fn() }))
vi.mock('../organizations-knowledge', () => ({ listOrganizationKnowledge: vi.fn() }))
vi.mock('../persons-knowledge', () => ({ listPersonKnowledge: vi.fn() }))
vi.mock('../interpret-work-query', () => ({
  interpretWorkQuery: vi.fn(),
  hasUnresolvedAuthor: vi.fn(() => false),
  resolveWorkOccupancy: vi.fn(() => ({})),
}))

beforeEach(() => {
  vi.mocked(listPublishedWorkAuthors).mockReset()
  vi.mocked(listOrganizationLocations).mockReset().mockResolvedValue({ regions: ['Canarias'], cities: ['Madrid'] })
  vi.mocked(listWorkKnowledge).mockReset()
  vi.mocked(listOrganizationKnowledge).mockReset()
  vi.mocked(listPersonKnowledge).mockReset().mockResolvedValue([])
  // Catalogo REAL de personas, con su suciedad intacta: el mismo que
  // devolveria `listPersonLocations()` sobre los datos actuales.
  vi.mocked(listPersonLocations).mockReset().mockResolvedValue({
    regions: ['Canarias'],
    cities: ['tenerife ', 'Tenerife'],
  })
  vi.mocked(interpretWorkQuery).mockReset()
})

describe('retrieveRelevantKnowledge', () => {
  it('para Obras: obtiene autores conocidos, interpreta la consulta y traslada el criterio ya resuelto (SCENAIA-002C)', async () => {
    const items = [{ domain: 'Obras' as const, data: { id: 'w1' } as never, provenance: { authority: 'CATALOGO_PROPIO' as const, sourceName: null, sourceUrl: null, observedAt: 'T', validUntil: null }, functions: [] }]
    vi.mocked(listPublishedWorkAuthors).mockResolvedValue(['Federico García Lorca'])
    vi.mocked(interpretWorkQuery).mockReturnValue({ author: 'Federico García Lorca' })
    vi.mocked(listWorkKnowledge).mockResolvedValue(items)

    const result = await retrieveRelevantKnowledge('Obras', 'obras de lorca', 5)

    expect(listPublishedWorkAuthors).toHaveBeenCalled()
    expect(interpretWorkQuery).toHaveBeenCalledWith('obras de lorca', ['Federico García Lorca'], {})
    expect(listWorkKnowledge).toHaveBeenCalledWith({ author: 'Federico García Lorca' }, 5)
    expect(result.items).toBe(items)
    expect(result.requestWasNarrowed).toBe(true)
    expect(listOrganizationKnowledge).not.toHaveBeenCalled()
  })

  it('para Obras: requestWasNarrowed es false cuando interpretWorkQuery no reconoce ningun criterio (SCENAIA-002, correccion definitiva de Caso 1)', async () => {
    vi.mocked(listPublishedWorkAuthors).mockResolvedValue(['Lope de Vega', 'Pedro Calderón de la Barca'])
    vi.mocked(interpretWorkQuery).mockReturnValue({})
    vi.mocked(listWorkKnowledge).mockResolvedValue([])

    const result = await retrieveRelevantKnowledge('Obras', 'obras de federico garcia lorca')

    expect(result.requestWasNarrowed).toBe(false)
  })

  it('Organizaciones ya no ignora query: interpreta el criterio contra las ubicaciones reales', async () => {
    vi.mocked(listOrganizationKnowledge).mockResolvedValue([])

    const result = await retrieveRelevantKnowledge('Organizaciones', 'que companias hay en madrid?')

    expect(listOrganizationKnowledge).toHaveBeenCalledWith({ type: 'company', city: 'Madrid' }, undefined)
    expect(result.requestWasNarrowed).toBe(true)
  })

  it('nunca lanza excepción para un dominio todavía no cubierto', async () => {
    // 'Personas' dejo de servir como ejemplo: quedo cubierto en la Fase
    // Personas (pasos 1-3). Se usa 'Editorial', que sigue sin motor.
    const result = await retrieveRelevantKnowledge('Editorial', 'texto')

    expect(result.items).toEqual([])
    expect(result.requestWasNarrowed).toBe(false)
    expect(result.unappliedCriteria).toEqual([])
  })

  it('para Personas: el tipo pedido llega como criterio real hasta Knowledge Assets', async () => {
    vi.mocked(listPersonKnowledge).mockResolvedValue([])

    const result = await retrieveRelevantKnowledge('Personas', 'que dramaturgos hay?', 5)

    expect(listPersonLocations).toHaveBeenCalled()
    expect(listPersonKnowledge).toHaveBeenCalledWith({ profileType: 'dramaturgo' }, 5)
    expect(result.requestWasNarrowed).toBe(true)
    expect(result.unappliedCriteria).toEqual([])
  })

  it('para Personas: una peticion sin ningun criterio sigue enumerando, sin advertencia falsa', async () => {
    vi.mocked(listPersonKnowledge).mockResolvedValue([])

    const result = await retrieveRelevantKnowledge('Personas', 'quien hay en la plataforma?', 5)

    expect(listPersonKnowledge).toHaveBeenCalledWith({}, 5)
    expect(result.requestWasNarrowed).toBe(false)
    expect(result.unappliedCriteria).toEqual([])
  })

  it('propaga el límite recibido hasta la enumeración final de Obras', async () => {
    vi.mocked(listPublishedWorkAuthors).mockResolvedValue([])
    vi.mocked(interpretWorkQuery).mockReturnValue({})
    vi.mocked(listWorkKnowledge).mockResolvedValue([])

    await retrieveRelevantKnowledge('Obras', 'texto', 5)

    expect(listWorkKnowledge).toHaveBeenCalledWith({}, 5)
  })
})

describe('retrieveRelevantKnowledge — Organizaciones con motor de criterios', () => {
  it('transporta el criterio interpretado hasta Knowledge Assets', async () => {
    vi.mocked(listOrganizationKnowledge).mockResolvedValue([])

    await retrieveRelevantKnowledge('Organizaciones', 'que festivales hay en espana?')

    expect(listOrganizationKnowledge).toHaveBeenCalledWith({ type: 'festival', countryCode: 'ES' }, undefined)
  })

  it('requestWasNarrowed es true cuando se reconocio algun criterio real', async () => {
    vi.mocked(listOrganizationKnowledge).mockResolvedValue([])

    const result = await retrieveRelevantKnowledge('Organizaciones', 'que festivales hay?')

    expect(result.requestWasNarrowed).toBe(true)
  })

  it('10) requestWasNarrowed es false cuando el lugar pedido no existe en el catalogo: no se inventa ubicacion', async () => {
    vi.mocked(listOrganizationKnowledge).mockResolvedValue([])

    const result = await retrieveRelevantKnowledge('Organizaciones', 'que organizaciones hay en cuenca?')

    expect(result.requestWasNarrowed).toBe(false)
    expect(listOrganizationKnowledge).toHaveBeenCalledWith({}, undefined)
  })
})

describe('retrieveRelevantKnowledge — Personas con motor de criterios', () => {
  it('resuelve la ciudad contra el catalogo real y la traslada en forma canonica', async () => {
    vi.mocked(listPersonKnowledge).mockResolvedValue([])

    const result = await retrieveRelevantKnowledge('Personas', 'que directores hay en tenerife?')

    expect(listPersonKnowledge).toHaveBeenCalledWith({ profileType: 'director', city: 'tenerife' }, undefined)
    expect(result.requestWasNarrowed).toBe(true)
    expect(result.unappliedCriteria).toEqual([])
  })

  it('una ubicacion que ninguna persona tiene NO se convierte en criterio, pero SI se declara pendiente', async () => {
    vi.mocked(listPersonKnowledge).mockResolvedValue([])

    const result = await retrieveRelevantKnowledge('Personas', 'que directores hay en cuenca?')

    // El criterio de tipo si se aplica; la ubicacion no. Criterio PARCIAL.
    expect(listPersonKnowledge).toHaveBeenCalledWith({ profileType: 'director' }, undefined)
    expect(result.requestWasNarrowed).toBe(true)
    expect(result.unappliedCriteria).toEqual(['ubicacion'])
  })

  it('pedir SOLO una ubicacion inexistente deja el cuarto estado: nada acotado, algo pendiente', async () => {
    vi.mocked(listPersonKnowledge).mockResolvedValue([])

    const result = await retrieveRelevantKnowledge('Personas', 'hay alguien en cuenca?')

    expect(result.requestWasNarrowed).toBe(false)
    expect(result.unappliedCriteria).toEqual(['ubicacion'])
  })

  it('un tipo de ORGANIZACION nunca se convierte en criterio de Personas', async () => {
    vi.mocked(listPersonKnowledge).mockResolvedValue([])

    await retrieveRelevantKnowledge('Personas', 'que companias hay?')

    expect(listPersonKnowledge).toHaveBeenCalledWith({}, undefined)
  })

  it('Personas y Organizaciones no comparten vocabulario ni motor: cada dominio consulta el suyo', async () => {
    vi.mocked(listPersonKnowledge).mockResolvedValue([])

    await retrieveRelevantKnowledge('Personas', 'que actores hay en tenerife?')

    expect(listOrganizationKnowledge).not.toHaveBeenCalled()
    expect(listOrganizationLocations).not.toHaveBeenCalled()
    expect(listWorkKnowledge).not.toHaveBeenCalled()
  })
})
