import type { EstimatedComplexity } from '@/lib/request-interpreter'
import type { PriorityLevel } from './types'

/** Unica senal ordinal disponible -- el plan de suscripcion sigue "no disponible" por IA-001. */
export function derivePriorityLevel(estimatedComplexity: EstimatedComplexity): PriorityLevel {
  return estimatedComplexity
}
