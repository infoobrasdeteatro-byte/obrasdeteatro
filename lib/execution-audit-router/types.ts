import type { ExecutionAudit } from '@/lib/ai-gateway'
import type { ExecutionTraceContext } from '@/lib/verified/observabilidad'

/**
 * Las 6 categorias de consumo ya autorizadas por SC-004.7 revisado, mas
 * Accounting Engine (liquidacion, reapertura de SC-004.5/SC-004.7).
 * Ninguna autorizacion nueva se crea aqui -- IA-007 (Decision de Direccion,
 * Punto 4) no amplia ni reduce lo ya fijado.
 */
export type ExecutionAuditConsumerCategory =
  | 'Auditoria'
  | 'Monitorizacion'
  | 'Observabilidad'
  | 'Analitica'
  | 'DiagnosticoTecnico'
  | 'Liquidacion'

/**
 * Contrato de entrega (IA-007, Plan Tecnico aprobado 2026-07-22). El
 * enrutador invoca `deliver()` sin interpretar, transformar ni decidir
 * contenido -- toda logica especifica del consumidor vive en su propia
 * implementacion, nunca en el enrutador (Decision de Direccion, Punto 3).
 */
export interface ExecutionAuditConsumer {
  readonly category: ExecutionAuditConsumerCategory
  deliver(userId: string, audit: ExecutionAudit, context?: ExecutionTraceContext): Promise<void>
}
