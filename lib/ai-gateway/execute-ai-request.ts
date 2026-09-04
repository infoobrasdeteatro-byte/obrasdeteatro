import type { AIExecutionInput, AIExecutionResult, ExecutionAudit, ExecutionStatus } from './types'
import { maxOutputTokensFor, TRUNCATION_WARNING } from './types'
import { findProviderAdapter } from './provider-registry'
import { ProviderAdapterError } from './provider-adapter'

function buildResult(status: ExecutionStatus, content: string | null, warnings: string[]): AIExecutionResult {
  return {
    executionStatus: status,
    generatedContent: content,
    executionWarnings: warnings,
    executionTimestamp: new Date().toISOString(),
  }
}

const EMPTY_AUDIT: ExecutionAudit = {
  inputTokens: null,
  outputTokens: null,
  providerIdentifier: null,
  providerModel: null,
  executionLatencyMs: null,
  tokensConsumed: null,
  realExecutionCost: null,
  // No hubo ejecucion: no se trunco nada, pero tampoco se completo nada.
  truncated: null,
  // Sin ejecucion no hay techo aplicado del que informar.
  maxOutputTokens: null,
  technicalMetadata: null,
}

/**
 * Unico punto de entrada de AI Gateway (SC-004.7, ampliado por Aprobacion
 * de Direccion IA-OPENAI-002). No decide proveedor (eso es exclusivo de
 * Decision Engine, via ExecutionStrategy.RecommendedProvider) -- solo
 * ejecuta contra el adaptador ya registrado para ese proveedor
 * (`findProviderAdapter`), nunca contiene su propio catalogo ni logica de
 * decision. No accede directamente a Credit Manager, Decision Engine, PCE
 * ni SKM. `ProfessionalContext` nunca llega a este componente.
 *
 * No modifica `decisionContext` ni `authorizationContext`: se leen
 * exclusivamente por sus campos, con tipos `readonly` en origen.
 *
 * `normalizedAIRequest` (IA-OPENAI-002): construido exclusivamente por el
 * Orquestador, agnostico de proveedor. AI Gateway nunca reconstruye el
 * contenido de la peticion a partir de otros objetos del flujo -- si
 * `needsAI` es true y `userPrompt` esta vacio, es un error explicito del
 * flujo (fallo de construccion en el Orquestador, no un caso de negocio),
 * y se lanza como excepcion en vez de degradarse en silencio.
 *
 * Termina su responsabilidad al producir AIExecutionResult + ExecutionAudit
 * -- nunca invoca a Accounting Engine (IA-007, sin asignacion documental).
 * `ExecutionAudit.technicalMetadata` nunca almacena el contenido del
 * prompt, ni completo ni parcial.
 */
export async function executeAIRequest(
  input: AIExecutionInput
): Promise<{ result: AIExecutionResult; audit: ExecutionAudit }> {
  const { decisionContext, authorizationContext, normalizedAIRequest } = input

  if (authorizationContext.authorizationStatus !== 'AUTHORIZED') {
    return {
      result: buildResult('NO_AUTORIZADO', null, ['autorizacion no concedida por Credit Manager']),
      audit: EMPTY_AUDIT,
    }
  }

  if (!decisionContext.needsAI) {
    return {
      result: buildResult('NO_REQUERIDO', null, ['esta peticion no requiere ejecucion de IA (Decision Engine)']),
      audit: EMPTY_AUDIT,
    }
  }

  if (normalizedAIRequest.userPrompt.trim().length === 0) {
    throw new Error(
      'NormalizedAIRequest.userPrompt es obligatorio cuando DecisionContext.needsAI es true (error explicito del flujo, IA-OPENAI-002)'
    )
  }

  const recommendedProvider = decisionContext.executionStrategy.recommendedProvider
  const adapter = recommendedProvider === null ? null : findProviderAdapter(recommendedProvider)

  if (adapter === null) {
    const providerWarning =
      recommendedProvider === null
        ? 'sin proveedor de IA recomendado (Decision Engine no lo determino)'
        : `proveedor recomendado (${recommendedProvider}) sin adaptador registrado`

    return {
      result: buildResult('SIN_PROVEEDOR', null, [providerWarning]),
      audit: EMPTY_AUDIT,
    }
  }

  try {
    // El techo de generacion viaja SIEMPRE con la peticion. Es aqui, y no
    // en el adaptador, donde se decide cuanto puede generarse: el Gateway
    // invoca y el adaptador obedece.
    //
    // Quien llama declara QUE operacion es; el numero sale de la politica
    // de este modulo. Asi ningun llamador -- ni el Orquestador, ni una UI,
    // ni un futuro enrutador -- puede elegir cuanto se genera.
    const outcome = await adapter.execute({
      prompt: normalizedAIRequest.userPrompt,
      maxOutputTokens: maxOutputTokensFor(normalizedAIRequest.operationKind),
    })

    // La ejecucion es correcta -- el contenido llega y se entrega intacto
    // --, pero puede estar incompleta. Es la unica advertencia que NO
    // describe un fallo: describe una respuesta que se quedo a medias por
    // una politica nuestra, no del proveedor. Response Composer ya la
    // traduce a RESPONSE_PARTIAL sin necesitar ningun cambio.
    return {
      result: buildResult('EJECUTADO', outcome.content, outcome.truncated ? [TRUNCATION_WARNING] : []),
      audit: {
        providerIdentifier: adapter.providerId,
        providerModel: outcome.model,
        executionLatencyMs: outcome.latencyMs,
        tokensConsumed: outcome.tokensConsumed,
        // IA-006: el desglose que el proveedor publica. El COSTE no se
        // calcula aqui: AI Gateway "invoca, nunca selecciona" y no puede
        // conocer el catalogo de tarifas (invariante de Direccion, cierre
        // de IA-006, verificada por contract-invariants). Quien tarifa es
        // el consumidor del audit, que si puede consultarlo.
        inputTokens: outcome.inputTokens,
        outputTokens: outcome.outputTokens,
        truncated: outcome.truncated,
        // Del OUTCOME, nunca de la politica: se registra el techo que la
        // ejecucion aplico, no el que le corresponderia por su operacion.
        maxOutputTokens: outcome.maxOutputTokens,
        realExecutionCost: null,
        technicalMetadata: null,
      },
    }
  } catch (error) {
    const message = error instanceof ProviderAdapterError ? error.message : 'fallo de comunicacion con el proveedor'

    return {
      result: buildResult('ERROR_COMUNICACION', null, [message]),
      audit: EMPTY_AUDIT,
    }
  }
}
