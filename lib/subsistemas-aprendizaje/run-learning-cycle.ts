import type { LearningCycleResult } from './types'

const NOT_EXECUTED_REASON =
  'sin fuente de datos, mecanismo de aprendizaje ni forma de entrega autorizados -- contrato minimo abstracto (R-02), vacios pendientes de expedientes propios'

/**
 * Unico punto de acceso publico (Plan Tecnico aprobado, R-02, 2026-07-23).
 * No participa en el flujo sincrono ni en el pipeline principal (mision ya
 * congelada de Subsistemas de Aprendizaje) -- no invocado desde el
 * Orquestador ni desde ningun otro componente. Nunca lanza excepcion.
 */
export async function runLearningCycle(): Promise<LearningCycleResult> {
  return {
    executed: false,
    reason: NOT_EXECUTED_REASON,
  }
}
