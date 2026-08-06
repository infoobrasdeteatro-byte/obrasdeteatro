import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { recordExecutionAudit, listExecutionAudit } from '../execution-audit'
import { createFakeSupabaseInsertClient, createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(createClient).mockReset()
})

describe('recordExecutionAudit', () => {
  it('inserta exactamente una fila en execution_audit_log con los datos recibidos', async () => {
    const { client, from, insert } = createFakeSupabaseInsertClient({ data: null, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await recordExecutionAudit('profile-1', {
      providerIdentifier: 'anthropic',
      providerModel: 'claude-sonnet-5',
      executionLatencyMs: 340,
      tokensConsumed: 1200,
      realExecutionCost: 0.03,
      technicalMetadata: null,
    })

    expect(from).toHaveBeenCalledWith('execution_audit_log')
    expect(insert).toHaveBeenCalledWith({
      profile_id: 'profile-1',
      provider_identifier: 'anthropic',
      provider_model: 'claude-sonnet-5',
      execution_latency_ms: 340,
      tokens_consumed: 1200,
      real_execution_cost: 0.03,
      technical_metadata: null,
    })
  })

  it('lanza si la inserción falla (mismo comportamiento que recordActivity/recordMetric)', async () => {
    const { client } = createFakeSupabaseInsertClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(
      recordExecutionAudit('profile-1', {
        providerIdentifier: null,
        providerModel: null,
        executionLatencyMs: null,
        tokensConsumed: null,
        realExecutionCost: null,
        technicalMetadata: null,
      })
    ).rejects.toThrow(/boom/)
  })
})

describe('listExecutionAudit', () => {
  it('consulta sin acotar por perfil, en orden cronológico ascendente, con el límite por defecto', async () => {
    const rows = [
      {
        id: 'a1',
        profile_id: 'profile-1',
        provider_identifier: 'anthropic',
        provider_model: 'claude-sonnet-5',
        execution_latency_ms: 300,
        tokens_consumed: 900,
        real_execution_cost: 0.02,
        technical_metadata: null,
        recorded_at: '2026-07-18T10:00:00Z',
      },
      {
        id: 'a2',
        profile_id: 'profile-2',
        provider_identifier: 'anthropic',
        provider_model: 'claude-sonnet-5',
        execution_latency_ms: 500,
        tokens_consumed: 1400,
        real_execution_cost: 0.05,
        technical_metadata: null,
        recorded_at: '2026-07-18T11:00:00Z',
      },
    ]
    const { client, builder } = createFakeSupabaseClient({ data: rows, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listExecutionAudit()

    expect(builder.eq).not.toHaveBeenCalled()
    expect(builder.order).toHaveBeenCalledWith('recorded_at', { ascending: true })
    expect(builder.limit).toHaveBeenCalledWith(100)
    expect(result).toEqual([
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
  })

  it('respeta un límite explícito de la consulta', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listExecutionAudit({ limit: 10 })

    expect(builder.limit).toHaveBeenCalledWith(10)
  })

  it('devuelve lista vacía si la consulta falla, sin lanzar', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listExecutionAudit()

    expect(result).toEqual([])
  })
})
