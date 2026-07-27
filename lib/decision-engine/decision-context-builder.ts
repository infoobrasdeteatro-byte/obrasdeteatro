import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { ProfessionalContext } from '@/lib/professional-context-engine'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import type { DecisionContext } from './types'
import { needsAI } from './needs-ai'
import { derivePriorityLevel } from './priority'
import { estimateDecisionConfidence } from './confidence'
import { estimateCost } from './estimated-cost'
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
export function buildDecisionContext(
  normalizedRequest: NormalizedRequest,
  _professionalContext: ProfessionalContext,
  knowledgeContext: KnowledgeContext
): DecisionContext {
  const aiNeeded = needsAI(knowledgeContext.knowledgeCompleteness)
  const executionMode = aiNeeded ? 'IA' : 'DIRECTO'
  const priorityLevel = derivePriorityLevel(normalizedRequest.estimatedComplexity)
  const decisionConfidence = estimateDecisionConfidence(
    normalizedRequest.interpretationConfidence,
    knowledgeContext.knowledgeConfidence
  )
  const estimatedCost = estimateCost(aiNeeded)

  return {
    executionStrategy: {
      executionMode,
      recommendedAgent: null,
      recommendedProvider: selectRecommendedProvider(),
      priorityLevel,
      executionPolicy: null,
    },
    needsAI: aiNeeded,
    estimatedCost,
    decisionConfidence,
    decisionRationale: buildDecisionRationale(executionMode, priorityLevel, decisionConfidence, estimatedCost),
  }
}
