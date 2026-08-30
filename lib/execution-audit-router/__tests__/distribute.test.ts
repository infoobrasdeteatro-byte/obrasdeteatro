import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recordExecutionTrace } from '@/lib/verified/observabilidad'
import { distributeExecutionAudit } from '../distribute'

vi.mock('@/lib/verified/observabilidad', () => ({ recordExecutionTrace: vi.fn() }))

beforeEach(() => {
  vi.mocked(recordExecutionTrace).mockReset()
})

const AUDIT = { providerIdentifier: null, providerModel: null, executionLatencyMs: null, tokensConsumed: null, inputTokens: null, outputTokens: null, realExecutionCost: null, realExecutionCostCurrency: null, technicalMetadata: null }

describe('distributeExecutionAudit', () => {
  it('entrega el audit al único consumidor registrado (Observabilidad), preservando el comportamiento ya existente', async () => {
    vi.mocked(recordExecutionTrace).mockResolvedValue(true)

    await distributeExecutionAudit('user-1', AUDIT)

    // Fase 0: el enrutador propaga un tercer argumento de contexto, que es
    // opcional -- sin el, la entrega es exactamente la de siempre.
    expect(recordExecutionTrace).toHaveBeenCalledWith('user-1', AUDIT, undefined)
  })

  it('propaga el contexto de ejecucion hasta el consumidor, sin interpretarlo (Fase 0)', async () => {
    vi.mocked(recordExecutionTrace).mockResolvedValue(true)
    const contexto = { requestId: 'req-1', stage: 'resolver' as const }

    await distributeExecutionAudit('user-1', AUDIT, contexto)

    expect(recordExecutionTrace).toHaveBeenCalledWith('user-1', AUDIT, contexto)
  })

  it('nunca lanza excepción aunque un consumidor falle (degradación segura, propiedad 12)', async () => {
    vi.mocked(recordExecutionTrace).mockRejectedValue(new Error('fallo simulado del consumidor'))

    await expect(distributeExecutionAudit('user-1', AUDIT)).resolves.toBeUndefined()
  })
})
