import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listWorkKnowledge } from '../works-knowledge'
import { listOrganizationKnowledge } from '../organizations-knowledge'
import { retrieveRelevantKnowledge } from '../semantic-retriever'

vi.mock('../works-knowledge', () => ({ listWorkKnowledge: vi.fn() }))
vi.mock('../organizations-knowledge', () => ({ listOrganizationKnowledge: vi.fn() }))

beforeEach(() => {
  vi.mocked(listWorkKnowledge).mockReset()
  vi.mocked(listOrganizationKnowledge).mockReset()
})

describe('retrieveRelevantKnowledge', () => {
  it('degrada a la enumeración existente de Obras, ignorando query (sin motor real, IA-003)', async () => {
    const items = [{ domain: 'Obras' as const, data: { id: 'w1' } as never }]
    vi.mocked(listWorkKnowledge).mockResolvedValue(items)

    const result = await retrieveRelevantKnowledge('Obras', 'cualquier texto de consulta')

    expect(result).toBe(items)
    expect(listOrganizationKnowledge).not.toHaveBeenCalled()
  })

  it('degrada a la enumeración existente de Organizaciones, ignorando query', async () => {
    const items = [{ domain: 'Organizaciones' as const, data: { id: 'o1' } as never }]
    vi.mocked(listOrganizationKnowledge).mockResolvedValue(items)

    const result = await retrieveRelevantKnowledge('Organizaciones', 'cualquier texto de consulta')

    expect(result).toBe(items)
    expect(listWorkKnowledge).not.toHaveBeenCalled()
  })

  it('nunca lanza excepción para un dominio todavía no cubierto', async () => {
    const result = await retrieveRelevantKnowledge('Personas', 'texto')

    expect(result).toEqual([])
  })

  it('propaga el límite recibido a la enumeración subyacente', async () => {
    vi.mocked(listWorkKnowledge).mockResolvedValue([])

    await retrieveRelevantKnowledge('Obras', 'texto', 5)

    expect(listWorkKnowledge).toHaveBeenCalledWith(5)
  })
})
