import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPendingActivity as fetchPendingActivity } from '@/lib/repository-layer'
import { listPendingActivity } from '../list-pending-activity'

vi.mock('@/lib/repository-layer', () => ({
  listPendingActivity: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(fetchPendingActivity).mockReset()
})

describe('listPendingActivity (Procesos Asíncronos)', () => {
  it('delega en Repository Layer y propaga el resultado en el mismo orden recibido', async () => {
    const rows = [
      { id: 'a1', profileId: 'profile-1', responseType: 'RESPONSE_DIRECT' as const, occurredAt: '2026-07-17T10:00:00Z' },
      { id: 'a2', profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS' as const, occurredAt: '2026-07-17T11:00:00Z' },
    ]
    vi.mocked(fetchPendingActivity).mockResolvedValue(rows)

    const result = await listPendingActivity('profile-1', 5)

    expect(fetchPendingActivity).toHaveBeenCalledWith('profile-1', 5)
    expect(result).toEqual(rows)
  })

  it('permite invocarse sin límite explícito', async () => {
    vi.mocked(fetchPendingActivity).mockResolvedValue([])

    await listPendingActivity('profile-1')

    expect(fetchPendingActivity).toHaveBeenCalledWith('profile-1', undefined)
  })
})
