import type { ExecutionMode, PriorityLevel } from './types'

/** Plantilla determinista, nunca texto generado -- opera el principio 6 de SC-001 (toda decision es explicable). */
export function buildDecisionRationale(
  executionMode: ExecutionMode,
  priorityLevel: PriorityLevel,
  decisionConfidence: number
): string {
  const aiPart =
    executionMode === 'IA'
      ? 'IA necesaria: el conocimiento recuperado no cubre completamente los dominios solicitados'
      : 'IA no necesaria: el conocimiento recuperado cubre completamente los dominios solicitados'

  return (
    `${aiPart}. ` +
    `Prioridad: ${priorityLevel} (heredada de la complejidad estimada de la peticion). ` +
    `Coste estimado: no disponible (IA-004, sin politica oficial de estimacion de coste). ` +
    `Confianza de la decision: ${decisionConfidence} (minimo entre confianza de interpretacion y confianza de conocimiento).`
  )
}
