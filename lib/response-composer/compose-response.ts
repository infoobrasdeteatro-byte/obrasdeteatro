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
 *
 * `directContent` (IA-008, Plan Tecnico aprobado 2026-07-22): cuarto
 * parametro, opcional con valor por defecto `null` -- reapertura minima del
 * contrato autorizada por la Aclaracion de Direccion de IA-008. Response
 * Composer no lo calcula ni lo interpreta, solo lo coloca sin transformar
 * en la rama RESPONSE_DIRECT. El valor por defecto preserva sin ningun
 * cambio el comportamiento de todo llamador existente que no lo
 * proporcione (lib/spo/process-request.ts).
 */
export function composeResponse(
  decisionContext: DecisionContext,
  authorizationContext: AuthorizationContext | null,
  aiExecutionResult: AIExecutionResult | null,
  directContent: string | null = null
): ResponseContext {
  if (authorizationContext !== null && authorizationContext.authorizationStatus === 'DENIED') {
    // Degradacion a conocimiento propio (Reconexion del Nucleo
    // Conversacional): la denegacion afecta a la ejecucion de IA, que tiene
    // coste, nunca al conocimiento ya recuperado, que no lo tiene. Si hay
    // contenido determinista disponible se entrega, con la razon de la
    // denegacion visible como aviso -- el usuario no pierde una capacidad
    // gratuita por haber agotado una cuota de IA. Ninguna reserva de credito
    // se altera: esta rama nunca ejecuta proveedor.
    if (directContent !== null) {
      return buildResponse(
        'RESPONSE_DIRECT',
        directContent,
        {
          decisionRationale: decisionContext.decisionRationale,
          authorizationReason: authorizationContext.authorizationReason,
        },
        ['respuesta compuesta sin IA: autorizacion no concedida']
      )
    }

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
      directContent,
      { decisionRationale: decisionContext.decisionRationale },
      directContent === null ? ['contenido no disponible (IA-008)'] : []
    )
  }

  if (aiExecutionResult !== null && aiExecutionResult.executionStatus === 'EJECUTADO') {
    const responseType: ResponseType = aiExecutionResult.executionWarnings.length > 0 ? 'RESPONSE_PARTIAL' : 'RESPONSE_SUCCESS'
    return buildResponse(responseType, aiExecutionResult.generatedContent, {}, aiExecutionResult.executionWarnings)
  }

  // Degradacion a conocimiento propio antes que error (Reconexion del Nucleo
  // Conversacional): si la IA no ha entregado contenido -- sin proveedor,
  // error de comunicacion, credencial ausente -- pero el conocimiento
  // recuperado si permite una respuesta factual, se entrega esa respuesta en
  // lugar de una plantilla de error. Garantiza que ninguna consulta teatral
  // pierda la respuesta que ya obtenia antes de esta reconexion.
  if (directContent !== null) {
    return buildResponse(
      'RESPONSE_DIRECT',
      directContent,
      {
        executionStatus: aiExecutionResult?.executionStatus ?? 'sin resultado de AI Gateway',
        decisionRationale: decisionContext.decisionRationale,
      },
      ['respuesta compuesta sin IA: ejecucion no disponible', ...(aiExecutionResult?.executionWarnings ?? [])]
    )
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
