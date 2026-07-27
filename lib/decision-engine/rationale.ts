import type { ExecutionMode, PriorityLevel } from './types'

/** Plantilla determinista, nunca texto generado -- opera el principio 6 de SC-001 (toda decision es explicable). */
export function buildDecisionRationale(
  executionMode: ExecutionMode,
  priorityLevel: PriorityLevel,
  decisionConfidence: number,
  estimatedCost: number | null
): string {
  const aiPart =
    executionMode === 'IA'
      ? 'IA necesaria: el conocimiento recuperado no cubre completamente los dominios solicitados'
      : 'IA no necesaria: el conocimiento recuperado cubre completamente los dominios solicitados'

  const costPart =
    estimatedCost === null
      ? 'Coste estimado: no aplica (no se requiere IA).'
      : `Coste estimado: ${estimatedCost} unidad(es) ScenaIA (estrategia inicial IA-004).`

  return (
    `${aiPart}. ` +
    `Prioridad: ${priorityLevel} (heredada de la complejidad estimada de la peticion). ` +
    `${costPart} ` +
    `Confianza de la decision: ${decisionConfidence} (minimo entre confianza de interpretacion y confianza de conocimiento).`
  )
}
