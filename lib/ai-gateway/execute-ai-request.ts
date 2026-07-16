import type { DecisionContext } from '@/lib/decision-engine'
import type { AuthorizationContext } from '@/lib/credit-manager'
import type { AIExecutionResult, ExecutionAudit, ExecutionStatus } from './types'

function buildResult(status: ExecutionStatus, warnings: string[]): AIExecutionResult {
  return {
    executionStatus: status,
    generatedContent: null,
    executionWarnings: warnings,
    executionTimestamp: new Date().toISOString(),
  }
}

const EMPTY_AUDIT: ExecutionAudit = {
  providerIdentifier: null,
  providerModel: null,
  executionLatencyMs: null,
  tokensConsumed: null,
  realExecutionCost: null,
  technicalMetadata: null,
}

/**
 * Unico punto de entrada de AI Gateway (SC-004.7). No decide proveedor (eso
 * es exclusivo de Decision Engine, via ExecutionStrategy.RecommendedProvider),
 * no accede directamente a Credit Manager, Decision Engine, PCE ni SKM --
 * recibe unicamente las dos salidas ya construidas que su contrato declara.
 * `ProfessionalContext` nunca llega a este componente: no es uno de sus dos
 * parametros, por lo que su inmutabilidad queda garantizada de forma
 * estructural, no solo por disciplina de implementacion.
 *
 * No modifica `decisionContext` ni `authorizationContext`: ambos se leen
 * exclusivamente por sus campos (nunca se les asigna nada), y sus tipos ya
 * son `readonly` en origen -- el compilador impide cualquier mutacion.
 *
 * Termina su responsabilidad al producir AIExecutionResult + ExecutionAudit
 * -- nunca invoca a Accounting Engine (IA-007, sin asignacion documental).
 *
 * v1 nunca ejecuta una llamada real a un proveedor de IA (IA-006: sin
 * proveedor recomendado ni integracion tecnica en el repositorio). Toda
 * rama de esta version produce un ExecutionAudit con los 6 campos tecnicos
 * en `null` -- se produce siempre, en paralelo, incluso sin ejecucion real.
 */
export async function executeAIRequest(
  decisionContext: DecisionContext,
  authorizationContext: AuthorizationContext
): Promise<{ result: AIExecutionResult; audit: ExecutionAudit }> {
  if (authorizationContext.authorizationStatus !== 'AUTHORIZED') {
    return {
      result: buildResult('NO_AUTORIZADO', ['autorizacion no concedida por Credit Manager']),
      audit: EMPTY_AUDIT,
    }
  }

  if (!decisionContext.needsAI) {
    return {
      result: buildResult('NO_REQUERIDO', ['esta peticion no requiere ejecucion de IA (Decision Engine)']),
      audit: EMPTY_AUDIT,
    }
  }

  const recommendedProvider = decisionContext.executionStrategy.recommendedProvider
  const providerWarning =
    recommendedProvider === null
      ? 'sin proveedor de IA recomendado (Decision Engine no lo determino)'
      : `proveedor recomendado (${recommendedProvider}) sin integracion tecnica configurada`

  return {
    result: buildResult('SIN_PROVEEDOR', [providerWarning, 'ver incidencia IA-006']),
    audit: EMPTY_AUDIT,
  }
}
