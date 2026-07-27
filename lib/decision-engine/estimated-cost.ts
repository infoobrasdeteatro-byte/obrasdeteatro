const ESTIMATED_COST_UNIT = 1

/**
 * Estrategia inicial de IA-004 (Complemento al Plan Tecnico, aprobado por
 * Decision de Direccion 2026-07-21): coste fijo y uniforme, sin
 * diferenciacion por complejidad, plan ni proveedor -- unidad interna
 * ScenaIA, desacoplada de IA-006. Sustituible en el futuro por una
 * politica de negocio distinta sin alterar la semantica arquitectonica
 * de estimatedCost (SC-004.2/SC-004.5).
 */
export function estimateCost(needsAI: boolean): number | null {
  return needsAI ? ESTIMATED_COST_UNIT : null
}
