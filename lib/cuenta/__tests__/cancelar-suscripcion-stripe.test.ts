import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRetrieve = vi.fn()
const mockCancel = vi.fn()

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    subscriptions: {
      retrieve: mockRetrieve,
      cancel: mockCancel,
    },
  }),
}))

// Estado simulado de las tablas -- controlado por cada test.
let subscriptionRow: { stripe_subscription_id: string | null } | null = null
const updateSpy = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'subscriptions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: subscriptionRow, error: null }),
            }),
          }),
          update: (row: Record<string, unknown>) => {
            updateSpy(table, row)
            return { eq: () => Promise.resolve({ data: null, error: null }) }
          },
        }
      }
      // profiles
      return {
        update: (row: Record<string, unknown>) => {
          updateSpy(table, row)
          return { eq: () => Promise.resolve({ data: null, error: null }) }
        },
      }
    },
  }),
}))

import { cancelarSuscripcionStripe } from '../cancelar-suscripcion-stripe'

describe('cancelarSuscripcionStripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    subscriptionRow = null
  })

  it('devuelve sin_suscripcion y no llama a Stripe si no hay suscripción asociada', async () => {
    subscriptionRow = null

    const resultado = await cancelarSuscripcionStripe('perfil-sin-suscripcion')

    expect(resultado).toEqual({
      ok: true,
      accion: 'sin_suscripcion',
      detalle: expect.stringContaining('No hay ninguna suscripción'),
    })
    expect(mockRetrieve).not.toHaveBeenCalled()
    expect(mockCancel).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('cancela realmente en Stripe cuando la suscripción está activa, y sincroniza el estado local', async () => {
    subscriptionRow = { stripe_subscription_id: 'sub_activa' }
    mockRetrieve.mockResolvedValue({ status: 'active' })
    mockCancel.mockResolvedValue({ status: 'canceled' })

    const resultado = await cancelarSuscripcionStripe('perfil-activo')

    expect(resultado.ok).toBe(true)
    expect(resultado.accion).toBe('cancelada_ahora')
    expect(mockRetrieve).toHaveBeenCalledWith('sub_activa')
    expect(mockCancel).toHaveBeenCalledWith('sub_activa')
    expect(updateSpy).toHaveBeenCalledWith('subscriptions', expect.objectContaining({ status: 'canceled' }))
    expect(updateSpy).toHaveBeenCalledWith('profiles', expect.objectContaining({ plan: 'gratuito', is_premium: false }))
  })

  it('es idempotente: si Stripe ya la reporta cancelada, no vuelve a cancelar, solo sincroniza', async () => {
    subscriptionRow = { stripe_subscription_id: 'sub_ya_cancelada' }
    mockRetrieve.mockResolvedValue({ status: 'canceled' })

    const resultado = await cancelarSuscripcionStripe('perfil-ya-cancelado')

    expect(resultado.ok).toBe(true)
    expect(resultado.accion).toBe('ya_estaba_cancelada')
    expect(mockCancel).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith('subscriptions', expect.objectContaining({ status: 'canceled' }))
  })

  it('simula un fallo de comunicación posterior a una cancelación real: el reintento no vuelve a cancelar', async () => {
    subscriptionRow = { stripe_subscription_id: 'sub_interrumpida' }
    // Primer intento: Stripe cancela correctamente, pero simulamos que el resultado nunca se procesó
    // (el propio test no llama a sincronizarLocal aparte -- lo relevante es el reintento).
    mockRetrieve.mockResolvedValueOnce({ status: 'active' })
    mockCancel.mockResolvedValueOnce({ status: 'canceled' })
    await cancelarSuscripcionStripe('perfil-interrumpido')
    expect(mockCancel).toHaveBeenCalledTimes(1)

    // Reintento: Stripe ya la reporta cancelada (la cancelación anterior sí llegó a completarse
    // en Stripe, solo falló nuestra comunicación) -- no debe cancelar una segunda vez.
    mockRetrieve.mockResolvedValueOnce({ status: 'canceled' })
    const resultadoReintento = await cancelarSuscripcionStripe('perfil-interrumpido')

    expect(resultadoReintento.accion).toBe('ya_estaba_cancelada')
    expect(mockCancel).toHaveBeenCalledTimes(1) // sigue en 1, no ha vuelto a cancelar
  })

  it('devuelve error y no sincroniza si Stripe falla al consultar el estado', async () => {
    subscriptionRow = { stripe_subscription_id: 'sub_error_consulta' }
    mockRetrieve.mockRejectedValue(new Error('network error'))

    const resultado = await cancelarSuscripcionStripe('perfil-error-consulta')

    expect(resultado.ok).toBe(false)
    expect(resultado.accion).toBe('error')
    expect(mockCancel).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('devuelve error y no sincroniza si Stripe falla al cancelar', async () => {
    subscriptionRow = { stripe_subscription_id: 'sub_error_cancelacion' }
    mockRetrieve.mockResolvedValue({ status: 'active' })
    mockCancel.mockRejectedValue(new Error('stripe down'))

    const resultado = await cancelarSuscripcionStripe('perfil-error-cancelacion')

    expect(resultado.ok).toBe(false)
    expect(resultado.accion).toBe('error')
    expect(updateSpy).not.toHaveBeenCalled()
  })
})
