import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks de las cuatro piezas que la Fase 6 reutiliza sin duplicar ────────
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

const mockCancelarStripe = vi.fn()
vi.mock('@/lib/cuenta/cancelar-suscripcion-stripe', () => ({
  cancelarSuscripcionStripe: (...args: unknown[]) => mockCancelarStripe(...args),
}))

// ── Admin/service client: rpc (Plano 2), auth.admin.updateUserById (Plano 1),
//    from(profiles).update(...).eq(...).is(...) (confirmación final) ──────
const mockRpc = vi.fn()
const mockUpdateUserById = vi.fn()
const mockFinalUpdateIs = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mockRpc,
    auth: { admin: { updateUserById: mockUpdateUserById } },
    from: () => ({
      update: () => ({
        eq: () => ({
          is: mockFinalUpdateIs,
        }),
      }),
    }),
  }),
}))

import { POST } from '../route'

function fakeRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as Parameters<typeof POST>[0]
}

const USER = { id: 'user-1', email: 'usuario@example.com' }

describe('POST /api/cuenta/eliminar/ejecutar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: USER } })
    mockVerificarReautenticacion.mockResolvedValue(true)
    mockVerificarCondiciones.mockResolvedValue({ cumpleTodas: true, condiciones: [] })
    mockCancelarStripe.mockResolvedValue({ ok: true, accion: 'sin_suscripcion', detalle: '' })
    mockRpc.mockResolvedValue({ error: null })
    mockUpdateUserById.mockResolvedValue({ error: null })
    mockFinalUpdateIs.mockResolvedValue({ error: null })
  })

  it('rechaza sin sesión', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(fakeRequest({}))
    expect(res.status).toBe(401)
  })

  it('es idempotente: si ya está extinguida, no repite ninguna suboperación', async () => {
    mockProfileSelect.mockResolvedValue({ data: { extincion_solicitada_at: '2026-01-01', identidad_extinguida_at: '2026-01-02' } })

    const res = await POST(fakeRequest({ password: 'x', consentimiento: true }))
    const body = await res.json()

    expect(body).toEqual({ ok: true, estado: 'ya_extinguida' })
    expect(mockCancelarStripe).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })

  it('rechaza si no hay ninguna solicitud de extinción en curso', async () => {
    mockProfileSelect.mockResolvedValue({ data: { extincion_solicitada_at: null, identidad_extinguida_at: null } })

    const res = await POST(fakeRequest({ password: 'x', consentimiento: true }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('no_hay_solicitud')
  })

  it('rechaza sin consentimiento, antes de tocar Stripe o cualquier plano', async () => {
    mockProfileSelect.mockResolvedValue({ data: { extincion_solicitada_at: '2026-01-01', identidad_extinguida_at: null } })

    const res = await POST(fakeRequest({ password: 'x', consentimiento: false }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('consentimiento_no_otorgado')
    expect(mockCancelarStripe).not.toHaveBeenCalled()
  })

  it('rechaza si la reautenticación falla, antes de tocar Stripe o cualquier plano', async () => {
    mockProfileSelect.mockResolvedValue({ data: { extincion_solicitada_at: '2026-01-01', identidad_extinguida_at: null } })
    mockVerificarReautenticacion.mockResolvedValue(false)

    const res = await POST(fakeRequest({ password: 'incorrecta', consentimiento: true }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('reautenticacion_fallida')
    expect(mockCancelarStripe).not.toHaveBeenCalled()
  })

  it('aborta sin tocar ningún plano si Stripe no se puede resolver', async () => {
    mockProfileSelect.mockResolvedValue({ data: { extincion_solicitada_at: '2026-01-01', identidad_extinguida_at: null } })
    mockCancelarStripe.mockResolvedValue({ ok: false, accion: 'error', detalle: 'stripe caído' })

    const res = await POST(fakeRequest({ password: 'x', consentimiento: true }))
    expect(res.status).toBe(502)
    expect((await res.json()).code).toBe('error_stripe')
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })

  it('aborta si las condiciones previas siguen sin cumplirse tras resolver Stripe (p. ej. credit_reservations)', async () => {
    mockProfileSelect.mockResolvedValue({ data: { extincion_solicitada_at: '2026-01-01', identidad_extinguida_at: null } })
    mockVerificarCondiciones.mockResolvedValue({ cumpleTodas: false, condiciones: [{ id: 'credit_reservations', cumple: false, detalle: 'activas' }] })

    const res = await POST(fakeRequest({ password: 'x', consentimiento: true }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('condiciones_no_cumplidas')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('ejecuta el evento completo, en orden, cuando todo se cumple', async () => {
    mockProfileSelect.mockResolvedValue({ data: { extincion_solicitada_at: '2026-01-01', identidad_extinguida_at: null } })

    const orden: string[] = []
    mockCancelarStripe.mockImplementation(async () => { orden.push('stripe'); return { ok: true, accion: 'sin_suscripcion', detalle: '' } })
    mockRpc.mockImplementation(async () => { orden.push('plano2'); return { error: null } })
    mockUpdateUserById.mockImplementation(async () => { orden.push('plano1'); return { error: null } })
    mockFinalUpdateIs.mockImplementation(async () => { orden.push('ancla'); return { error: null } })

    const res = await POST(fakeRequest({ password: 'correcta', consentimiento: true }))
    const body = await res.json()

    expect(body).toEqual({ ok: true, estado: 'identidad_extinguida' })
    expect(orden).toEqual(['stripe', 'plano2', 'plano1', 'ancla'])
  })

  it('si falla el Plano 2, no llega a tocar el Plano 1', async () => {
    mockProfileSelect.mockResolvedValue({ data: { extincion_solicitada_at: '2026-01-01', identidad_extinguida_at: null } })
    mockRpc.mockResolvedValue({ error: { message: 'fallo sql' } })

    const res = await POST(fakeRequest({ password: 'x', consentimiento: true }))
    expect(res.status).toBe(500)
    expect((await res.json()).code).toBe('error_plano2')
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })
})
