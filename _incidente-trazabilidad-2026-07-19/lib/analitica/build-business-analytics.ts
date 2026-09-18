import { listExecutionAudit } from '@/lib/repository-layer'
import type { BusinessAnalyticsReport } from './types'

/**
 * Unico punto de entrada del componente. Misión congelada: interpretación
 * de negocio agregada, desde una perspectiva de plataforma -- nunca sobre
 * la actividad de un solo profesional. Consume exclusivamente
 * `listExecutionAudit()`; nunca Telemetria (fuera de sus fuentes
 * documentales autorizadas).
 *
 * El cuerpo real de esta funcion depende de que exista la identidad de
 * sistema de DT-004 (P-015, sin resolver): hasta entonces, la politica RLS
 * de `execution_audit_log` no autoriza ninguna lectura y `listExecutionAudit`
 * devuelve una lista vacia -- mismo tratamiento ya aceptado en AI
 * Gateway/Telemetria/Observabilidad (contrato correcto, sin productor o
 * consumidor real todavia).
 */
export async function buildBusinessAnalytics(): Promise<BusinessAnalyticsReport> {
  const entries = await listExecutionAudit()

  return {
    totalExecutions: entries.length,
    generatedAt: new Date().toISOString(),
  }
}
