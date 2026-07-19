import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { recordMetric, listMetrics } from '../telemetry'
import { createFakeSupabaseInsertClient, createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(createClient).mockReset()
})

describe('recordMetric', () => {
  it('inserta exactamente una fila en telemetry_metrics con los datos recibidos', async () => {
    const { client, from, insert } = createFakeSupabaseInsertClient({ data: null, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await recordMetric('profile-1', { name: 'ai_gateway.execution_latency_ms', value: 340, unit: 'ms', tags: { component: 'ai-gateway' } })

    expect(from).toHaveBeenCalledWith('telemetry_metrics')
    expect(insert).toHaveBeenCalledWith({
      profile_id: 'profile-1',
      metric_name: 'ai_gateway.execution_latency_ms',
      metric_value: 340,
      metric_unit: 'ms',
      tags: { component: 'ai-gateway' },
    })
  })

  it('inserta unidad y tags como null cuando no se proporcionan', async () => {
    const { client, insert } = createFakeSupabaseInsertClient({ data: null, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await recordMetric('profile-1', { name: 'custom.counter', value: 1 })

    expect(insert).toHaveBeenCalledWith({
      profile_id: 'profile-1',
      metric_name: 'custom.counter',
      metric_value: 1,
      metric_unit: null,
      tags: null,
    })
  })

  it('lanza si la inserción falla', async () => {
    const { client } = createFakeSupabaseInsertClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(recordMetric('profile-1', { name: 'x', value: 1 })).rejects.toThrow(/boom/)
  })
})

describe('listMetrics', () => {
  it('consulta las métricas del perfil, ordenadas de forma ascendente por recorded_at', async () => {
    const rows = [
      { id: 'm1', profile_id: 'profile-1', metric_name: 'ai_gateway.latency_ms', metric_value: 100, metric_unit: 'ms', tags: null, recorded_at: '2026-07-18T10:00:00Z' },
      { id: 'm2', profile_id: 'profile-1', metric_name: 'ai_gateway.latency_ms', metric_value: 200, metric_unit: 'ms', tags: null, recorded_at: '2026-07-18T11:00:00Z' },
    ]
    const { client, builder } = createFakeSupabaseClient({ data: rows, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listMetrics('profile-1', { limit: 10 })

    expect(builder.eq).toHaveBeenCalledWith('profile_id', 'profile-1')
    expect(builder.order).toHaveBeenCalledWith('recorded_at', { ascending: true })
    expect(builder.limit).toHaveBeenCalledWith(10)
    expect(result).toEqual([
      { id: 'm1', profileId: 'profile-1', name: 'ai_gateway.latency_ms', value: 100, unit: 'ms', tags: undefined, recordedAt: '2026-07-18T10:00:00Z' },
      { id: 'm2', profileId: 'profile-1', name: 'ai_gateway.latency_ms', value: 200, unit: 'ms', tags: undefined, recordedAt: '2026-07-18T11:00:00Z' },
    ])
  })

  it('filtra adicionalmente por nombre de métrica cuando se solicita', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listMetrics('profile-1', { name: 'custom.counter' })

    expect(builder.eq).toHaveBeenCalledWith('profile_id', 'profile-1')
    expect(builder.eq).toHaveBeenCalledWith('metric_name', 'custom.counter')
  })

  it('no filtra por nombre y usa el límite por defecto cuando no se solicita', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await listMetrics('profile-1')

    expect(builder.eq).toHaveBeenCalledTimes(1)
    expect(builder.limit).toHaveBeenCalledWith(50)
  })

  it('devuelve lista vacía si la consulta falla, sin lanzar', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listMetrics('profile-1')

    expect(result).toEqual([])
  })
})
