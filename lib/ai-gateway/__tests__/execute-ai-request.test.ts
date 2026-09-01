import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DecisionContext } from '@/lib/decision-engine'
import type { AuthorizationContext } from '@/lib/credit-manager'
import { findProviderAdapter } from '../provider-registry'
import { TRUNCATION_WARNING, MAX_OUTPUT_TOKENS_BY_OPERATION } from '../types'
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
    operationEstimates: [],
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
    denialCode: null,
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
  // Bloque 5C: no hubo ejecucion, luego no hay respuesta cuya integridad
  // valorar. `false` afirmaria que una respuesta inexistente esta completa.
  truncated: null,
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
      normalizedAIRequest: { userPrompt: 'hola', operationKind: 'TEXT_STANDARD' as const },
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
      normalizedAIRequest: { userPrompt: '', operationKind: 'TEXT_STANDARD' as const },
    })

    expect(result.executionStatus).toBe('NO_REQUERIDO')
  })

  it('lanza un error explícito si needsAI es true y userPrompt está vacío (IA-OPENAI-002)', async () => {
    await expect(
      executeAIRequest({
        decisionContext: fakeDecisionContext(),
        authorizationContext: fakeAuthorizationContext(),
        normalizedAIRequest: { userPrompt: '   ', operationKind: 'TEXT_STANDARD' as const },
      })
    ).rejects.toThrow(/userPrompt es obligatorio/)

    expect(findProviderAdapter).not.toHaveBeenCalled()
  })

  it('SIN_PROVEEDOR cuando no hay proveedor recomendado', async () => {
    const { result, audit } = await executeAIRequest({
      decisionContext: fakeDecisionContext(),
      authorizationContext: fakeAuthorizationContext(),
      normalizedAIRequest: { userPrompt: 'hola', operationKind: 'TEXT_STANDARD' as const },
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
      normalizedAIRequest: { userPrompt: 'hola', operationKind: 'TEXT_STANDARD' as const },
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
      normalizedAIRequest: { userPrompt: 'hola', operationKind: 'TEXT_STANDARD' as const },
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
      normalizedAIRequest: { userPrompt: 'hola', operationKind: 'TEXT_STANDARD' as const },
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
      normalizedAIRequest: { userPrompt: 'hola', operationKind: 'TEXT_STANDARD' as const },
    })

    expect(result.executionStatus).toBe('ERROR_COMUNICACION')
    expect(result.executionWarnings).toContain('fallo de comunicacion con el proveedor')
  })

  it('no muta los objetos de entrada', async () => {
    const decisionContext = fakeDecisionContext()
    const authorizationContext = fakeAuthorizationContext()
    const normalizedAIRequest = { userPrompt: 'hola', operationKind: 'TEXT_STANDARD' as const }
    const decisionSnapshot = JSON.stringify(decisionContext)
    const authorizationSnapshot = JSON.stringify(authorizationContext)

    await executeAIRequest({ decisionContext, authorizationContext, normalizedAIRequest })

    expect(JSON.stringify(decisionContext)).toBe(decisionSnapshot)
    expect(JSON.stringify(authorizationContext)).toBe(authorizationSnapshot)
  })
})


/**
 * BLOQUE 5C — el aviso de truncamiento.
 *
 * Es la unica advertencia del sistema que NO describe un fallo: la
 * ejecucion fue correcta y el contenido se entrega intacto. Describe una
 * respuesta que se quedo a medias por una politica nuestra.
 */
describe('executeAIRequest — aviso de truncamiento (Bloque 5C)', () => {
  function adaptadorQueDevuelve(truncated: boolean) {
    vi.mocked(findProviderAdapter).mockReturnValue({
      providerId: 'openai',
      execute: vi.fn().mockResolvedValue({
        content: 'contenido generado',
        model: 'gpt-4o-mini',
        latencyMs: 120,
        tokensConsumed: 42,
        inputTokens: 30,
        outputTokens: 12,
        truncated,
      }),
    })
  }

  const entrada = () => ({
    decisionContext: fakeDecisionContext({
      executionStrategy: {
        executionMode: 'IA' as const,
        recommendedAgent: null,
        recommendedProvider: 'openai',
        priorityLevel: 'media' as const,
        executionPolicy: null,
      },
    }),
    authorizationContext: fakeAuthorizationContext(),
    normalizedAIRequest: { userPrompt: 'peticion del usuario', operationKind: 'TEXT_STANDARD' as const },
  })

  it('TRUNCADO: se emite el aviso, y la ejecucion sigue siendo EJECUTADO', async () => {
    adaptadorQueDevuelve(true)

    const { result, audit } = await executeAIRequest(entrada())

    expect(result.executionStatus).toBe('EJECUTADO')
    expect(result.executionWarnings).toEqual([TRUNCATION_WARNING])
    expect(audit.truncated).toBe(true)
    // El contenido no se toca: se avisa de que falta, no se recorta lo que hay.
    expect(result.generatedContent).toBe('contenido generado')
  })

  it('NO TRUNCADO: ningun aviso -- el campo no se rellena por costumbre', async () => {
    adaptadorQueDevuelve(false)

    const { result, audit } = await executeAIRequest(entrada())

    expect(result.executionWarnings).toEqual([])
    expect(audit.truncated).toBe(false)
  })

  it('SIN EJECUCION el truncamiento es `null`, nunca `false`', async () => {
    // `false` afirmaria que una respuesta que no existe esta completa.
    const { audit } = await executeAIRequest({
      decisionContext: fakeDecisionContext(),
      authorizationContext: fakeAuthorizationContext({ authorizationStatus: 'DENIED' }),
      normalizedAIRequest: { userPrompt: 'peticion', operationKind: 'TEXT_STANDARD' as const },
    })

    expect(audit.truncated).toBeNull()
  })

  it('el aviso es una SEÑAL con identidad propia, no una frase suelta', async () => {
    // Quien lo compruebe debe poder referirse a el sin copiar su texto.
    adaptadorQueDevuelve(true)

    const { result } = await executeAIRequest(entrada())

    expect(result.executionWarnings[0]).toBe(TRUNCATION_WARNING)
    expect(TRUNCATION_WARNING).toContain('finish_reason=length')
  })
})


/**
 * BLOQUE 5D — el techo depende de la operacion, y solo de ella.
 *
 * Ninguna de estas pruebas escribe 512 ni 1024: los lee de la politica. Si
 * los fijara a mano, seguirian pasando el dia en que el Gateway dejara de
 * consultarla, que es exactamente el fallo que deben detectar.
 */
describe('executeAIRequest — techo por operacion (Bloque 5D)', () => {
  function adaptadorEspia() {
    const execute = vi.fn().mockResolvedValue({
      content: 'contenido',
      model: 'gpt-4o-mini',
      latencyMs: 10,
      tokensConsumed: 5,
      inputTokens: 3,
      outputTokens: 2,
      truncated: false,
    })
    vi.mocked(findProviderAdapter).mockReturnValue({ providerId: 'openai', execute })
    return execute
  }

  function entradaPara(operationKind: 'TEXT_STANDARD' | 'RESOLVER') {
    return {
      decisionContext: fakeDecisionContext({
        executionStrategy: {
          executionMode: 'IA' as const,
          recommendedAgent: null,
          recommendedProvider: 'openai',
          priorityLevel: 'media' as const,
          executionPolicy: null,
        },
      }),
      authorizationContext: fakeAuthorizationContext(),
      normalizedAIRequest: { userPrompt: 'peticion', operationKind },
    }
  }

  it('TEXT_STANDARD recibe su techo, tomado de la politica', async () => {
    const execute = adaptadorEspia()

    await executeAIRequest(entradaPara('TEXT_STANDARD'))

    expect(execute.mock.calls[0][0].maxOutputTokens).toBe(MAX_OUTPUT_TOKENS_BY_OPERATION.TEXT_STANDARD)
  })

  it('RESOLVER recibe el suyo, distinto', async () => {
    const execute = adaptadorEspia()

    await executeAIRequest(entradaPara('RESOLVER'))

    expect(execute.mock.calls[0][0].maxOutputTokens).toBe(MAX_OUTPUT_TOKENS_BY_OPERATION.RESOLVER)
  })

  it('SON DISTINTOS: si coincidieran, la politica por operacion no estaria haciendo nada', async () => {
    const execute = adaptadorEspia()

    await executeAIRequest(entradaPara('TEXT_STANDARD'))
    await executeAIRequest(entradaPara('RESOLVER'))

    const [texto, resolutor] = execute.mock.calls.map((llamada) => llamada[0].maxOutputTokens)
    expect(texto).not.toBe(resolutor)
    // El resolutor NO se reduce: su salida esta acotada por construccion,
    // pero esa cota vale entre 494 y 710 tokens (27 terminos, anclaje de 6
    // palabras). Cualquier techo menor truncaria el peor caso permitido.
    expect(resolutor).toBeGreaterThan(texto)
  })

  it('el llamador NO puede imponer un techo: solo declara la operacion', async () => {
    const execute = adaptadorEspia()

    await executeAIRequest({
      ...entradaPara('TEXT_STANDARD'),
      // Un campo espurio no debe abrir ninguna via: el Gateway resuelve el
      // techo contra su politica, no contra lo que le manden.
      normalizedAIRequest: { userPrompt: 'peticion', operationKind: 'TEXT_STANDARD', maxOutputTokens: 99999 } as never,
    })

    expect(execute.mock.calls[0][0].maxOutputTokens).toBe(MAX_OUTPUT_TOKENS_BY_OPERATION.TEXT_STANDARD)
  })
})
