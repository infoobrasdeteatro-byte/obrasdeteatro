import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Stripe: checkout.sessions.create ─────────────────────────────────────────
const mockCheckoutCreate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { create: mockCheckoutCreate } } }),
}))

// ── Supabase (cliente de sesión): usuario autenticado ───────────────────────
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}))

import { POST } from '../route'

const USUARIO_SESION = { id: 'user-sesion', email: 'sesion@example.com' }

function peticion(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as Parameters<typeof POST>[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_PRICE_PREMIUM_ID = 'price_premium_test'
  process.env.STRIPE_PRICE_DESTACADO_ID = 'price_destacado_test'
  process.env.STRIPE_PRICE_EMPRESAS_ID = 'price_empresas_test'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
  mockGetUser.mockResolvedValue({ data: { user: USUARIO_SESION } })
  mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' })
})

describe('POST /api/create-checkout-session', () => {
  it('sin sesión responde 401 y no crea ninguna sesión de Stripe', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await POST(peticion({ plan: 'premium', userId: 'user-1', email: 'x@example.com' }))

    expect(res.status).toBe(401)
    expect(mockCheckoutCreate).not.toHaveBeenCalled()
  })

  it('ignora el userId y el email de otro usuario enviados en el cuerpo: usa los de la sesión', async () => {
    const res = await POST(
      peticion({ plan: 'premium', userId: 'user-victima', email: 'victima@example.com' })
    )

    expect(res.status).toBe(200)
    const args = mockCheckoutCreate.mock.calls[0][0]
    expect(args.metadata).toEqual({ userId: 'user-sesion', plan: 'premium' })
    expect(args.customer_email).toBe('sesion@example.com')
    expect(JSON.stringify(args)).not.toMatch(/user-victima|victima@example\.com/)
  })

  it('con sesión crea el checkout del plan pedido y devuelve la URL', async () => {
    const res = await POST(peticion({ plan: 'destacado' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' })
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_destacado_test', quantity: 1 }],
        metadata: { userId: 'user-sesion', plan: 'destacado' },
      })
    )
  })

  it('un plan desconocido responde 400', async () => {
    const res = await POST(peticion({ plan: 'platino' }))

    expect(res.status).toBe(400)
    expect(mockCheckoutCreate).not.toHaveBeenCalled()
  })

  it('sin plan responde 400', async () => {
    const res = await POST(peticion({}))

    expect(res.status).toBe(400)
    expect(mockCheckoutCreate).not.toHaveBeenCalled()
  })
})
