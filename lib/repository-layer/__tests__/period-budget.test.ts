import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { verifyAndReserve } from '../accounting'
import { createFakeSupabaseRpcClient } from './test-utils'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

beforeEach(() => vi.mocked(createClient).mockReset())

/**
 * Presupuesto de consumo por periodo.
 *
 * Lo que se comprueba aqui es el CONTRATO que la operacion atomica devuelve:
 * que el desglose del periodo llega intacto y que sus dos consumos siguen
 * siendo hechos distintos. La aritmetica y la exclusion mutua las decide la
 * propia funcion en base de datos, dentro del bloqueo por perfil -- no se
 * reimplementan aqui, porque reimplementarlas seria probar una copia en vez
 * del mecanismo real.
 */
function filaDePresupuesto(overrides: Record<string, unknown> = {}) {
  return {
    authorized: true,
    reservation_id: 'reservation-1',
    status: 'active',
    estimated_cost: 1,
    authorized_limit_snapshot: 30,
    expires_at: '2026-08-29T00:05:00.000Z',
    created_at: '2026-08-29T00:00:00.000Z',
    current_consumption: 10,
    denial_reason: null,
    period_start: '2026-08-01T00:00:00.000Z',
    settled_consumption: 7,
    reserved_consumption: 3,
    available_capacity: 19,
    ...overrides,
  }
}

async function reservar(fila: Record<string, unknown>) {
  const { client } = createFakeSupabaseRpcClient({ data: fila, error: null })
  vi.mocked(createClient).mockResolvedValue(client as never)
  return verifyAndReserve('profile-1', 30, 1, 300, 'req-1')
}

describe('presupuesto del periodo — capacidad disponible', () => {
  it('el periodo vigente viaja en el resultado: el saldo siempre esta fechado', async () => {
    const outcome = await reservar(filaDePresupuesto())

    expect(outcome.budget.periodStart).toBe('2026-08-01T00:00:00.000Z')
  })

  it('distingue consumo CONFIRMADO de consumo COMPROMETIDO: no son lo mismo', async () => {
    const outcome = await reservar(filaDePresupuesto())

    // Lo liquidado ya no vuelve; lo reservado todavia puede liberarse.
    expect(outcome.budget.settledConsumption).toBe(7)
    expect(outcome.budget.reservedConsumption).toBe(3)
    expect(outcome.budget.availableCapacity).toBe(19)
  })

  it('con presupuesto disponible, autoriza y aparta capacidad', async () => {
    const outcome = await reservar(filaDePresupuesto())

    expect(outcome.authorized).toBe(true)
    if (outcome.authorized) expect(outcome.reservation.id).toBe('reservation-1')
  })

  it('PRESUPUESTO AGOTADO: deniega, y el motivo dice de que se compone el consumo', async () => {
    const outcome = await reservar(
      filaDePresupuesto({
        authorized: false,
        reservation_id: null,
        status: null,
        expires_at: null,
        created_at: null,
        current_consumption: 30,
        settled_consumption: 28,
        reserved_consumption: 2,
        available_capacity: 0,
        denial_reason:
          'presupuesto del periodo agotado: confirmado(28) + comprometido(2) + coste_estimado(1) > limite_autorizado(30)',
      })
    )

    expect(outcome.authorized).toBe(false)
    if (!outcome.authorized) {
      expect(outcome.denialReason).toContain('presupuesto del periodo agotado')
      expect(outcome.denialReason).toContain('confirmado(28)')
      expect(outcome.denialReason).toContain('comprometido(2)')
    }
    expect(outcome.budget.availableCapacity).toBe(0)
  })

  it('una denegacion tambien informa del presupuesto: el usuario no se queda a oscuras', async () => {
    const outcome = await reservar(
      filaDePresupuesto({ authorized: false, reservation_id: null, status: null, expires_at: null, created_at: null, available_capacity: 0 })
    )

    expect(outcome.budget.periodStart).toBe('2026-08-01T00:00:00.000Z')
    expect(outcome.budget.settledConsumption).toBe(7)
  })

  it('LAS RESERVAS VIVAS CUENTAN: capacidad restante ya las descuenta', async () => {
    // Es lo que impide que dos peticiones concurrentes vean el mismo saldo.
    const outcome = await reservar(
      filaDePresupuesto({ settled_consumption: 0, reserved_consumption: 29, available_capacity: 0 })
    )

    expect(outcome.budget.reservedConsumption).toBe(29)
    expect(outcome.budget.availableCapacity).toBe(0)
  })

  it('CAMBIO DE PERIODO: el mes nuevo empieza sin consumo confirmado', async () => {
    const outcome = await reservar(
      filaDePresupuesto({
        period_start: '2026-09-01T00:00:00.000Z',
        settled_consumption: 0,
        reserved_consumption: 0,
        current_consumption: 0,
        available_capacity: 29,
      })
    )

    expect(outcome.budget.periodStart).toBe('2026-09-01T00:00:00.000Z')
    expect(outcome.budget.settledConsumption).toBe(0)
    expect(outcome.budget.availableCapacity).toBe(29)
  })

  it('el requestId viaja hasta la operacion economica', async () => {
    const { client, rpc } = createFakeSupabaseRpcClient({ data: filaDePresupuesto(), error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)

    await verifyAndReserve('profile-1', 30, 1, 300, 'req-1')

    expect(rpc).toHaveBeenCalledWith(
      'accounting_verify_and_reserve',
      expect.objectContaining({ p_request_id: 'req-1', p_profile_id: 'profile-1', p_authorized_limit: 30 })
    )
  })

  it('el presupuesto admite importes fraccionarios: la unidad no es "una pregunta"', async () => {
    const outcome = await reservar(
      filaDePresupuesto({ estimated_cost: 0.37, settled_consumption: 1.25, reserved_consumption: 0.5, available_capacity: 27.88 })
    )

    expect(outcome.budget.settledConsumption).toBe(1.25)
    expect(outcome.budget.availableCapacity).toBe(27.88)
  })
})
