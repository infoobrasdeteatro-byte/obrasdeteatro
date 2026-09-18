import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyAndReserve } from '@/lib/accounting-engine'
import type { ProfessionalContext } from '@/lib/professional-context-engine'
import type { DecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '../authorize'
import { getUsageLimit } from '@/lib/repository-layer'

vi.mock('@/lib/accounting-engine', () => ({
  verifyAndReserve: vi.fn(),
}))

/** Reserva concedida por defecto: los tests que necesiten otra cosa la sobrescriben. */
function reservaConcedida(authorizedLimitSnapshot: number | null) {
  return {
    authorized: true as const,
    reservation: {
      id: 'reservation-1',
      profileId: 'user-1',
      requestId: null,
      status: 'active' as const,
      estimatedCost: 5,
      settledCost: null,
      authorizedLimitSnapshot,
      expiresAt: 'T+5m',
      createdAt: 'T',
      settledAt: null,
    },
    budget: {
      periodStart: 'P',
      settledConsumption: 0,
      reservedConsumption: 0,
      availableCapacity: authorizedLimitSnapshot,
    },
  }
}

beforeEach(() => {
  vi.mocked(verifyAndReserve).mockReset().mockResolvedValue(reservaConcedida(null))
})

function fakeProfessionalContext(usageLimits: string | null): ProfessionalContext {
  return {
    identity: {
      userId: 'user-1',
      profileType: 'actor',
      language: 'es',
      country: 'ES',
      timezone: null,
      authenticationStatus: 'autenticado',
    },
    subscription: { plan: null, status: null, availableCapabilities: null, usageLimits },
    professionalProfile: { specialty: null, disciplines: null, experience: null, publicProfile: null },
    session: { route: null, module: null, locale: 'es', timestamp: new Date().toISOString() },
  }
}

function fakeDecisionContext(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    requestId: 'req-1',
    executionStrategy: {
      executionMode: 'IA',
      recommendedAgent: null,
      recommendedProvider: null,
      priorityLevel: 'media',
      executionPolicy: null,
    },
    needsAI: true,
    operationEstimates: [],
    estimatedCost: 5,
    decisionConfidence: 1,
    decisionRationale: 'rationale de prueba',
    ...overrides,
  }
}

describe('buildAuthorizationContext', () => {
  it('NO_APLICA: needsAI=false autoriza trivialmente sin verificar nada', async () => {
    const result = await buildAuthorizationContext(
      fakeProfessionalContext(null),
      fakeDecisionContext({ needsAI: false })
    )

    expect(result.authorizationStatus).toBe('AUTHORIZED')
    expect(result.authorizationReason).toBe('NO_APLICA: no se requiere IA para esta peticion')
    expect(result.availableCredits).toBeNull()
    expect(result.estimatedCost).toBeNull()
    expect(result.remainingQuota).toBeNull()
    expect(verifyAndReserve).not.toHaveBeenCalled()
  })

  it('SIN_DATOS_VERIFICABLES (IA-004): deniega sin intentar la reserva si no hay coste estimado', async () => {
    const result = await buildAuthorizationContext(
      fakeProfessionalContext('30'),
      fakeDecisionContext({ estimatedCost: null })
    )

    expect(result.authorizationStatus).toBe('DENIED')
    expect(result.authorizationReason).toBe('SIN_DATOS_VERIFICABLES: coste estimado no disponible (IA-004)')
    expect(verifyAndReserve).not.toHaveBeenCalled()
  })

  it('SIN_DATOS_VERIFICABLES (IA-001): deniega sin intentar la reserva si no hay limite de plan', async () => {
    const result = await buildAuthorizationContext(fakeProfessionalContext(null), fakeDecisionContext())

    expect(result.authorizationStatus).toBe('DENIED')
    expect(result.authorizationReason).toBe('SIN_DATOS_VERIFICABLES: limite de plan no disponible (IA-001)')
    expect(verifyAndReserve).not.toHaveBeenCalled()
  })

  it('VERIFICACION_NEGATIVA: deniega cuando Accounting Engine deniega la reserva', async () => {
    vi.mocked(verifyAndReserve).mockResolvedValue({
      authorized: false,
      currentConsumption: 28,
      denialReason: 'consumo_actual(28) + coste_estimado(5) > limite_autorizado(30)',
      budget: { periodStart: '2026-08-01T00:00:00.000Z', settledConsumption: 0, reservedConsumption: 0, availableCapacity: 25 },
    })

    const result = await buildAuthorizationContext(fakeProfessionalContext('30'), fakeDecisionContext())

    expect(result.authorizationStatus).toBe('DENIED')
    expect(result.authorizationReason).toBe(
      'VERIFICACION_NEGATIVA: consumo_actual(28) + coste_estimado(5) > limite_autorizado(30)'
    )
    expect(result.availableCredits).toBe(2)
    expect(result.remainingQuota).toBe(2)
    // El requestId viaja hasta la reserva desde el cierre del circuito economico.
    expect(verifyAndReserve).toHaveBeenCalledWith('user-1', 30, 5, 'req-1')
  })

  /**
   * BLOQUE 2 — un plan ilimitado deja de estar fuera del circuito economico.
   *
   * Este test sustituye al que afirmaba lo contrario ("autoriza
   * directamente sin invocar verifyAndReserve"). Aquel no era un test
   * equivocado: describia con exactitud el comportamiento de entonces, en
   * el que el unico plan sin techo era tambien el unico del que no se
   * sabia nada. Lo que ha cambiado es la decision, no la prueba.
   *
   * Medir no es limitar: la promesa comercial "ilimitado" queda intacta y
   * lo unico que se anade es que la operacion pasa por reserva,
   * liquidacion y telemetria como cualquier otra.
   */
  it('VERIFICADO (ILIMITADO): reserva para MEDIR, sin dejar de autorizar', async () => {
    const result = await buildAuthorizationContext(fakeProfessionalContext('ILIMITADO'), fakeDecisionContext())

    expect(result.authorizationStatus).toBe('AUTHORIZED')
    expect(result.reservationId).toBe('reservation-1')
    expect(verifyAndReserve).toHaveBeenCalled()
  })

  it('ILIMITADO: el limite viaja como AUSENCIA de limite, jamas como una cifra convenida', async () => {
    await buildAuthorizationContext(fakeProfessionalContext('ILIMITADO'), fakeDecisionContext())

    const [, limiteEnviado] = vi.mocked(verifyAndReserve).mock.calls[0]

    expect(limiteEnviado).toBeNull()
    // Ningun valor magico: ni cero, ni un numero enorme que signifique "sin techo".
    expect(typeof limiteEnviado).not.toBe('number')
  })

  it('ILIMITADO: sin techo, cupo y cuota restante no son cero -- no existen', async () => {
    const result = await buildAuthorizationContext(fakeProfessionalContext('ILIMITADO'), fakeDecisionContext())

    expect(result.availableCredits).toBeNull()
    expect(result.remainingQuota).toBeNull()
    expect(result.availableCredits).not.toBe(0)
  })

  it('ILIMITADO: la razon declara que la reserva es para medir, no para limitar', async () => {
    const result = await buildAuthorizationContext(fakeProfessionalContext('ILIMITADO'), fakeDecisionContext())

    expect(result.authorizationReason).toContain('plan sin control de cuota')
    expect(result.authorizationReason).toContain('medir')
  })

  it('ILIMITADO: hay reservationId, luego el circuito puede cerrarse despues', async () => {
    const result = await buildAuthorizationContext(fakeProfessionalContext('ILIMITADO'), fakeDecisionContext())

    // Sin identificador de reserva no habria nada que liquidar: era
    // exactamente lo que impedia registrar el coste de este plan.
    expect(result.reservationId).not.toBeNull()
    expect(typeof result.reservationId).toBe('string')
  })

  it('ILIMITADO: el coste estimado se registra igual que en cualquier plan', async () => {
    const result = await buildAuthorizationContext(fakeProfessionalContext('ILIMITADO'), fakeDecisionContext())

    expect(result.estimatedCost).toBe(5)
  })

  it('LIMITADO: el limite sigue viajando como cifra, sin cambio alguno', async () => {
    await buildAuthorizationContext(fakeProfessionalContext('30'), fakeDecisionContext())

    expect(verifyAndReserve).toHaveBeenCalledWith('user-1', 30, 5, 'req-1')
  })

  it('VERIFICADO: autoriza cuando Accounting Engine confirma la reserva', async () => {
    vi.mocked(verifyAndReserve).mockResolvedValue({
      authorized: true,
      reservation: {
        id: 'reservation-1',
        profileId: 'user-1',
        requestId: null,
        status: 'active',
        estimatedCost: 5,
        settledCost: null,
        authorizedLimitSnapshot: 30,
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        settledAt: null,
      },
      budget: { periodStart: '2026-08-01T00:00:00.000Z', settledConsumption: 0, reservedConsumption: 0, availableCapacity: 25 },
    })

    const result = await buildAuthorizationContext(fakeProfessionalContext('30'), fakeDecisionContext())

    expect(result.authorizationStatus).toBe('AUTHORIZED')
    expect(result.authorizationReason).toBe('VERIFICADO: reserva de credito confirmada')
    expect(result.availableCredits).toBe(30)
    expect(result.estimatedCost).toBe(5)
    expect(result.remainingQuota).toBe(25)
  })
})


/**
 * BLOQUE 5 — cuotas comerciales y rechazo controlado.
 *
 * Ninguna de estas pruebas escribe una cifra de cuota: la obtienen de
 * `getUsageLimit`, su unica fuente. Si manana Direccion cambia Premium,
 * estas pruebas siguen siendo validas -- y siguen protegiendo lo que de
 * verdad importa, que es COMO se comporta el sistema al agotarse la cuota,
 * no cuanto vale.
 */
describe('buildAuthorizationContext — cuota de IA y causa de denegacion (Bloque 5)', () => {
  const CUOTA_PREMIUM = getUsageLimit('premium')

  it('DETERMINISTA: una peticion que no necesita IA no toca la cuota ni lleva causa', async () => {
    const result = await buildAuthorizationContext(
      fakeProfessionalContext(CUOTA_PREMIUM),
      fakeDecisionContext({ needsAI: false })
    )

    // Los creditos que se cuentan son de IA. Lo determinista no reserva,
    // no consume y no puede agotarse.
    expect(verifyAndReserve).not.toHaveBeenCalled()
    expect(result.authorizationStatus).toBe('AUTHORIZED')
    expect(result.denialCode).toBeNull()
  })

  it('CUOTA AGOTADA: la unica denegacion que significa "has gastado tu cuota de IA"', async () => {
    vi.mocked(verifyAndReserve).mockResolvedValue({
      authorized: false,
      currentConsumption: 100,
      denialReason: 'presupuesto del periodo agotado',
      budget: { periodStart: '2026-08-01T00:00:00.000Z', settledConsumption: 100, reservedConsumption: 0, availableCapacity: 0 },
    })

    const result = await buildAuthorizationContext(fakeProfessionalContext(CUOTA_PREMIUM), fakeDecisionContext())

    expect(result.authorizationStatus).toBe('DENIED')
    expect(result.denialCode).toBe('insufficient_ai_credits')
  })

  it('PLAN DESCONOCIDO: no es cuota agotada -- el usuario no ha gastado nada', async () => {
    const result = await buildAuthorizationContext(fakeProfessionalContext(null), fakeDecisionContext())

    expect(result.denialCode).toBe('plan_quota_unknown')
    expect(result.denialCode).not.toBe('insufficient_ai_credits')
    // Y no se le imputa consumo alguno.
    expect(result.availableCredits).toBeNull()
    expect(result.remainingQuota).toBeNull()
    expect(verifyAndReserve).not.toHaveBeenCalled()
  })

  it('COSTE NO ESTIMABLE: tampoco es cuota agotada -- no se llego a verificar presupuesto', async () => {
    const result = await buildAuthorizationContext(
      fakeProfessionalContext(CUOTA_PREMIUM),
      fakeDecisionContext({ estimatedCost: null })
    )

    expect(result.denialCode).toBe('estimated_cost_unknown')
    expect(verifyAndReserve).not.toHaveBeenCalled()
  })

  it('AUTORIZADO: una concesion nunca lleva causa de denegacion', async () => {
    const result = await buildAuthorizationContext(fakeProfessionalContext(CUOTA_PREMIUM), fakeDecisionContext())

    expect(result.authorizationStatus).toBe('AUTHORIZED')
    expect(result.denialCode).toBeNull()
  })

  it('LAS TRES CAUSAS SON DISTINGUIBLES entre si, sin leer el texto de la razon', async () => {
    vi.mocked(verifyAndReserve).mockResolvedValue({
      authorized: false,
      currentConsumption: 100,
      denialReason: 'presupuesto del periodo agotado',
      budget: { periodStart: 'P', settledConsumption: 100, reservedConsumption: 0, availableCapacity: 0 },
    })

    const causas = [
      (await buildAuthorizationContext(fakeProfessionalContext(CUOTA_PREMIUM), fakeDecisionContext())).denialCode,
      (await buildAuthorizationContext(fakeProfessionalContext(null), fakeDecisionContext())).denialCode,
      (await buildAuthorizationContext(fakeProfessionalContext(CUOTA_PREMIUM), fakeDecisionContext({ estimatedCost: null }))).denialCode,
    ]

    expect(new Set(causas).size).toBe(3)
  })

  it('EMPRESAS: reserva con techo ausente, mide, y no puede agotar una cuota que no tiene', async () => {
    const result = await buildAuthorizationContext(
      fakeProfessionalContext(getUsageLimit('empresas')),
      fakeDecisionContext()
    )

    // Reserva REAL -- se mide igual que cualquier otro plan --, con `null`
    // como techo: ausencia de limite, nunca cero ni un numero grande.
    expect(verifyAndReserve).toHaveBeenCalledWith('user-1', null, 5, 'req-1')
    expect(result.authorizationStatus).toBe('AUTHORIZED')
    expect(result.reservationId).not.toBeNull()
    expect(result.denialCode).toBeNull()
    // "Cuota restante" no vale cero: es una magnitud que no existe aqui.
    expect(result.availableCredits).toBeNull()
    expect(result.remainingQuota).toBeNull()
  })

  it('EL TECHO QUE SE APLICA es el que declara la fuente unica, no uno propio de Credit Manager', async () => {
    await buildAuthorizationContext(fakeProfessionalContext(CUOTA_PREMIUM), fakeDecisionContext())

    const [, techoAplicado] = vi.mocked(verifyAndReserve).mock.calls[0]

    expect(techoAplicado).toBe(Number(CUOTA_PREMIUM))
  })
})
