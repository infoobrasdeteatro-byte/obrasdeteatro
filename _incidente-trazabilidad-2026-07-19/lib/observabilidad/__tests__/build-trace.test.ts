import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listMetrics } from '@/lib/telemetria'
import { buildTechnicalTrace } from '../build-trace'

vi.mock('@/lib/telemetria', () => ({
  listMetrics: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(listMetrics).mockReset()
})

describe('buildTechnicalTrace', () => {
  it('agrupa las entradas por nombre y calcula conteo/mínimo/máximo/promedio', async () => {
    vi.mocked(listMetrics).mockResolvedValue([
      { id: 'm1', profileId: 'profile-1', name: 'ai_gateway.latency_ms', value: 100, unit: 'ms', recordedAt: '2026-07-18T10:00:00Z' },
      { id: 'm2', profileId: 'profile-1', name: 'ai_gateway.latency_ms', value: 300, unit: 'ms', recordedAt: '2026-07-18T11:00:00Z' },
      { id: 'm3', profileId: 'profile-1', name: 'ai_gateway.latency_ms', value: 200, unit: 'ms', recordedAt: '2026-07-18T12:00:00Z' },
    ])

    const trace = await buildTechnicalTrace('profile-1')

    expect(trace.profileId).toBe('profile-1')
    expect(trace.totalEntries).toBe(3)
    expect(trace.groups).toEqual([
      { name: 'ai_gateway.latency_ms', count: 3, minValue: 100, maxValue: 300, averageValue: 200, unit: 'ms' },
    ])
    expect(typeof trace.generatedAt).toBe('string')
  })

  it('mantiene grupos separados para nombres de métrica distintos', async () => {
    vi.mocked(listMetrics).mockResolvedValue([
      { id: 'm1', profileId: 'profile-1', name: 'ai_gateway.latency_ms', value: 100, unit: 'ms', recordedAt: '2026-07-18T10:00:00Z' },
      { id: 'm2', profileId: 'profile-1', name: 'custom.counter', value: 1, recordedAt: '2026-07-18T10:00:01Z' },
    ])

    const trace = await buildTechnicalTrace('profile-1')

    expect(trace.groups).toHaveLength(2)
    expect(trace.groups.map((g) => g.name).sort()).toEqual(['ai_gateway.latency_ms', 'custom.counter'])
  })

  it('un grupo con una sola entrada tiene mínimo, máximo y promedio iguales al valor', async () => {
    vi.mocked(listMetrics).mockResolvedValue([
      { id: 'm1', profileId: 'profile-1', name: 'custom.counter', value: 42, recordedAt: '2026-07-18T10:00:00Z' },
    ])

    const trace = await buildTechnicalTrace('profile-1')

    expect(trace.groups).toEqual([
      { name: 'custom.counter', count: 1, minValue: 42, maxValue: 42, averageValue: 42, unit: undefined },
    ])
  })

  it('devuelve una traza vacía y coherente cuando no hay actividad técnica registrada', async () => {
    vi.mocked(listMetrics).mockResolvedValue([])

    const trace = await buildTechnicalTrace('profile-sin-actividad')

    expect(trace.groups).toEqual([])
    expect(trace.totalEntries).toBe(0)
  })

  it('llama a listMetrics sin filtro, para leer toda la telemetría disponible del perfil', async () => {
    vi.mocked(listMetrics).mockResolvedValue([])

    await buildTechnicalTrace('profile-1')

    expect(listMetrics).toHaveBeenCalledWith('profile-1')
  })
})
