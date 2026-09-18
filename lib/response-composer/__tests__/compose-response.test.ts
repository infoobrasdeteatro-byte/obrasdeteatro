import { describe, it, expect } from 'vitest'
import type { DecisionContext } from '@/lib/decision-engine'
import type { AuthorizationContext } from '@/lib/credit-manager'
import type { AIExecutionResult } from '@/lib/ai-gateway'
import { composeResponse } from '../compose-response'
import { TRUNCATION_WARNING } from '@/lib/ai-gateway'
import { RESPONSE_TEMPLATES } from '../templates'

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

describe('composeResponse — degradacion a conocimiento propio (Reconexion del Nucleo Conversacional)', () => {
  const CONTENIDO = 'En obras he encontrado un resultado: Obra A.'

  it('con autorizacion DENEGADA pero contenido determinista disponible, entrega el contenido en vez de la plantilla de denegacion', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext({ authorizationStatus: 'DENIED', authorizationReason: 'VERIFICACION_NEGATIVA: cuota agotada' }),
      null,
      CONTENIDO
    )

    expect(result.responseType).toBe('RESPONSE_DIRECT')
    expect(result.responseContent).toBe(CONTENIDO)
    expect(result.responseMetadata.authorizationReason).toBe('VERIFICACION_NEGATIVA: cuota agotada')
    expect(result.responseWarnings).toContain('respuesta compuesta sin IA: autorizacion no concedida')
  })

  it('con autorizacion DENEGADA y sin contenido determinista, conserva RESPONSE_DENIED', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext({ authorizationStatus: 'DENIED' }),
      null,
      null
    )

    expect(result.responseType).toBe('RESPONSE_DENIED')
  })

  it('cuando la IA no entrega contenido pero si hay conocimiento recuperado, entrega ese conocimiento en vez de un error', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext(),
      fakeAIExecutionResult({ executionStatus: 'SIN_PROVEEDOR' }),
      CONTENIDO
    )

    expect(result.responseType).toBe('RESPONSE_DIRECT')
    expect(result.responseContent).toBe(CONTENIDO)
    expect(result.responseMetadata.executionStatus).toBe('SIN_PROVEEDOR')
    expect(result.responseWarnings[0]).toBe('respuesta compuesta sin IA: ejecucion no disponible')
  })

  it('conserva los avisos originales de AI Gateway al degradar', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext(),
      fakeAIExecutionResult({ executionStatus: 'ERROR_COMUNICACION', executionWarnings: ['fallo del proveedor'] }),
      CONTENIDO
    )

    expect(result.responseWarnings).toContain('fallo del proveedor')
  })

  it('sin contenido determinista, un fallo de IA sigue produciendo RESPONSE_ERROR', () => {
    const result = composeResponse(fakeDecisionContext(), fakeAuthorizationContext(), fakeAIExecutionResult(), null)

    expect(result.responseType).toBe('RESPONSE_ERROR')
  })

  it('una ejecucion de IA correcta siempre tiene prioridad sobre el contenido determinista', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext(),
      fakeAIExecutionResult({ executionStatus: 'EJECUTADO', generatedContent: 'Respuesta conversacional', executionWarnings: [] }),
      CONTENIDO
    )

    expect(result.responseType).toBe('RESPONSE_SUCCESS')
    expect(result.responseContent).toBe('Respuesta conversacional')
  })
})


/**
 * BLOQUE 5 — la causa de la denegacion llega hasta la respuesta.
 *
 * Sin esto, un futuro mensaje de producto ("Has alcanzado tu cuota de IA")
 * solo podria construirse comparando substrings de un texto pensado para
 * auditoria, que cambia con las cifras del presupuesto. La causa viaja como
 * dato en unos metadatos que ya existian: el contrato no gana campos y la
 * interfaz actual no cambia de comportamiento.
 */
describe('composeResponse — causa de la denegacion (Bloque 5)', () => {
  it('CUOTA AGOTADA: la respuesta denegada lleva la causa como dato', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext({ authorizationStatus: 'DENIED', denialCode: 'insufficient_ai_credits' }),
      null
    )

    expect(result.responseType).toBe('RESPONSE_DENIED')
    expect(result.responseMetadata.denialCode).toBe('insufficient_ai_credits')
  })

  it('DEGRADACION: agotar la cuota de IA no retira el contenido determinista, y conserva la causa', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext({ authorizationStatus: 'DENIED', denialCode: 'insufficient_ai_credits' }),
      null,
      'contenido determinista ya recuperado'
    )

    expect(result.responseType).toBe('RESPONSE_DIRECT')
    expect(result.responseContent).toBe('contenido determinista ya recuperado')
    expect(result.responseMetadata.denialCode).toBe('insufficient_ai_credits')
  })

  it('DISTINGUE una cuota agotada de un dato que falta: no son el mismo mensaje', () => {
    const agotada = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext({ authorizationStatus: 'DENIED', denialCode: 'insufficient_ai_credits' }),
      null
    )
    const sinDato = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext({ authorizationStatus: 'DENIED', denialCode: 'plan_quota_unknown' }),
      null
    )

    expect(agotada.responseMetadata.denialCode).not.toBe(sinDato.responseMetadata.denialCode)
  })

  it('SIN CAMBIO DE UX: el contenido mostrado al usuario es exactamente el de siempre', () => {
    const conCausa = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext({ authorizationStatus: 'DENIED', denialCode: 'insufficient_ai_credits' }),
      null
    )

    // La plantilla no cambia: la causa viaja en los metadatos, no en el
    // texto. Ningun usuario ve nada distinto hoy.
    expect(conCausa.responseContent).toBe(RESPONSE_TEMPLATES.RESPONSE_DENIED)
    expect(conCausa.responseWarnings).toEqual([])
  })

  it('una respuesta NO denegada no lleva causa: el campo no se rellena por costumbre', () => {
    const result = composeResponse(fakeDecisionContext(), fakeAuthorizationContext(), null, 'contenido')

    expect(result.responseMetadata.denialCode).toBeUndefined()
  })
})


/**
 * BLOQUE 5C — verificacion, no modificacion.
 *
 * `RESPONSE_PARTIAL` ya existia y estaba inalcanzable: nada rellenaba
 * nunca `executionWarnings` en una ejecucion correcta, de modo que una
 * respuesta cortada a mitad de frase llegaba al usuario clasificada como
 * RESPONSE_SUCCESS. Response Composer NO cambia ni una linea -- lo que
 * cambia es que ahora le llega la señal. Estas pruebas fijan que el
 * mecanismo funciona de extremo a extremo.
 */
describe('composeResponse — truncamiento (Bloque 5C)', () => {
  it('RESPONSE_PARTIAL cuando la ejecucion trae el aviso de truncamiento', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext(),
      fakeAIExecutionResult({
        executionStatus: 'EJECUTADO',
        generatedContent: 'una frase a medio ter',
        executionWarnings: [TRUNCATION_WARNING],
      })
    )

    expect(result.responseType).toBe('RESPONSE_PARTIAL')
  })

  it('RESPONSE_SUCCESS cuando no hay aviso: una ejecucion completa no se degrada', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext(),
      fakeAIExecutionResult({
        executionStatus: 'EJECUTADO',
        generatedContent: 'una respuesta entera',
        executionWarnings: [],
      })
    )

    expect(result.responseType).toBe('RESPONSE_SUCCESS')
  })

  it('responseWarnings TRANSPORTA la señal intacta hasta el cliente', () => {
    // Es la via por la que un futuro mensaje de producto podria saber que
    // la respuesta esta incompleta. Hoy nadie la lee, y esta bien que asi
    // sea: este bloque observa, no cambia la UX.
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext(),
      fakeAIExecutionResult({
        executionStatus: 'EJECUTADO',
        generatedContent: 'texto',
        executionWarnings: [TRUNCATION_WARNING],
      })
    )

    expect(result.responseWarnings).toEqual([TRUNCATION_WARNING])
  })

  it('el contenido cortado se entrega tal cual: nunca se recorta ni se completa', () => {
    const result = composeResponse(
      fakeDecisionContext(),
      fakeAuthorizationContext(),
      fakeAIExecutionResult({
        executionStatus: 'EJECUTADO',
        generatedContent: 'una frase a medio ter',
        executionWarnings: [TRUNCATION_WARNING],
      })
    )

    expect(result.responseContent).toBe('una frase a medio ter')
  })
})
