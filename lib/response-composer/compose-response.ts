import type { DecisionContext } from '@/lib/decision-engine'
import type { AuthorizationContext } from '@/lib/credit-manager'
import type { AIExecutionResult } from '@/lib/ai-gateway'
import type { ResponseContext, ResponseType } from './types'
import { RESPONSE_TEMPLATES } from './templates'

function buildResponse(
  responseType: ResponseType,
  responseContent: string | null,
  responseMetadata: Record<string, string>,
  responseWarnings: string[]
): ResponseContext {
  return {
    responseType,
    responseContent,
    responseMetadata,
    responseWarnings,
    responseTimestamp: new Date().toISOString(),
  }
}

/**
 * Unico punto de entrada de Response Composer (SC-004.6). No decide, no
 * interpreta conocimiento, no consulta BD, no ejecuta IA -- compone y
 * formatea un ResponseContext exclusivamente a partir del resultado ya
 * producido por los componentes anteriores, nunca sintetiza contenido
 * propio a partir de conocimiento crudo.
 *
 * Garantia explicita de no mutacion (gobernanza, 2026-07-16):
 * `decisionContext`, `authorizationContext` y `aiExecutionResult` se leen
 * exclusivamente por sus campos -- nunca se les asigna nada, y sus tipos
 * ya son `readonly` en origen, por lo que el compilador impide cualquier
 * mutacion. Ninguno de los tres se pasa a ninguna funcion que pueda
 * modificarlos.
 *
 * `authorizationContext` y `aiExecutionResult` son `null` cuando el flujo
 * real nunca paso por Credit Manager o AI Gateway (flujo de respuesta
 * directa, segun el propio diagrama oficial de SC-004.6).
 */
export function composeResponse(
  decisionContext: DecisionContext,
  authorizationContext: AuthorizationContext | null,
  aiExecutionResult: AIExecutionResult | null
): ResponseContext {
  if (authorizationContext !== null && authorizationContext.authorizationStatus === 'DENIED') {
    return buildResponse(
      'RESPONSE_DENIED',
      RESPONSE_TEMPLATES.RESPONSE_DENIED,
      { authorizationReason: authorizationContext.authorizationReason },
      []
    )
  }

  if (!decisionContext.needsAI) {
    return buildResponse(
      'RESPONSE_DIRECT',
      RESPONSE_TEMPLATES.RESPONSE_DIRECT,
      { decisionRationale: decisionContext.decisionRationale },
      ['contenido no disponible (IA-008)']
    )
  }

  if (aiExecutionResult !== null && aiExecutionResult.executionStatus === 'EJECUTADO') {
    const responseType: ResponseType = aiExecutionResult.executionWarnings.length > 0 ? 'RESPONSE_PARTIAL' : 'RESPONSE_SUCCESS'
    return buildResponse(responseType, aiExecutionResult.generatedContent, {}, aiExecutionResult.executionWarnings)
  }

  return buildResponse(
    'RESPONSE_ERROR',
    RESPONSE_TEMPLATES.RESPONSE_ERROR,
    {
      executionStatus: aiExecutionResult?.executionStatus ?? 'sin resultado de AI Gateway',
      decisionRationale: decisionContext.decisionRationale,
    },
    aiExecutionResult?.executionWarnings ?? []
  )
}
