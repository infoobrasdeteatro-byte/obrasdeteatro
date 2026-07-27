import { describe, it, expect } from 'vitest'
import type { DecisionContext } from '@/lib/decision-engine'
import type { AuthorizationContext } from '@/lib/credit-manager'
import type { AIExecutionResult } from '@/lib/ai-gateway'
import { composeResponse } from '../compose-response'

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

function fakeAIExecutionResult(overrides: Partial<AIExecutionResult> = {}): AIExecutionResult {
  return {
    executionStatus: 'SIN_PROVEEDOR',
    generatedContent: null,
    executionWarnings: ['sin proveedor de IA recomendado (Decision Engine no lo determino)'],
    executionTimestamp: new Date().toISOString(),
    ...overrides,
  }
}

describe('composeResponse', () => {
  it('RESPONSE_DENIED cuando AuthorizationContext esta denegado, con prioridad sobre cualquier otro dato', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext({ authorizationStatus: 'DENIED', authorizationReason: 'SIN_DATOS_VERIFICABLES: X' }),
      fakeAIExecutionResult()
    )

    expect(result.responseType).toBe('RESPONSE_DENIED')
    expect(result.responseContent).toBe('No ha sido posible autorizar esta solicitud en este momento.')
    expect(result.responseMetadata.authorizationReason).toBe('SIN_DATOS_VERIFICABLES: X')
  })

  it('RESPONSE_DIRECT cuando needsAI es false y no se proporciona directContent (valor por defecto null)', () => {
    const result = composeResponse(fakeDecisionContext({ needsAI: false }), null, null)

    expect(result.responseType).toBe('RESPONSE_DIRECT')
    expect(result.responseContent).toBeNull()
    expect(result.responseWarnings).toContain('contenido no disponible (IA-008)')
  })

  it('RESPONSE_DIRECT con directContent explicito null: mismo comportamiento que si se omite (IA-008)', () => {
    const result = composeResponse(fakeDecisionContext({ needsAI: false }), null, null, null)

    expect(result.responseType).toBe('RESPONSE_DIRECT')
    expect(result.responseContent).toBeNull()
    expect(result.responseWarnings).toContain('contenido no disponible (IA-008)')
  })

  it('RESPONSE_DIRECT con directContent no nulo: se propaga sin transformar y sin advertencia (IA-008)', () => {
    const result = composeResponse(fakeDecisionContext({ needsAI: false }), null, null, 'Resultados encontrados: Obra A.')

    expect(result.responseType).toBe('RESPONSE_DIRECT')
    expect(result.responseContent).toBe('Resultados encontrados: Obra A.')
    expect(result.responseWarnings).not.toContain('contenido no disponible (IA-008)')
    expect(result.responseWarnings).toEqual([])
  })

  it('RESPONSE_ERROR cuando AIExecutionResult indica que no se ejecuto nada', () => {
    const result = composeResponse(fakeDecisionContext(), fakeAuthorizationContext(), fakeAIExecutionResult())

    expect(result.responseType).toBe('RESPONSE_ERROR')
    expect(result.responseContent).toBe('No ha sido posible procesar tu solicitud en este momento. Intentalo de nuevo mas tarde.')
    expect(result.responseMetadata.executionStatus).toBe('SIN_PROVEEDOR')
  })

  it('RESPONSE_ERROR de forma segura cuando no hay AIExecutionResult en absoluto (nunca lanza excepcion)', () => {
    const result = composeResponse(fakeDecisionContext(), fakeAuthorizationContext(), null)

    expect(result.responseType).toBe('RESPONSE_ERROR')
    expect(result.responseMetadata.executionStatus).toBe('sin resultado de AI Gateway')
  })

  it('RESPONSE_SUCCESS cuando la ejecucion fue real y sin advertencias (datos simulados)', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext(),
      fakeAIExecutionResult({ executionStatus: 'EJECUTADO', generatedContent: 'contenido real', executionWarnings: [] })
    )

    expect(result.responseType).toBe('RESPONSE_SUCCESS')
    expect(result.responseContent).toBe('contenido real')
  })

  it('RESPONSE_PARTIAL cuando la ejecucion fue real pero con advertencias (datos simulados)', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext(),
      fakeAIExecutionResult({
        executionStatus: 'EJECUTADO',
        generatedContent: 'contenido parcial',
        executionWarnings: ['respuesta incompleta'],
      })
    )

    expect(result.responseType).toBe('RESPONSE_PARTIAL')
    expect(result.responseWarnings).toContain('respuesta incompleta')
  })

  it('produce siempre un ResponseContext valido con timestamp, en cualquier combinacion de entradas', () => {
    const result = composeResponse(fakeDecisionContext({ needsAI: false }), null, null)

    expect(result.responseType).toBeDefined()
    expect(typeof result.responseTimestamp).toBe('string')
    expect(Array.isArray(result.responseWarnings)).toBe(true)
  })

  it('no muta ninguno de los objetos de entrada', () => {
    const decisionContext = fakeDecisionContext()
    const authorizationContext = fakeAuthorizationContext()
    const aiExecutionResult = fakeAIExecutionResult()
    const decisionSnapshot = JSON.stringify(decisionContext)
    const authorizationSnapshot = JSON.stringify(authorizationContext)
    const aiSnapshot = JSON.stringify(aiExecutionResult)

    composeResponse(decisionContext, authorizationContext, aiExecutionResult)

    expect(JSON.stringify(decisionContext)).toBe(decisionSnapshot)
    expect(JSON.stringify(authorizationContext)).toBe(authorizationSnapshot)
    expect(JSON.stringify(aiExecutionResult)).toBe(aiSnapshot)
  })
})
