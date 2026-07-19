import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listActivityHistory as fetchActivityHistory } from '@/lib/repository-layer'
import { listActivityHistory } from '../list-activity-history'

vi.mock('@/lib/repository-layer', () => ({
  listActivityHistory: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(fetchActivityHistory).mockReset()
})

describe('listActivityHistory (Procesos Asíncronos)', () => {
  it('delega en Repository Layer y propaga el resultado en el mismo orden recibido', async () => {
    const rows = [
      { id: 'a1', profileId: 'profile-1', responseType: 'RESPONSE_DIRECT' as const, occurredAt: '2026-07-17T10:00:00Z' },
      { id: 'a2', profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS' as const, occurredAt: '2026-07-17T11:00:00Z' },
    ]
    vi.mocked(fetchActivityHistory).mockResolvedValue(rows)

    const result = await listActivityHistory('profile-1', 5)

    expect(fetchActivityHistory).toHaveBeenCalledWith('profile-1', 5)
    expect(result).toEqual(rows)
  })

  it('permite invocarse sin límite explícito', async () => {
    vi.mocked(fetchActivityHistory).mockResolvedValue([])

    await listActivityHistory('profile-1')

    expect(fetchActivityHistory).toHaveBeenCalledWith('profile-1', undefined)
  })
})
