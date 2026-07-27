import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recordExecutionTrace } from '@/lib/verified/observabilidad'
import { distributeExecutionAudit } from '../distribute'

vi.mock('@/lib/verified/observabilidad', () => ({ recordExecutionTrace: vi.fn() }))

beforeEach(() => {
  vi.mocked(recordExecutionTrace).mockReset()
})

const AUDIT = { providerIdentifier: null, providerModel: null, executionLatencyMs: null, tokensConsumed: null, realExecutionCost: null, technicalMetadata: null }

describe('distributeExecutionAudit', () => {
  it('entrega el audit al único consumidor registrado (Observabilidad), preservando el comportamiento ya existente', async () => {
    vi.mocked(recordExecutionTrace).mockResolvedValue(true)

    await distributeExecutionAudit('user-1', AUDIT)

    expect(recordExecutionTrace).toHaveBeenCalledWith('user-1', AUDIT)
  })

  it('nunca lanza excepción aunque un consumidor falle (degradación segura, propiedad 12)', async () => {
    vi.mocked(recordExecutionTrace).mockRejectedValue(new Error('fallo simulado del consumidor'))

    await expect(distributeExecutionAudit('user-1', AUDIT)).resolves.toBeUndefined()
  })
})
