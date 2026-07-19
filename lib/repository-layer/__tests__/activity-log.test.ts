import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { recordActivity, listPendingActivity, listActivityHistory, markActivityProcessed } from '../activity-log'
import { createFakeSupabaseInsertClient, createFakeSupabaseClient, createFakeSupabaseUpdateClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(createClient).mockReset()
})

describe('recordActivity', () => {
  it('inserta exactamente una fila en nucleo_activity_log con los datos recibidos', async () => {
    const { client, from, insert } = createFakeSupabaseInsertClient({ data: null, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await recordActivity('profile-1', 'RESPONSE_SUCCESS')

    expect(from).toHaveBeenCalledWith('nucleo_activity_log')
    expect(insert).toHaveBeenCalledWith({ profile_id: 'profile-1', response_type: 'RESPONSE_SUCCESS' })
  })

  it('lanza si la inserción falla', async () => {
    const { client } = createFakeSupabaseInsertClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(recordActivity('profile-1', 'RESPONSE_ERROR')).rejects.toThrow(/boom/)
  })
})

describe('listPendingActivity', () => {
  it('consulta solo actividad pendiente del perfil, ordenada de forma ascendente por occurred_at', async () => {
    const rows = [
      { id: 'a1', profile_id: 'profile-1', response_type: 'RESPONSE_DIRECT', occurred_at: '2026-07-17T10:00:00Z' },
      { id: 'a2', profile_id: 'profile-1', response_type: 'RESPONSE_SUCCESS', occurred_at: '2026-07-17T11:00:00Z' },
    ]
    const { client, builder } = createFakeSupabaseClient({ data: rows, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPendingActivity('profile-1', 10)

    expect(builder.eq).toHaveBeenCalledWith('profile_id', 'profile-1')
    expect(builder.is).toHaveBeenCalledWith('processed_at', null)
    expect(builder.order).toHaveBeenCalledWith('occurred_at', { ascending: true })
    expect(builder.limit).toHaveBeenCalledWith(10)
    expect(result).toEqual([
      { id: 'a1', profileId: 'profile-1', responseType: 'RESPONSE_DIRECT', occurredAt: '2026-07-17T10:00:00Z' },
      { id: 'a2', profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS', occurredAt: '2026-07-17T11:00:00Z' },
    ])
  })

  it('devuelve lista vacía si la consulta falla, sin lanzar', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listPendingActivity('profile-1')

    expect(result).toEqual([])
  })
})

describe('listActivityHistory', () => {
  it('consulta toda la actividad del perfil sin filtrar por processed_at, ordenada de forma ascendente por occurred_at', async () => {
    const rows = [
      { id: 'a1', profile_id: 'profile-1', response_type: 'RESPONSE_DIRECT', occurred_at: '2026-07-17T10:00:00Z' },
      { id: 'a2', profile_id: 'profile-1', response_type: 'RESPONSE_SUCCESS', occurred_at: '2026-07-17T11:00:00Z' },
    ]
    const { client, builder } = createFakeSupabaseClient({ data: rows, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listActivityHistory('profile-1', 50)

    expect(builder.eq).toHaveBeenCalledWith('profile_id', 'profile-1')
    expect(builder.is).not.toHaveBeenCalled()
    expect(builder.order).toHaveBeenCalledWith('occurred_at', { ascending: true })
    expect(builder.limit).toHaveBeenCalledWith(50)
    expect(result).toEqual([
      { id: 'a1', profileId: 'profile-1', responseType: 'RESPONSE_DIRECT', occurredAt: '2026-07-17T10:00:00Z' },
      { id: 'a2', profileId: 'profile-1', responseType: 'RESPONSE_SUCCESS', occurredAt: '2026-07-17T11:00:00Z' },
    ])
  })

  it('devuelve lista vacía si la consulta falla, sin lanzar', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await listActivityHistory('profile-1')

    expect(result).toEqual([])
  })
})

describe('markActivityProcessed', () => {
  it('actualiza processed_at filtrando por id y por processed_at IS NULL (idempotencia)', async () => {
    const { client, update, eq, isFn } = createFakeSupabaseUpdateClient({ data: null, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await markActivityProcessed('activity-1')

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ processed_at: expect.any(String) }))
    expect(eq).toHaveBeenCalledWith('id', 'activity-1')
    expect(isFn).toHaveBeenCalledWith('processed_at', null)
  })

  it('no lanza si el registro ya estaba procesado (cero filas afectadas, sin error)', async () => {
    const { client } = createFakeSupabaseUpdateClient({ data: null, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(markActivityProcessed('activity-ya-procesada')).resolves.toBeUndefined()
  })

  it('lanza si la actualización falla por un error real', async () => {
    const { client } = createFakeSupabaseUpdateClient({ data: null, error: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await expect(markActivityProcessed('activity-1')).rejects.toThrow(/boom/)
  })
})
