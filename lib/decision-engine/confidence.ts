/** El eslabon mas debil, no el promedio: la decision no puede ser mas fiable que su entrada menos fiable. */
export function estimateDecisionConfidence(interpretationConfidence: number, knowledgeConfidence: number): number {
  return Math.min(interpretationConfidence, knowledgeConfidence)
}
