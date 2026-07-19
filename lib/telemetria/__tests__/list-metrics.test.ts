import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listMetrics as fetchMetrics } from '@/lib/repository-layer'
import { listMetrics } from '../list-metrics'

vi.mock('@/lib/repository-layer', () => ({
  listMetrics: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(fetchMetrics).mockReset()
})

describe('listMetrics (Telemetría)', () => {
  it('delega en Repository Layer y propaga el resultado en el mismo orden recibido', async () => {
    const rows = [
      { id: 'm1', profileId: 'profile-1', name: 'ai_gateway.latency_ms', value: 100, unit: 'ms', recordedAt: '2026-07-18T10:00:00Z' },
      { id: 'm2', profileId: 'profile-1', name: 'ai_gateway.latency_ms', value: 200, unit: 'ms', recordedAt: '2026-07-18T11:00:00Z' },
    ]
    vi.mocked(fetchMetrics).mockResolvedValue(rows)

    const result = await listMetrics('profile-1', { name: 'ai_gateway.latency_ms', limit: 10 })

    expect(fetchMetrics).toHaveBeenCalledWith('profile-1', { name: 'ai_gateway.latency_ms', limit: 10 })
    expect(result).toEqual(rows)
  })

  it('permite invocarse sin filtro explícito', async () => {
    vi.mocked(fetchMetrics).mockResolvedValue([])

    await listMetrics('profile-1')

    expect(fetchMetrics).toHaveBeenCalledWith('profile-1', undefined)
  })
})
