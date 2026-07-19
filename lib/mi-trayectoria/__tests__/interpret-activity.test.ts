import { describe, it, expect } from 'vitest'
import { interpretActivity } from '../interpret-activity'
import type { ActivityLogEntry } from '@/lib/procesos-asincronos'

describe('interpretActivity', () => {
  it('convierte cada entrada de historial en una TrajectoryEntry, preservando el orden recibido', () => {
    const logEntries: ActivityLogEntry[] = [
      { id: 'a1', profileId: 'profile-1', responseType: 'RESPONSE_DIRECT', occurredAt: '2026-07-17T10:00:00Z' },
      { id: 'a2', profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS', occurredAt: '2026-07-17T11:00:00Z' },
    ]

    const { entries } = interpretActivity(logEntries)

    expect(entries).toEqual([
      { occurredAt: '2026-07-17T10:00:00Z', category: 'RESPONSE_DIRECT' },
      { occurredAt: '2026-07-17T11:00:00Z', category: 'RESPONSE_SUCCESS' },
    ])
  })

  it('calcula un resumen puramente estructural: totales, primera/última fecha y conteo por categoría', () => {
    const logEntries: ActivityLogEntry[] = [
      { id: 'a1', profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS', occurredAt: '2026-07-17T10:00:00Z' },
      { id: 'a2', profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS', occurredAt: '2026-07-17T11:00:00Z' },
      { id: 'a3', profileId: 'profile-1', responseType: 'RESPONSE_ERROR', occurredAt: '2026-07-17T12:00:00Z' },
    ]

    const { summary } = interpretActivity(logEntries)

    expect(summary).toEqual({
      totalEntries: 3,
      firstActivityAt: '2026-07-17T10:00:00Z',
      lastActivityAt: '2026-07-17T12:00:00Z',
      countByCategory: { RESPONSE_SUCCESS: 2, RESPONSE_ERROR: 1 },
    })
  })

  it('devuelve un resumen vacío y coherente cuando no hay actividad', () => {
    const { entries, summary } = interpretActivity([])

    expect(entries).toEqual([])
    expect(summary).toEqual({
      totalEntries: 0,
      firstActivityAt: null,
      lastActivityAt: null,
      countByCategory: {},
    })
  })
})
