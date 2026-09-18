import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Stripe: constructEvent devuelve el evento que prepara cada test ─────────
const mockConstructEvent = vi.fn()
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent: mockConstructEvent } }),
}))

// ── Supabase (service client): se registra cada update por tabla ────────────
//    subscriptions: update(...).eq(...).select(...).maybeSingle()
//    profiles:      update(...).eq(...)
const mockSubscriptionsUpdate = vi.fn()
const mockSubscriptionsMaybeSingle = vi.fn()
const mockProfilesUpdate = vi.fn()
const mockProfilesEq = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'subscriptions') {
        return {
          update: (values: unknown) => {
            mockSubscriptionsUpdate(values)
            return {
              eq: () => ({
                select: () => ({ maybeSingle: mockSubscriptionsMaybeSingle }),
              }),
            }
          },
        }
      }
      if (table === 'profiles') {
        return {
          update: (values: unknown) => {
            mockProfilesUpdate(values)
            return { eq: mockProfilesEq }
          },
        }
      }
      throw new Error(`Tabla inesperada: ${table}`)
    },
  }),
}))

import { POST } from '../route'

process.env.STRIPE_PRICE_PREMIUM_ID = 'price_premium_test'
process.env.STRIPE_PRICE_DESTACADO_ID = 'price_destacado_test'
process.env.STRIPE_PRICE_EMPRESAS_ID = 'price_empresas_test'

const PROFILE_ID = 'profile-1'

function fakeRequest() {
  return {
    text: () => Promise.resolve('{}'),
    headers: new Headers({ 'stripe-signature': 'sig' }),
  } as unknown as Parameters<typeof POST>[0]
}

function subscriptionUpdated(overrides: { priceId?: string; status?: string } = {}) {
  return {
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_123',
        status: overrides.status ?? 'active',
        items: { data: [{ price: { id: overrides.priceId ?? 'price_premium_test' } }] },
        current_period_start: 1_758_000_000,
        current_period_end: 1_760_592_000,
        cancel_at_period_end: false,
      },
    },
  }
}

async function send(overrides: { priceId?: string; status?: string } = {}) {
  mockConstructEvent.mockReturnValue(subscriptionUpdated(overrides))
  return POST(fakeRequest())
}

describe('POST /api/webhooks/stripe — customer.subscription.updated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: { profile_id: PROFILE_ID }, error: null })
    mockProfilesEq.mockResolvedValue({ error: null })
  })

  describe('mapeo de price ID a plan', () => {
    it.each([
      ['price_premium_test', 'premium'],
      ['price_destacado_test', 'destacado'],
      ['price_empresas_test', 'empresas'],
    ])('%s → %s en subscriptions y profiles', async (priceId, plan) => {
      const res = await send({ priceId })

      expect(res.status).toBe(200)
      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ plan, stripe_price_id: priceId, status: 'active' })
      )
      expect(mockProfilesUpdate).toHaveBeenCalledWith({ plan, is_premium: true })
      expect(mockProfilesEq).toHaveBeenCalledWith('id', PROFILE_ID)
    })

    it('un price ID desconocido no pisa el plan ni concede acceso', async () => {
      const res = await send({ priceId: 'price_desconocido' })

      expect(res.status).toBe(200)
      const values = mockSubscriptionsUpdate.mock.calls[0][0]
      expect(values.plan).toBeUndefined()
      // undefined desaparece al serializar: la columna plan no se envía
      expect(JSON.parse(JSON.stringify(values))).not.toHaveProperty('plan')
      expect(values.stripe_price_id).toBe('price_desconocido')
      expect(mockProfilesUpdate).not.toHaveBeenCalled()
    })
  })

  it('convierte los timestamps de periodo y copia cancel_at_period_end', async () => {
    await send()

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        current_period_start: new Date(1_758_000_000 * 1000).toISOString(),
        current_period_end: new Date(1_760_592_000 * 1000).toISOString(),
        cancel_at_period_end: false,
      })
    )
  })

  it.each(['active', 'trialing'])('%s concede acceso', async (status) => {
    const res = await send({ status, priceId: 'price_destacado_test' })

    expect(res.status).toBe(200)
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(expect.objectContaining({ status }))
    expect(mockProfilesUpdate).toHaveBeenCalledWith({ plan: 'destacado', is_premium: true })
  })

  it.each(['canceled', 'unpaid', 'incomplete_expired'])('%s revoca acceso', async (status) => {
    const res = await send({ status })

    expect(res.status).toBe(200)
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(expect.objectContaining({ status }))
    expect(mockProfilesUpdate).toHaveBeenCalledWith({ plan: 'gratuito', is_premium: false })
    expect(mockProfilesEq).toHaveBeenCalledWith('id', PROFILE_ID)
  })

  it.each(['past_due', 'incomplete', 'paused'])('%s actualiza subscriptions pero no toca profiles', async (status) => {
    const res = await send({ status })

    expect(res.status).toBe(200)
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(expect.objectContaining({ status }))
    expect(mockProfilesUpdate).not.toHaveBeenCalled()
  })

  it('sin fila en subscriptions responde 200 y no toca profiles', async () => {
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: null, error: null })

    const res = await send()

    expect(res.status).toBe(200)
    expect(mockProfilesUpdate).not.toHaveBeenCalled()
  })

  it('un error de Supabase al actualizar subscriptions responde 500', async () => {
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const res = await send()

    expect(res.status).toBe(500)
    expect(mockProfilesUpdate).not.toHaveBeenCalled()
  })
})
