import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recordMetric } from '@/lib/telemetria'
import { recordExecutionTrace } from '../record-execution-trace'
import type { ExecutionAudit } from '../types'

vi.mock('@/lib/telemetria', () => ({
  recordMetric: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(recordMetric).mockReset()
})

const EMPTY_AUDIT: ExecutionAudit = {
  providerIdentifier: null,
  providerModel: null,
  executionLatencyMs: null,
  tokensConsumed: null,
  realExecutionCost: null,
  technicalMetadata: null,
}

describe('recordExecutionTrace', () => {
  it('traduce los tres campos numéricos a metricas de Telemetria, con providerIdentifier/providerModel como tags', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    const audit: ExecutionAudit = {
      providerIdentifier: 'anthropic',
      providerModel: 'claude-sonnet-5',
      executionLatencyMs: 340,
      tokensConsumed: 1200,
      realExecutionCost: 0.05,
      technicalMetadata: 'algo sin destino autorizado',
    }

    const result = await recordExecutionTrace('profile-1', audit)

    expect(recordMetric).toHaveBeenCalledWith('profile-1', {
      name: 'ai_gateway.execution_latency_ms',
      value: 340,
      unit: 'ms',
      tags: { providerIdentifier: 'anthropic', providerModel: 'claude-sonnet-5' },
    })
    expect(recordMetric).toHaveBeenCalledWith('profile-1', {
      name: 'ai_gateway.tokens_consumed',
      value: 1200,
      unit: 'tokens',
      tags: { providerIdentifier: 'anthropic', providerModel: 'claude-sonnet-5' },
    })
    expect(recordMetric).toHaveBeenCalledWith('profile-1', {
      name: 'ai_gateway.real_execution_cost',
      value: 0.05,
      unit: 'usd',
      tags: { providerIdentifier: 'anthropic', providerModel: 'claude-sonnet-5' },
    })
    expect(recordMetric).toHaveBeenCalledTimes(3)
    expect(result).toBe(true)
  })

  it('no traduce technicalMetadata (sin destino arquitectónico autorizado)', async () => {
    vi.mocked(recordMetric).mockResolvedValue(true)

    await recordExecutionTrace('profile-1', {
      ...EMPTY_AUDIT,
      executionLatencyMs: 100,
      technicalMetadata: 'texto libre',
    })

    for (const call of vi.mocked(recordMetric).mock.calls) {
      expect(call[1].name).not.toMatch(/technicalMetadata/i)
      expect(JSON.stringify(call[1])).not.toContain('texto libre')
    }
  })

  it('no registra nada y devuelve true cuando el audit está completamente vacío', async () => {
    const result = await recordExecutionTrace('profile-1', EMPTY_AUDIT)

    expect(recordMetric).not.toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('devuelve false si alguna escritura de Telemetría falla', async () => {
    vi.mocked(recordMetric).mockResolvedValueOnce(true).mockResolvedValueOnce(false)

    const result = await recordExecutionTrace('profile-1', {
      ...EMPTY_AUDIT,
      executionLatencyMs: 100,
      tokensConsumed: 50,
    })

    expect(result).toBe(false)
  })
})
