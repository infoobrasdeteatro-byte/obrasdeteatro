import { recordExecutionTrace } from '@/lib/verified/observabilidad'
import type { ExecutionAuditConsumer } from './types'

/**
 * Registro de consumidores efectivamente conectados (IA-007, Plan Tecnico
 * aprobado 2026-07-22). Unico consumidor real en este incremento:
 * Observabilidad -- migra la entrega ya existente, sin alterarla. Las
 * cinco categorias restantes (Auditoria, Monitorizacion, Analitica,
 * DiagnosticoTecnico, Liquidacion) quedan declaradas en el tipo, sin
 * consumidor registrado -- su incorporacion efectiva queda expresamente
 * fuera del alcance autorizado para esta implementacion.
 */
export const REGISTERED_CONSUMERS: readonly ExecutionAuditConsumer[] = [
  {
    category: 'Observabilidad',
    deliver: async (userId, audit, context) => {
      await recordExecutionTrace(userId, audit, context)
    },
  },
]
