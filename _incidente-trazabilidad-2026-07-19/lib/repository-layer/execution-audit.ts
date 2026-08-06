import { createClient } from '@/lib/supabase/server'

export interface ExecutionAuditInput {
  providerIdentifier: string | null
  providerModel: string | null
  executionLatencyMs: number | null
  tokensConsumed: number | null
  realExecutionCost: number | null
  technicalMetadata: string | null
}

export interface ExecutionAuditEntry extends ExecutionAuditInput {
  id: string
  profileId: string
  recordedAt: string
}

export interface ExecutionAuditQuery {
  limit?: number
}

function toExecutionAuditEntry(
  row: {
    id: string
    profile_id: string | null
    provider_identifier: string | null
    provider_model: string | null
    execution_latency_ms: number | null
    tokens_consumed: number | null
    real_execution_cost: number | null
    technical_metadata: string | null
    recorded_at: string
  },
  fallbackProfileId: string | null
): ExecutionAuditEntry {
  return {
    id: row.id,
    profileId: row.profile_id ?? fallbackProfileId ?? '',
    providerIdentifier: row.provider_identifier,
    providerModel: row.provider_model,
    executionLatencyMs: row.execution_latency_ms,
    tokensConsumed: row.tokens_consumed,
    realExecutionCost: row.real_execution_cost,
    technicalMetadata: row.technical_metadata,
    recordedAt: row.recorded_at,
  }
}

/**
 * ExecutionAudit no es un recurso exclusivo de Analitica -- Accounting
 * Engine sera, en el futuro, otro consumidor autorizado (liquidacion,
 * IA-007). Por eso vive aqui, no en un modulo de Servicio de Plataforma
 * propio. Mismo comportamiento que recordActivity/recordMetric: lanza
 * excepcion en caso de error -- la responsabilidad de no interrumpir el
 * flujo sincrono que la invoque (AI Gateway) pertenece a quien la invoca,
 * no a este mecanismo general de persistencia (decision explicita: no
 * introducir una segunda semantica de retorno dentro de Repository Layer).
 */
export async function recordExecutionAudit(profileId: string, audit: ExecutionAuditInput): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('execution_audit_log').insert({
    profile_id: profileId,
    provider_identifier: audit.providerIdentifier,
    provider_model: audit.providerModel,
    execution_latency_ms: audit.executionLatencyMs,
    tokens_consumed: audit.tokensConsumed,
    real_execution_cost: audit.realExecutionCost,
    technical_metadata: audit.technicalMetadata,
  })

  if (error) {
    throw new Error(`recordExecutionAudit failed: ${error.message}`)
  }
}

/**
 * Lectura agregada, sin profileId: unica funcion de lectura de todo el
 * proyecto que no se acota a un solo perfil, por diseno (DT-004) -- lee a
 * traves de la identidad de sistema autorizada por su propia politica RLS
 * de SELECT, todavia no creada (P-015). Usa el mismo createClient() de
 * sesion que el resto de Repository Layer: la particularidad no esta en el
 * codigo, esta en que sesion se autentique al invocarla.
 */
export async function listExecutionAudit(query: ExecutionAuditQuery = {}): Promise<ExecutionAuditEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('execution_audit_log')
    .select(
      'id, profile_id, provider_identifier, provider_model, execution_latency_ms, tokens_consumed, real_execution_cost, technical_metadata, recorded_at'
    )
    .order('recorded_at', { ascending: true })
    .limit(query.limit ?? 100)

  if (error || !data) return []

  return data.map((row) => toExecutionAuditEntry(row, null))
}
