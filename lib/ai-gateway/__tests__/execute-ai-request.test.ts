import { describe, it, expect } from 'vitest'
import type { DecisionContext } from '@/lib/decision-engine'
import type { AuthorizationContext } from '@/lib/credit-manager'
import { executeAIRequest } from '../execute-ai-request'

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
    estimatedCost: null,
    decisionConfidence: 1,
    decisionRationale: 'rationale de prueba',
    ...overrides,
  }
}

function fakeAuthorizationContext(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    authorizationStatus: 'AUTHORIZED',
    authorizationReason: 'VERIFICADO: reserva de credito confirmada',
    availableCredits: 30,
    estimatedCost: 5,
    remainingQuota: 25,
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

const EMPTY_AUDIT = {
  providerIdentifier: null,
  providerModel: null,
  executionLatencyMs: null,
  tokensConsumed: null,
  realExecutionCost: null,
  technicalMetadata: null,
}

describe('executeAIRequest', () => {
  it('NO_AUTORIZADO cuando AuthorizationStatus no es AUTHORIZED', async () => {
    const { result, audit } = await executeAIRequest(
      fakeDecisionContext(),
      fakeAuthorizationContext({ authorizationStatus: 'DENIED' })
    )

    expect(result.executionStatus).toBe('NO_AUTORIZADO')
    expect(result.generatedContent).toBeNull()
    expect(audit).toEqual(EMPTY_AUDIT)
  })

  it('NO_REQUERIDO cuando needsAI es false, incluso si estuviera autorizado', async () => {
    const { result } = await executeAIRequest(
      fakeDecisionContext({ needsAI: false }),
      fakeAuthorizationContext()
    )

    expect(result.executionStatus).toBe('NO_REQUERIDO')
  })

  it('SIN_PROVEEDOR cuando no hay proveedor recomendado', async () => {
    const { result, audit } = await executeAIRequest(fakeDecisionContext(), fakeAuthorizationContext())

    expect(result.executionStatus).toBe('SIN_PROVEEDOR')
    expect(result.executionWarnings).toContain('sin proveedor de IA recomendado (Decision Engine no lo determino)')
    expect(audit).toEqual(EMPTY_AUDIT)
  })

  it('SIN_PROVEEDOR con mensaje distinto cuando sí hay proveedor recomendado pero sin integración', async () => {
    const { result } = await executeAIRequest(
      fakeDecisionContext({
        executionStrategy: {
          executionMode: 'IA',
          recommendedAgent: null,
          recommendedProvider: 'claude',
          priorityLevel: 'media',
          executionPolicy: null,
        },
      }),
      fakeAuthorizationContext()
    )

    expect(result.executionStatus).toBe('SIN_PROVEEDOR')
    expect(result.executionWarnings).toContain('proveedor recomendado (claude) sin integracion tecnica configurada')
  })

  it('produce siempre un ExecutionAudit, incluso sin ejecución real', async () => {
    const { audit } = await executeAIRequest(fakeDecisionContext(), fakeAuthorizationContext())

    expect(audit).toEqual(EMPTY_AUDIT)
  })

  it('no muta los objetos de entrada', async () => {
    const decisionContext = fakeDecisionContext()
    const authorizationContext = fakeAuthorizationContext()
    const decisionSnapshot = JSON.stringify(decisionContext)
    const authorizationSnapshot = JSON.stringify(authorizationContext)

    await executeAIRequest(decisionContext, authorizationContext)

    expect(JSON.stringify(decisionContext)).toBe(decisionSnapshot)
    expect(JSON.stringify(authorizationContext)).toBe(authorizationSnapshot)
  })
})
