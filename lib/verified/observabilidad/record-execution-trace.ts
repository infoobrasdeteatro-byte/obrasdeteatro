import { recordMetric } from '@/lib/telemetria'
import type { ExecutionAudit } from './types'

const NUMERIC_FIELDS: Array<{ key: 'executionLatencyMs' | 'tokensConsumed' | 'realExecutionCost'; name: string; unit: string }> = [
  { key: 'executionLatencyMs', name: 'ai_gateway.execution_latency_ms', unit: 'ms' },
  { key: 'tokensConsumed', name: 'ai_gateway.tokens_consumed', unit: 'tokens' },
  { key: 'realExecutionCost', name: 'ai_gateway.real_execution_cost', unit: 'usd' },
]

/**
 * Traduce ExecutionAudit a metricas de Telemetria, unica via de persistencia
 * autorizada (Plan Tecnico congelado, revision R-02). providerIdentifier/
 * providerModel viajan como tags de cada metrica numerica. technicalMetadata
 * no dispone actualmente de un destino arquitectonico autorizado dentro de
 * Observabilidad v1 -- no se traduce (no se pierde: quien invoque esta
 * funcion sigue recibiendo el ExecutionAudit completo por su cuenta).
 *
 * Depende del mismo actor todavia inexistente que recordActivity()/
 * recordMetric(): un futuro orquestador que conozca profileId (de construir
 * ProfessionalContext) y tambien el ExecutionAudit que executeAIRequest()
 * devuelve -- ningun componente del flujo verificado los tiene ambos hoy
 * (R-01/R-02 de esta misma revision). No resuelve esa dependencia, la hereda
 * explicitamente.
 *
 * Nunca lanza: recordMetric() de Telemetria ya nunca lanza por si mismo.
 */
export async function recordExecutionTrace(profileId: string, audit: ExecutionAudit): Promise<boolean> {
  const tags: Record<string, string> = {}
  if (audit.providerIdentifier) tags.providerIdentifier = audit.providerIdentifier
  if (audit.providerModel) tags.providerModel = audit.providerModel
  const hasTags = Object.keys(tags).length > 0

  const writes = NUMERIC_FIELDS.filter((field) => audit[field.key] !== null).map((field) =>
    recordMetric(profileId, {
      name: field.name,
      value: audit[field.key] as number,
      unit: field.unit,
      ...(hasTags ? { tags } : {}),
    })
  )

  const results = await Promise.all(writes)
  return results.every(Boolean)
}
