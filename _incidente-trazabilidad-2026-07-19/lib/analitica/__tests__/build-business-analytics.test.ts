import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listExecutionAudit } from '@/lib/repository-layer'
import { buildBusinessAnalytics } from '../build-business-analytics'

vi.mock('@/lib/repository-layer', () => ({
  listExecutionAudit: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(listExecutionAudit).mockReset()
})

describe('buildBusinessAnalytics', () => {
  it('cuenta el total de ejecuciones registradas', async () => {
    vi.mocked(listExecutionAudit).mockResolvedValue([
      {
        id: 'a1',
        profileId: 'profile-1',
        providerIdentifier: 'anthropic',
        providerModel: 'claude-sonnet-5',
        executionLatencyMs: 300,
        tokensConsumed: 900,
        realExecutionCost: 0.02,
        technicalMetadata: null,
        recordedAt: '2026-07-18T10:00:00Z',
      },
      {
        id: 'a2',
        profileId: 'profile-2',
        providerIdentifier: 'anthropic',
        providerModel: 'claude-sonnet-5',
        executionLatencyMs: 500,
        tokensConsumed: 1400,
        realExecutionCost: 0.05,
        technicalMetadata: null,
        recordedAt: '2026-07-18T11:00:00Z',
      },
    ])

    const report = await buildBusinessAnalytics()

    expect(report.totalExecutions).toBe(2)
    expect(typeof report.generatedAt).toBe('string')
  })

  it('llama a listExecutionAudit sin ningún filtro por perfil', async () => {
    vi.mocked(listExecutionAudit).mockResolvedValue([])

    await buildBusinessAnalytics()

    expect(listExecutionAudit).toHaveBeenCalledWith()
  })

  it('devuelve un informe vacío y coherente cuando no hay actividad registrada todavía', async () => {
    vi.mocked(listExecutionAudit).mockResolvedValue([])

    const report = await buildBusinessAnalytics()

    expect(report.totalExecutions).toBe(0)
  })
})
