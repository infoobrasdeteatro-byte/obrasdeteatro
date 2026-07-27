import { describe, it, expect, vi, beforeEach } from 'vitest'
import { retrieveRelevantKnowledge } from '@/lib/knowledge-assets'
import { retrieveKnowledgeForDomain } from '../retrieve-knowledge'

vi.mock('@/lib/knowledge-assets', () => ({
  retrieveRelevantKnowledge: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(retrieveRelevantKnowledge).mockReset()
})

describe('retrieveKnowledgeForDomain', () => {
  it('delega en retrieveRelevantKnowledge, transportando el texto de la petición (IA-003)', async () => {
    const items = [{ domain: 'Obras' as const, data: { id: 'w1' } as never }]
    vi.mocked(retrieveRelevantKnowledge).mockResolvedValue(items)

    const result = await retrieveKnowledgeForDomain('Obras', 'una petición de prueba')

    expect(result).toBe(items)
    expect(retrieveRelevantKnowledge).toHaveBeenCalledWith('Obras', 'una petición de prueba')
  })

  it('devuelve lo que Knowledge Assets devuelva para un dominio todavía no cubierto, sin lanzar excepción', async () => {
    vi.mocked(retrieveRelevantKnowledge).mockResolvedValue([])

    const result = await retrieveKnowledgeForDomain('Personas', 'texto')

    expect(result).toEqual([])
  })
})
