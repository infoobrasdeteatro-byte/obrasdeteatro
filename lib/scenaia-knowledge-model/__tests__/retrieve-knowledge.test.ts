import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listWorkKnowledge, listOrganizationKnowledge } from '@/lib/knowledge-assets'
import { retrieveKnowledgeForDomain } from '../retrieve-knowledge'

vi.mock('@/lib/knowledge-assets', () => ({
  listWorkKnowledge: vi.fn(),
  listOrganizationKnowledge: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(listWorkKnowledge).mockReset()
  vi.mocked(listOrganizationKnowledge).mockReset()
})

describe('retrieveKnowledgeForDomain', () => {
  it('delega en listWorkKnowledge para Obras', async () => {
    const items = [{ domain: 'Obras' as const, data: { id: 'w1' } as never }]
    vi.mocked(listWorkKnowledge).mockResolvedValue(items)

    const result = await retrieveKnowledgeForDomain('Obras')

    expect(result).toBe(items)
    expect(listOrganizationKnowledge).not.toHaveBeenCalled()
  })

  it('delega en listOrganizationKnowledge para Organizaciones', async () => {
    const items = [{ domain: 'Organizaciones' as const, data: { id: 'o1' } as never }]
    vi.mocked(listOrganizationKnowledge).mockResolvedValue(items)

    const result = await retrieveKnowledgeForDomain('Organizaciones')

    expect(result).toBe(items)
    expect(listWorkKnowledge).not.toHaveBeenCalled()
  })

  it('devuelve lista vacía para un dominio todavía no cubierto, sin lanzar excepción', async () => {
    const result = await retrieveKnowledgeForDomain('Personas')

    expect(result).toEqual([])
  })
})
