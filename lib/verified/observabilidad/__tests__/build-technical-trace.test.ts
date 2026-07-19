import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listMetrics } from '@/lib/telemetria'
import { buildTechnicalTrace } from '../build-technical-trace'

vi.mock('@/lib/telemetria', () => ({
  listMetrics: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(listMetrics).mockReset()
})

describe('buildTechnicalTrace', () => {
  it('construye la traza a partir de las métricas del perfil, consolidadas por nombre', async () => {
    vi.mocked(listMetrics).mockResolvedValue([
      { id: 'm1', profileId: 'profile-1', name: 'ai_gateway.execution_latency_ms', value: 100, recordedAt: '2026-07-19T10:00:00Z' },
      { id: 'm2', profileId: 'profile-1', name: 'ai_gateway.execution_latency_ms', value: 200, recordedAt: '2026-07-19T11:00:00Z' },
    ])

    const trace = await buildTechnicalTrace('profile-1')

    expect(listMetrics).toHaveBeenCalledWith('profile-1')
    expect(trace.profileId).toBe('profile-1')
    expect(trace.metrics).toEqual([
      { name: 'ai_gateway.execution_latency_ms', count: 2, min: 100, max: 200, average: 150 },
    ])
    expect(typeof trace.generatedAt).toBe('string')
  })

  it('devuelve una traza vacía y coherente cuando no hay métricas registradas', async () => {
    vi.mocked(listMetrics).mockResolvedValue([])

    const trace = await buildTechnicalTrace('profile-nuevo')

    expect(trace.metrics).toEqual([])
  })
})
