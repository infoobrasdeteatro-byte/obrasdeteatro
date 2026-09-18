import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { ProfessionalContext } from '@/lib/professional-context-engine'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import type { DecisionContext } from './types'
import { needsAI } from './needs-ai'
import { derivePriorityLevel } from './priority'
import { estimateDecisionConfidence } from './confidence'
import { estimateCost } from './estimated-cost'
import { estimateOperation } from './operation'
import type { CreditUnit, OperationEstimate, OperationKind } from './operation'
import { selectRecommendedProvider } from './recommended-provider'
import { buildDecisionRationale } from './rationale'

/**
 * Unico punto de entrada del Decision Engine (SC-004.2, contrato de entrada
 * ampliado por reapertura minima, 2026-07-16). No accede directamente ni al
 * PCE ni al SKM ni a Request Interpreter -- recibe unicamente sus salidas
 * ya construidas. Funcion pura y sincrona: ningun campo requiere I/O.
 *
 * `professionalContext` se recibe conforme al contrato de entrada ya
 * ampliado, aunque ningun campo de esta version deriva de su contenido
 * (Subscription sigue "no disponible" por IA-001) -- se conserva como
 * parametro por fidelidad al contrato tras la reapertura, a diferencia de
 * locale/session en Request Interpreter, que nunca fueron una entrada
 * formalmente exigida.
 */
/**
 * Lo que hace falta para estimar el coste de un turno ANTES de ejecutarlo
 * (Bloque 4). Lo aporta quien orquesta, porque es el unico punto que ve a
 * la vez el prompt ya compuesto, el techo de generacion autorizado y el
 * valor del credito -- tres piezas que viven en tres componentes que este
 * no puede importar sin romper su frontera.
 *
 * Ausente, el turno vuelve a la reserva de ultimo recurso: no se inventa
 * un coste, se declara que no puede calcularse.
 */
export interface OperationContext {
  /** Longitud del prompt real que se enviaria al proveedor. */
  readonly promptCharacters: number
  /**
   * Techo de generacion autorizado POR OPERACION (AI Gateway, Bloque 5D).
   *
   * Llega entero, no como una cifra suelta, porque la estimacion tiene que
   * usar exactamente el mismo techo que despues se aplicara a cada llamada:
   * reservar por 1024 y ejecutar con 512 apartaria el doble de lo debido, y
   * al reves dejaria la reserva corta. Decision Engine no puede leer esa
   * politica por si mismo -- no importa AI Gateway, invariante de
   * componente --, asi que se la entrega quien orquesta.
   */
  readonly maxOutputTokensByOperation: Readonly<Record<OperationKind, number>>
  /**
   * Longitud del prompt del resolutor, o `null` si en este turno el
   * resolutor no puede llegar a ejecutarse. Es la unica forma de cubrir la
   * segunda llamada al proveedor sin darla por segura.
   */
  readonly resolverPromptCharacters: number | null
  /** Valor del credito (Accounting Engine, Bloque 3). */
  readonly creditValue: CreditUnit | null
}

export function buildDecisionContext(
  normalizedRequest: NormalizedRequest,
  _professionalContext: ProfessionalContext,
  knowledgeContext: KnowledgeContext,
  operationContext: OperationContext | null = null
): DecisionContext {
  // Las dos señales reales de "el conocimiento recuperado basta": cobertura
  // de dominios y volumen realmente recuperado. `knowledgeEntities` ya venia
  // en el contrato KnowledgeContext que este constructor recibe -- no hay
  // dato nuevo ni recuperacion adicional.
  const aiNeeded = needsAI(knowledgeContext.knowledgeCompleteness, knowledgeContext.knowledgeEntities.length)
  const executionMode = aiNeeded ? 'IA' : 'DIRECTO'
  const priorityLevel = derivePriorityLevel(normalizedRequest.estimatedComplexity)
  const decisionConfidence = estimateDecisionConfidence(
    normalizedRequest.interpretationConfidence,
    knowledgeContext.knowledgeConfidence
  )
  const recommendedProvider = selectRecommendedProvider()
  const operationEstimates = buildOperationEstimates(operationContext, recommendedProvider)
  const estimatedCost = estimateCost(aiNeeded, operationEstimates)

  return {
    requestId: normalizedRequest.requestId,
    executionStrategy: {
      executionMode,
      recommendedAgent: null,
      recommendedProvider,
      priorityLevel,
      executionPolicy: null,
    },
    needsAI: aiNeeded,
    estimatedCost,
    operationEstimates,
    decisionConfidence,
    decisionRationale: buildDecisionRationale(executionMode, priorityLevel, decisionConfidence, estimatedCost),
  }
}

/**
 * Operaciones que este turno puede llegar a ejecutar. Sin contexto de
 * operacion no hay ninguna: la lista vacia significa "no se puede
 * calcular", nunca "no cuesta nada".
 */
function buildOperationEstimates(
  operationContext: OperationContext | null,
  providerId: string | null
): OperationEstimate[] {
  if (operationContext === null) return []

  const estimates = [
    estimateOperation(
      {
        kind: 'TEXT_STANDARD',
        promptCharacters: operationContext.promptCharacters,
        maxOutputTokens: operationContext.maxOutputTokensByOperation.TEXT_STANDARD,
      },
      providerId,
      operationContext.creditValue
    ),
  ]

  if (operationContext.resolverPromptCharacters !== null) {
    estimates.push(
      estimateOperation(
        {
          kind: 'RESOLVER',
          promptCharacters: operationContext.resolverPromptCharacters,
          maxOutputTokens: operationContext.maxOutputTokensByOperation.RESOLVER,
        },
        providerId,
        operationContext.creditValue
      )
    )
  }

  return estimates
}
