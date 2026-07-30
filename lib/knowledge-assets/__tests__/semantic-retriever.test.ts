import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPublishedWorkAuthors } from '@/lib/repository-layer'
import { listWorkKnowledge } from '../works-knowledge'
import { listOrganizationKnowledge } from '../organizations-knowledge'
import { interpretWorkQuery } from '../interpret-work-query'
import { retrieveRelevantKnowledge } from '../semantic-retriever'

vi.mock('@/lib/repository-layer', () => ({ listPublishedWorkAuthors: vi.fn() }))
vi.mock('../works-knowledge', () => ({ listWorkKnowledge: vi.fn() }))
vi.mock('../organizations-knowledge', () => ({ listOrganizationKnowledge: vi.fn() }))
vi.mock('../interpret-work-query', () => ({ interpretWorkQuery: vi.fn() }))

beforeEach(() => {
  vi.mocked(listPublishedWorkAuthors).mockReset()
  vi.mocked(listWorkKnowledge).mockReset()
  vi.mocked(listOrganizationKnowledge).mockReset()
  vi.mocked(interpretWorkQuery).mockReset()
})

describe('retrieveRelevantKnowledge', () => {
  it('para Obras: obtiene autores conocidos, interpreta la consulta y traslada el criterio ya resuelto (SCENAIA-002C)', async () => {
    const items = [{ domain: 'Obras' as const, data: { id: 'w1' } as never }]
    vi.mocked(listPublishedWorkAuthors).mockResolvedValue(['Federico García Lorca'])
    vi.mocked(interpretWorkQuery).mockReturnValue({ author: 'Federico García Lorca' })
    vi.mocked(listWorkKnowledge).mockResolvedValue(items)

    const result = await retrieveRelevantKnowledge('Obras', 'obras de lorca', 5)

    expect(listPublishedWorkAuthors).toHaveBeenCalled()
    expect(interpretWorkQuery).toHaveBeenCalledWith('obras de lorca', ['Federico García Lorca'])
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

  it('degrada a la enumeración existente de Organizaciones, ignorando query (sin motor propio todavía) -- requestWasNarrowed siempre false', async () => {
    const items = [{ domain: 'Organizaciones' as const, data: { id: 'o1' } as never }]
    vi.mocked(listOrganizationKnowledge).mockResolvedValue(items)

    const result = await retrieveRelevantKnowledge('Organizaciones', 'cualquier texto de consulta')

    expect(result.items).toBe(items)
    expect(result.requestWasNarrowed).toBe(false)
    expect(listWorkKnowledge).not.toHaveBeenCalled()
    expect(listPublishedWorkAuthors).not.toHaveBeenCalled()
    expect(interpretWorkQuery).not.toHaveBeenCalled()
  })

  it('nunca lanza excepción para un dominio todavía no cubierto', async () => {
    const result = await retrieveRelevantKnowledge('Personas', 'texto')

    expect(result.items).toEqual([])
    expect(result.requestWasNarrowed).toBe(false)
  })

  it('propaga el límite recibido hasta la enumeración final de Obras', async () => {
    vi.mocked(listPublishedWorkAuthors).mockResolvedValue([])
    vi.mocked(interpretWorkQuery).mockReturnValue({})
    vi.mocked(listWorkKnowledge).mockResolvedValue([])

    await retrieveRelevantKnowledge('Obras', 'texto', 5)

    expect(listWorkKnowledge).toHaveBeenCalledWith({}, 5)
  })
})
