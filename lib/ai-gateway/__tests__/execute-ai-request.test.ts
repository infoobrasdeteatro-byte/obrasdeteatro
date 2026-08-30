import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DecisionContext } from '@/lib/decision-engine'
import type { AuthorizationContext } from '@/lib/credit-manager'
import { findProviderAdapter } from '../provider-registry'
import { ProviderAdapterError } from '../provider-adapter'
import { executeAIRequest } from '../execute-ai-request'

vi.mock('../provider-registry', () => ({ findProviderAdapter: vi.fn() }))

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
    reservationId: null,
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
  // IA-006: el desglose que el proveedor publica cuando ejecuta. En un
  // audit vacio -- no autorizado, sin proveedor, error -- es `null` como
  // todo lo demas: no hubo ejecucion de la que informar.
  inputTokens: null,
  outputTokens: null,
  realExecutionCost: null,
  technicalMetadata: null,
}

beforeEach(() => {
  vi.mocked(findProviderAdapter).mockReset()
})

describe('executeAIRequest', () => {
  it('NO_AUTORIZADO cuando AuthorizationStatus no es AUTHORIZED', async () => {
    const { result, audit } = await executeAIRequest({
      decisionContext: fakeDecisionContext(),
      authorizationContext: fakeAuthorizationContext({ authorizationStatus: 'DENIED' }),
      normalizedAIRequest: { userPrompt: 'hola' },
    })

    expect(result.executionStatus).toBe('NO_AUTORIZADO')
    expect(result.generatedContent).toBeNull()
    expect(audit).toEqual(EMPTY_AUDIT)
    expect(findProviderAdapter).not.toHaveBeenCalled()
  })

  it('NO_REQUERIDO cuando needsAI es false, incluso si estuviera autorizado', async () => {
    const { result } = await executeAIRequest({
      decisionContext: fakeDecisionContext({ needsAI: false }),
      authorizationContext: fakeAuthorizationContext(),
      normalizedAIRequest: { userPrompt: '' },
    })

    expect(result.executionStatus).toBe('NO_REQUERIDO')
  })

  it('lanza un error explícito si needsAI es true y userPrompt está vacío (IA-OPENAI-002)', async () => {
    await expect(
      executeAIRequest({
        decisionContext: fakeDecisionContext(),
        authorizationContext: fakeAuthorizationContext(),
        normalizedAIRequest: { userPrompt: '   ' },
      })
    ).rejects.toThrow(/userPrompt es obligatorio/)

    expect(findProviderAdapter).not.toHaveBeenCalled()
  })

  it('SIN_PROVEEDOR cuando no hay proveedor recomendado', async () => {
    const { result, audit } = await executeAIRequest({
      decisionContext: fakeDecisionContext(),
      authorizationContext: fakeAuthorizationContext(),
      normalizedAIRequest: { userPrompt: 'hola' },
    })

    expect(result.executionStatus).toBe('SIN_PROVEEDOR')
    expect(result.executionWarnings).toContain('sin proveedor de IA recomendado (Decision Engine no lo determino)')
    expect(audit).toEqual(EMPTY_AUDIT)
    expect(findProviderAdapter).not.toHaveBeenCalled()
  })

  it('SIN_PROVEEDOR cuando hay proveedor recomendado pero ningún adaptador está registrado para él', async () => {
    vi.mocked(findProviderAdapter).mockReturnValue(null)

    const { result } = await executeAIRequest({
      decisionContext: fakeDecisionContext({
        executionStrategy: {
          executionMode: 'IA',
          recommendedAgent: null,
          recommendedProvider: 'proveedor-no-registrado',
          priorityLevel: 'media',
          executionPolicy: null,
        },
      }),
      authorizationContext: fakeAuthorizationContext(),
      normalizedAIRequest: { userPrompt: 'hola' },
    })

    expect(result.executionStatus).toBe('SIN_PROVEEDOR')
    expect(result.executionWarnings).toContain('proveedor recomendado (proveedor-no-registrado) sin adaptador registrado')
    expect(findProviderAdapter).toHaveBeenCalledWith('proveedor-no-registrado')
  })

  it('EJECUTADO cuando el adaptador responde correctamente', async () => {
    vi.mocked(findProviderAdapter).mockReturnValue({
      providerId: 'openai',
      execute: vi.fn().mockResolvedValue({
        content: 'contenido generado',
        model: 'gpt-4o-mini',
        latencyMs: 120,
        tokensConsumed: 42,
        inputTokens: 30,
        outputTokens: 12,
      }),
    })

    const { result, audit } = await executeAIRequest({
      decisionContext: fakeDecisionContext({
        executionStrategy: {
          executionMode: 'IA',
          recommendedAgent: null,
          recommendedProvider: 'openai',
          priorityLevel: 'media',
          executionPolicy: null,
        },
      }),
      authorizationContext: fakeAuthorizationContext(),
      normalizedAIRequest: { userPrompt: 'hola' },
    })

    expect(result.executionStatus).toBe('EJECUTADO')
    expect(result.generatedContent).toBe('contenido generado')
    expect(audit).toEqual({
      providerIdentifier: 'openai',
      providerModel: 'gpt-4o-mini',
      executionLatencyMs: 120,
      tokensConsumed: 42,
      // El desglose que el proveedor publico viaja intacto hasta el audit.
      inputTokens: 30,
      outputTokens: 12,
      realExecutionCost: null,
      technicalMetadata: null,
    })
  })

  it('ERROR_COMUNICACION cuando el adaptador lanza ProviderAdapterError', async () => {
    vi.mocked(findProviderAdapter).mockReturnValue({
      providerId: 'openai',
      execute: vi.fn().mockRejectedValue(new ProviderAdapterError('fallo simulado del proveedor')),
    })

    const { result, audit } = await executeAIRequest({
      decisionContext: fakeDecisionContext({
        executionStrategy: {
          executionMode: 'IA',
          recommendedAgent: null,
          recommendedProvider: 'openai',
          priorityLevel: 'media',
          executionPolicy: null,
        },
      }),
      authorizationContext: fakeAuthorizationContext(),
      normalizedAIRequest: { userPrompt: 'hola' },
    })

    expect(result.executionStatus).toBe('ERROR_COMUNICACION')
    expect(result.generatedContent).toBeNull()
    expect(result.executionWarnings).toContain('fallo simulado del proveedor')
    expect(audit).toEqual(EMPTY_AUDIT)
  })

  it('nunca deja escapar una excepción no capturada del adaptador: se normaliza a ERROR_COMUNICACION', async () => {
    vi.mocked(findProviderAdapter).mockReturnValue({
      providerId: 'openai',
      execute: vi.fn().mockRejectedValue(new Error('excepción inesperada, no normalizada por el adaptador')),
    })

    const { result } = await executeAIRequest({
      decisionContext: fakeDecisionContext({
        executionStrategy: {
          executionMode: 'IA',
          recommendedAgent: null,
          recommendedProvider: 'openai',
          priorityLevel: 'media',
          executionPolicy: null,
        },
      }),
      authorizationContext: fakeAuthorizationContext(),
      normalizedAIRequest: { userPrompt: 'hola' },
    })

    expect(result.executionStatus).toBe('ERROR_COMUNICACION')
    expect(result.executionWarnings).toContain('fallo de comunicacion con el proveedor')
  })

  it('no muta los objetos de entrada', async () => {
    const decisionContext = fakeDecisionContext()
    const authorizationContext = fakeAuthorizationContext()
    const normalizedAIRequest = { userPrompt: 'hola' }
    const decisionSnapshot = JSON.stringify(decisionContext)
    const authorizationSnapshot = JSON.stringify(authorizationContext)

    await executeAIRequest({ decisionContext, authorizationContext, normalizedAIRequest })

    expect(JSON.stringify(decisionContext)).toBe(decisionSnapshot)
    expect(JSON.stringify(authorizationContext)).toBe(authorizationSnapshot)
  })
})
