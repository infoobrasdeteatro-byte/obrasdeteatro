import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recordMetric as persistMetric } from '@/lib/repository-layer'
import { recordMetric } from '../record-metric'

vi.mock('@/lib/repository-layer', () => ({
  recordMetric: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(persistMetric).mockReset()
})

describe('recordMetric (Telemetría)', () => {
  it('delega en Repository Layer y devuelve true cuando la persistencia funciona', async () => {
    vi.mocked(persistMetric).mockResolvedValue(undefined)

    const result = await recordMetric('profile-1', { name: 'ai_gateway.latency_ms', value: 340 })

    expect(persistMetric).toHaveBeenCalledWith('profile-1', { name: 'ai_gateway.latency_ms', value: 340 })
    expect(result).toBe(true)
  })

  it('nunca lanza: captura cualquier fallo de persistencia y devuelve false', async () => {
    vi.mocked(persistMetric).mockRejectedValue(new Error('boom'))

    const result = await recordMetric('profile-1', { name: 'x', value: 1 })

    expect(result).toBe(false)
  })
})
