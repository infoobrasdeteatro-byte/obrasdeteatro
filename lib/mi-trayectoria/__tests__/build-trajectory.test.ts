import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listActivityHistory } from '@/lib/procesos-asincronos'
import { buildTrajectory } from '../build-trajectory'

vi.mock('@/lib/procesos-asincronos', () => ({
  listActivityHistory: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(listActivityHistory).mockReset()
})

describe('buildTrajectory', () => {
  it('construye la interpretación a partir del historial completo (semántica de historial, no de cola)', async () => {
    const history = [
      { id: 'a1', profileId: 'profile-1', responseType: 'RESPONSE_DIRECT' as const, occurredAt: '2026-07-17T10:00:00Z' },
      { id: 'a2', profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS' as const, occurredAt: '2026-07-17T11:00:00Z' },
    ]
    vi.mocked(listActivityHistory).mockResolvedValue(history)

    const trajectory = await buildTrajectory('profile-1')

    expect(listActivityHistory).toHaveBeenCalledWith('profile-1')
    expect(trajectory.profileId).toBe('profile-1')
    expect(trajectory.entries).toEqual([
      { occurredAt: '2026-07-17T10:00:00Z', category: 'RESPONSE_DIRECT' },
      { occurredAt: '2026-07-17T11:00:00Z', category: 'RESPONSE_SUCCESS' },
    ])
    expect(trajectory.summary.totalEntries).toBe(2)
    expect(typeof trajectory.generatedAt).toBe('string')
  })

  it('devuelve una trayectoria vacía y coherente cuando no hay actividad registrada todavía', async () => {
    vi.mocked(listActivityHistory).mockResolvedValue([])

    const trajectory = await buildTrajectory('profile-nuevo')

    expect(trajectory.entries).toEqual([])
    expect(trajectory.summary).toEqual({
      totalEntries: 0,
      firstActivityAt: null,
      lastActivityAt: null,
      countByCategory: {},
    })
  })
})
