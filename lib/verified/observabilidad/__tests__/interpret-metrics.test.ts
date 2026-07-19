import { describe, it, expect } from 'vitest'
import { interpretMetrics } from '../interpret-metrics'
import type { MetricEntry } from '@/lib/telemetria'

describe('interpretMetrics', () => {
  it('agrupa por nombre y calcula count/min/max/average', () => {
    const entries: MetricEntry[] = [
      { id: 'm1', profileId: 'p1', name: 'ai_gateway.execution_latency_ms', value: 100, recordedAt: '2026-07-19T10:00:00Z' },
      { id: 'm2', profileId: 'p1', name: 'ai_gateway.execution_latency_ms', value: 300, recordedAt: '2026-07-19T11:00:00Z' },
      { id: 'm3', profileId: 'p1', name: 'ai_gateway.tokens_consumed', value: 50, recordedAt: '2026-07-19T12:00:00Z' },
    ]

    const summaries = interpretMetrics(entries)

    expect(summaries).toEqual([
      { name: 'ai_gateway.execution_latency_ms', count: 2, min: 100, max: 300, average: 200 },
      { name: 'ai_gateway.tokens_consumed', count: 1, min: 50, max: 50, average: 50 },
    ])
  })

  it('devuelve una lista vacía cuando no hay entradas', () => {
    expect(interpretMetrics([])).toEqual([])
  })
})
