import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recordActivity as persistActivity } from '@/lib/repository-layer'
import { recordActivity } from '../record-activity'

vi.mock('@/lib/repository-layer', () => ({
  recordActivity: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(persistActivity).mockReset()
})

describe('recordActivity (Procesos Asíncronos)', () => {
  it('delega en Repository Layer con los datos recibidos y devuelve true si tuvo éxito', async () => {
    vi.mocked(persistActivity).mockResolvedValue(undefined)

    const result = await recordActivity({ profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS' })

    expect(persistActivity).toHaveBeenCalledWith('profile-1', 'RESPONSE_SUCCESS')
    expect(result).toBe(true)
  })

  it('nunca lanza excepción: devuelve false si Repository Layer falla', async () => {
    vi.mocked(persistActivity).mockRejectedValue(new Error('boom'))

    const result = await recordActivity({ profileId: 'profile-1', responseType: 'RESPONSE_ERROR' })

    expect(result).toBe(false)
  })
})
