import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyAndReserve } from '@/lib/accounting-engine'
import type { ProfessionalContext } from '@/lib/professional-context-engine'
import type { DecisionContext } from '@/lib/decision-engine'
import { buildAuthorizationContext } from '../authorize'

vi.mock('@/lib/accounting-engine', () => ({
  verifyAndReserve: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(verifyAndReserve).mockReset()
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
    executionStrategy: {
      executionMode: 'IA',
      recommendedAgent: null,
      recommendedProvider: null,
      priorityLevel: 'media',
      executionPolicy: null,
    },
    needsAI: true,
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
    })

    const result = await buildAuthorizationContext(fakeProfessionalContext('30'), fakeDecisionContext())

    expect(result.authorizationStatus).toBe('DENIED')
    expect(result.authorizationReason).toBe(
      'VERIFICACION_NEGATIVA: consumo_actual(28) + coste_estimado(5) > limite_autorizado(30)'
    )
    expect(result.availableCredits).toBe(2)
    expect(result.remainingQuota).toBe(2)
    expect(verifyAndReserve).toHaveBeenCalledWith('user-1', 30, 5)
  })

  it('VERIFICADO (ILIMITADO): autoriza directamente sin invocar verifyAndReserve cuando el plan es sin control de cuota (IA-AUTH-001, PRD-001)', async () => {
    const result = await buildAuthorizationContext(fakeProfessionalContext('ILIMITADO'), fakeDecisionContext())

    expect(result.authorizationStatus).toBe('AUTHORIZED')
    expect(result.authorizationReason).toBe('VERIFICADO: plan sin control de cuota (IA-AUTH-001)')
    expect(result.availableCredits).toBeNull()
    expect(result.remainingQuota).toBeNull()
    expect(verifyAndReserve).not.toHaveBeenCalled()
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
    })

    const result = await buildAuthorizationContext(fakeProfessionalContext('30'), fakeDecisionContext())

    expect(result.authorizationStatus).toBe('AUTHORIZED')
    expect(result.authorizationReason).toBe('VERIFICADO: reserva de credito confirmada')
    expect(result.availableCredits).toBe(30)
    expect(result.estimatedCost).toBe(5)
    expect(result.remainingQuota).toBe(25)
  })
})
