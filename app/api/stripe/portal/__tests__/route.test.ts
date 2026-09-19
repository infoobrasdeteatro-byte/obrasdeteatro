import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Stripe: billingPortal.sessions.create ────────────────────────────────────
const mockPortalCreate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ billingPortal: { sessions: { create: mockPortalCreate } } }),
}))

// ── Supabase (cliente de sesión): usuario y su fila de subscriptions ────────
const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table !== 'subscriptions') throw new Error(`Tabla inesperada: ${table}`)
      return {
        select: () => ({
          eq: (col: string, val: unknown) => {
            mockEq(col, val)
            return { maybeSingle: mockMaybeSingle }
          },
        }),
      }
    },
  }),
}))

import { POST } from '../route'

const APP = 'https://app.test'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_PORTAL_ENABLED = 'true'
  process.env.NEXT_PUBLIC_APP_URL = APP
  delete process.env.STRIPE_PORTAL_CONFIGURATION_ID
  mockGetUser.mockResolvedValue({ data: { user: { id: 'profile-1' } } })
  mockMaybeSingle.mockResolvedValue({ data: { stripe_customer_id: 'cus_123' } })
  mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/p/session/test_abc' })
})

describe('POST /api/stripe/portal', () => {
  it('con el interruptor apagado responde 404 y no llama a Stripe', async () => {
    process.env.STRIPE_PORTAL_ENABLED = 'false'
    const res = await POST()
    expect(res.status).toBe(404)
    expect(mockPortalCreate).not.toHaveBeenCalled()
  })

  it('sin sesión redirige al login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST()
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`${APP}/auth/login`)
    expect(mockPortalCreate).not.toHaveBeenCalled()
  })

  it('sin cliente de Stripe vuelve a /cuenta con aviso y no llama a Stripe', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })
    const res = await POST()
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`${APP}/cuenta?portal=sin_suscripcion`)
    expect(mockPortalCreate).not.toHaveBeenCalled()
  })

  it('busca el customer por el usuario de la SESIÓN, nunca por algo de la petición', async () => {
    await POST()
    expect(mockEq).toHaveBeenCalledWith('profile_id', 'profile-1')
    expect(mockPortalCreate.mock.calls[0][0].customer).toBe('cus_123')
  })

  it('crea la sesión del portal y redirige a ella con 303', async () => {
    const res = await POST()
    expect(mockPortalCreate).toHaveBeenCalledWith({ customer: 'cus_123', return_url: `${APP}/cuenta` })
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('https://billing.stripe.com/p/session/test_abc')
  })

  it('usa la configuración del portal si está definida', async () => {
    process.env.STRIPE_PORTAL_CONFIGURATION_ID = 'bpc_test_1'
    await POST()
    expect(mockPortalCreate).toHaveBeenCalledWith(expect.objectContaining({ configuration: 'bpc_test_1' }))
  })

  it('si Stripe falla vuelve a /cuenta con aviso de error', async () => {
    mockPortalCreate.mockRejectedValue(new Error('No such customer'))
    const res = await POST()
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`${APP}/cuenta?portal=error`)
  })
})
