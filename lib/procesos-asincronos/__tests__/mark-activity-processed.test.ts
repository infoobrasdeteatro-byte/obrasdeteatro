import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markActivityProcessed as persistProcessed } from '@/lib/repository-layer'
import { markActivityProcessed } from '../mark-activity-processed'

vi.mock('@/lib/repository-layer', () => ({
  markActivityProcessed: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(persistProcessed).mockReset()
})

describe('markActivityProcessed (Procesos Asíncronos)', () => {
  it('delega en Repository Layer con el id recibido', async () => {
    vi.mocked(persistProcessed).mockResolvedValue(undefined)

    await markActivityProcessed('activity-1')

    expect(persistProcessed).toHaveBeenCalledWith('activity-1')
  })

  it('propaga el error si Repository Layer falla', async () => {
    vi.mocked(persistProcessed).mockRejectedValue(new Error('boom'))

    await expect(markActivityProcessed('activity-1')).rejects.toThrow(/boom/)
  })
})
