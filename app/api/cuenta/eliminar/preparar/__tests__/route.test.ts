import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks de las piezas que preparar reutiliza (Fases 3 y 4) ────────────────
const mockGetUser = vi.fn()
const mockProfileSelect = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockProfileSelect,
        }),
      }),
    }),
  }),
}))

const mockVerificarCondiciones = vi.fn()
vi.mock('@/lib/cuenta/verificar-condiciones-previas', () => ({
  verificarCondicionesPrevias: (...args: unknown[]) => mockVerificarCondiciones(...args),
}))

const mockVerificarReautenticacion = vi.fn()
vi.mock('@/lib/cuenta/verificar-reautenticacion', () => ({
  verificarReautenticacion: (...args: unknown[]) => mockVerificarReautenticacion(...args),
}))

import { POST } from '../route'

function fakeRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as Parameters<typeof POST>[0]
}

const USER = { id: 'user-1', email: 'usuario@example.com' }

// Condiciones con la forma exacta que devuelve verificarCondicionesPrevias.
const SUSCRIPCION_OK = { id: 'stripe_suscripcion', cumple: true, detalle: 'Sin suscripción registrada.' }
const SUSCRIPCION_ACTIVA = { id: 'stripe_suscripcion', cumple: false, detalle: 'Suscripción en estado "active" -- debe resolverse antes de continuar.' }
const COBROS_OK = { id: 'stripe_cobros_pendientes', cumple: true, detalle: 'Sin suscripciones abiertas en Stripe.' }
const COBROS_ABIERTOS = { id: 'stripe_cobros_pendientes', cumple: false, detalle: 'Stripe reporta 1 suscripción(es) abierta(s): active.' }
const STRIPE_SIN_RESPUESTA = { id: 'stripe_cobros_pendientes', cumple: false, detalle: 'No se pudo verificar el estado real en Stripe -- tratado como impedimento por precaución.' }
const RESERVAS_OK = { id: 'credit_reservations', cumple: true, detalle: 'Sin reservas de crédito activas.' }
const RESERVAS_ACTIVAS = { id: 'credit_reservations', cumple: false, detalle: '2 reserva(s) de crédito activas -- condición candidata (DA-005), pendiente de decisión del Credit Manager.' }

function diagnostico(...condiciones: { id: string; cumple: boolean; detalle: string }[]) {
  return { cumpleTodas: condiciones.every(c => c.cumple), condiciones }
}

const BODY_VALIDO = { password: 'correcta', consentimiento: true }

describe('POST /api/cuenta/eliminar/preparar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: USER } })
    mockProfileSelect.mockResolvedValue({ data: { extincion_solicitada_at: '2026-01-01' } })
    mockVerificarCondiciones.mockResolvedValue(diagnostico(SUSCRIPCION_OK, RESERVAS_OK))
    mockVerificarReautenticacion.mockResolvedValue(true)
  })

  // ── AEC-003C: las condiciones de Stripe ya no bloquean ─────────────────────

  it('con suscripción activa, deja continuar y avisa de que se cancelará', async () => {
    mockVerificarCondiciones.mockResolvedValue(diagnostico(SUSCRIPCION_ACTIVA, COBROS_ABIERTOS, RESERVAS_OK))

    const res = await POST(fakeRequest(BODY_VALIDO))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, listo: true, suscripcionSeCancelara: true })
  })

  it('si Stripe no responde, deja continuar y avisa (ejecutar vuelve a consultarlo y aborta si sigue caído)', async () => {
    mockVerificarCondiciones.mockResolvedValue(diagnostico(SUSCRIPCION_ACTIVA, STRIPE_SIN_RESPUESTA, RESERVAS_OK))

    const res = await POST(fakeRequest(BODY_VALIDO))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, listo: true, suscripcionSeCancelara: true })
  })

  it('si Stripe no responde aunque la fila local esté cancelada, también avisa', async () => {
    mockVerificarCondiciones.mockResolvedValue(diagnostico(
      { id: 'stripe_suscripcion', cumple: true, detalle: 'Suscripción cancelada.' },
      STRIPE_SIN_RESPUESTA,
      RESERVAS_OK,
    ))

    const res = await POST(fakeRequest(BODY_VALIDO))

    expect(res.status).toBe(200)
    expect((await res.json()).suscripcionSeCancelara).toBe(true)
  })

  it('sin suscripción, deja continuar sin aviso', async () => {
    mockVerificarCondiciones.mockResolvedValue(diagnostico(SUSCRIPCION_OK, COBROS_OK, RESERVAS_OK))

    const res = await POST(fakeRequest(BODY_VALIDO))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, listo: true, suscripcionSeCancelara: false })
  })

  // ── credit_reservations sigue bloqueando, sin cambios ──────────────────────

  it('con reservas de crédito activas sigue bloqueando, antes de consentimiento y reautenticación', async () => {
    const diag = diagnostico(SUSCRIPCION_OK, RESERVAS_ACTIVAS)
    mockVerificarCondiciones.mockResolvedValue(diag)

    const res = await POST(fakeRequest(BODY_VALIDO))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, code: 'condiciones_no_cumplidas', diagnostico: diag })
    expect(mockVerificarReautenticacion).not.toHaveBeenCalled()
  })

  it('con reservas de crédito activas sigue bloqueando aunque además haya suscripción activa', async () => {
    const diag = diagnostico(SUSCRIPCION_ACTIVA, COBROS_ABIERTOS, RESERVAS_ACTIVAS)
    mockVerificarCondiciones.mockResolvedValue(diag)

    const res = await POST(fakeRequest(BODY_VALIDO))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, code: 'condiciones_no_cumplidas', diagnostico: diag })
    expect(mockVerificarReautenticacion).not.toHaveBeenCalled()
  })

  // ── Resto de comprobaciones: igual que antes de AEC-003C ───────────────────

  it('rechaza sin sesión', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await POST(fakeRequest(BODY_VALIDO))

    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe('unauthenticated')
    expect(mockVerificarCondiciones).not.toHaveBeenCalled()
  })

  it('rechaza si no hay ninguna solicitud de extinción en curso', async () => {
    mockProfileSelect.mockResolvedValue({ data: { extincion_solicitada_at: null } })

    const res = await POST(fakeRequest(BODY_VALIDO))

    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('no_hay_solicitud')
    expect(mockVerificarCondiciones).not.toHaveBeenCalled()
  })

  it('rechaza sin consentimiento, antes de la reautenticación', async () => {
    mockVerificarCondiciones.mockResolvedValue(diagnostico(SUSCRIPCION_ACTIVA, COBROS_ABIERTOS, RESERVAS_OK))

    const res = await POST(fakeRequest({ password: 'correcta', consentimiento: false }))

    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('consentimiento_no_otorgado')
    expect(mockVerificarReautenticacion).not.toHaveBeenCalled()
  })

  it('rechaza con contraseña incorrecta', async () => {
    mockVerificarCondiciones.mockResolvedValue(diagnostico(SUSCRIPCION_ACTIVA, COBROS_ABIERTOS, RESERVAS_OK))
    mockVerificarReautenticacion.mockResolvedValue(false)

    const res = await POST(fakeRequest({ password: 'incorrecta', consentimiento: true }))

    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('contrasena_incorrecta')
    expect(mockVerificarReautenticacion).toHaveBeenCalledWith(USER.email, 'incorrecta')
  })
})
