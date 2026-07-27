import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { getSubscription, getUsageLimit } from '../subscription'
import { createFakeSupabaseClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const SAMPLE_SUBSCRIPTION_ROW = {
  plan: 'premium',
  status: 'active',
  current_period_end: '2026-08-21T00:00:00.000Z',
  cancel_at_period_end: false,
}

describe('getSubscription', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('maps a found subscription row to the Subscription contract', async () => {
    const { client, builder } = createFakeSupabaseClient({ data: SAMPLE_SUBSCRIPTION_ROW, error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getSubscription('user-1')

    expect(result).toEqual({
      plan: 'premium',
      status: 'active',
      currentPeriodEnd: '2026-08-21T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    })
    expect(client.from).toHaveBeenCalledWith('subscriptions')
    expect(builder.eq).toHaveBeenCalledWith('profile_id', 'user-1')
  })

  it('returns null when the user has no subscription row', async () => {
    const { client } = createFakeSupabaseClient({ data: null, error: { message: 'not found' } })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const result = await getSubscription('user-sin-suscripcion')

    expect(result).toBeNull()
  })
})

describe('getUsageLimit', () => {
  it('mapea cada plan de la Tabla Definitiva de Planes v2 (Nivel 1) a su límite mensual', () => {
    expect(getUsageLimit('gratuito')).toBe('5')
    expect(getUsageLimit('premium')).toBe('30')
    expect(getUsageLimit('destacado')).toBe('60')
  })

  it('mapea el plan empresas a ILIMITADO (IA-AUTH-001, PRD-001)', () => {
    expect(getUsageLimit('empresas')).toBe('ILIMITADO')
  })

  it('devuelve null para un plan no reconocido, nunca un valor inventado', () => {
    expect(getUsageLimit('plan-inexistente')).toBeNull()
  })

  it('devuelve null cuando no hay plan', () => {
    expect(getUsageLimit(null)).toBeNull()
  })
})
