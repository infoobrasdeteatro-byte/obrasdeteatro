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
  process.env.STRIPE_PRICE_PREMIUM_ANUAL_ID = 'price_premium_anual_test'
  process.env.STRIPE_PRICE_DESTACADO_ANUAL_ID = 'price_destacado_anual_test'
  process.env.STRIPE_PRICE_EMPRESAS_ANUAL_ID = 'price_empresas_anual_test'
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
    expect(args.metadata).toEqual({ userId: 'user-sesion', plan: 'premium', periodo: 'mensual' })
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
        metadata: { userId: 'user-sesion', plan: 'destacado', periodo: 'mensual' },
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

  it('con periodo anual usa el precio anual del plan', async () => {
    const res = await POST(peticion({ plan: 'empresas', periodo: 'anual' }))

    expect(res.status).toBe(200)
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_empresas_anual_test', quantity: 1 }],
        metadata: { userId: 'user-sesion', plan: 'empresas', periodo: 'anual' },
      })
    )
  })

  it('sin periodo cobra el precio mensual', async () => {
    await POST(peticion({ plan: 'premium' }))

    expect(mockCheckoutCreate.mock.calls[0][0].line_items).toEqual([{ price: 'price_premium_test', quantity: 1 }])
  })

  it('un periodo desconocido responde 400', async () => {
    const res = await POST(peticion({ plan: 'premium', periodo: 'semanal' }))

    expect(res.status).toBe(400)
    expect(mockCheckoutCreate).not.toHaveBeenCalled()
  })

  it('anual sin precio anual configurado responde 400 y no crea la sesión', async () => {
    delete process.env.STRIPE_PRICE_DESTACADO_ANUAL_ID

    const res = await POST(peticion({ plan: 'destacado', periodo: 'anual' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'El pago anual no está disponible' })
    expect(mockCheckoutCreate).not.toHaveBeenCalled()
  })
})
