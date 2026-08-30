import { createClient } from '@/lib/supabase/server'

export interface MetricInput {
  name: string
  value: number
  unit?: string
  tags?: Record<string, string>
}

export interface MetricEntry extends MetricInput {
  id: string
  profileId: string
  recordedAt: string
}

export interface MetricFilter {
  name?: string
  limit?: number
}

function toMetricEntry(
  row: {
    id: string
    profile_id: string | null
    metric_name: string
    metric_value: number
    metric_unit: string | null
    // `tags` llega como `Json` (columna jsonb, tipo generado por Supabase) --
    // se estrecha aqui a `Record<string, string>`, la unica forma que
    // recordMetric() escribe, en el mismo punto de conversion ya usado para
    // response_type en activity-log.ts.
    tags: unknown
    recorded_at: string
  },
  profileId: string
): MetricEntry {
  return {
    id: row.id,
    profileId: row.profile_id ?? profileId,
    name: row.metric_name,
    value: row.metric_value,
    unit: row.metric_unit ?? undefined,
    tags: (row.tags as Record<string, string> | null) ?? undefined,
    recordedAt: row.recorded_at,
  }
}

/**
 * Unica operacion de escritura -- vocabulario de `name` deliberadamente
 * abierto (sin catalogo cerrado, a diferencia de recordActivity): Telemetria
 * es un mecanismo general de instrumentacion, no atado a ningun productor
 * concreto. `profile_id` es estructuralmente necesario (sin DEFAULT
 * auth.uid() en la columna): la fila no puede construirse sin el.
 */
export async function recordMetric(profileId: string, metric: MetricInput): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from('telemetry_metrics').insert({
    profile_id: profileId,
    metric_name: metric.name,
    metric_value: metric.value,
    metric_unit: metric.unit ?? null,
    tags: metric.tags ?? null,
  })

  if (error) {
    throw new Error(`recordMetric failed: ${error.message}`)
  }
}

/**
 * Escritura de varias metricas del mismo perfil en una sola operacion
 * (Fase 0). Misma tabla y misma forma de fila que `recordMetric`: no es un
 * mecanismo distinto, es la misma escritura agrupada.
 *
 * Motivo medido, no supuesto: observar un turno emite siete metricas, y
 * enviarlas de una en una anadia ~194 ms al cierre del turno. Agrupadas,
 * cuesta un unico viaje. Un turno completo ronda 1,5-3 s, asi que ese
 * ahorro no es cosmetico.
 */
export async function recordMetrics(profileId: string, metrics: readonly MetricInput[]): Promise<void> {
  if (metrics.length === 0) return

  const supabase = await createClient()

  const { error } = await supabase.from('telemetry_metrics').insert(
    metrics.map((metric) => ({
      profile_id: profileId,
      metric_name: metric.name,
      metric_value: metric.value,
      metric_unit: metric.unit ?? null,
      tags: metric.tags ?? null,
    }))
  )

  if (error) {
    throw new Error(`recordMetrics failed: ${error.message}`)
  }
}

/**
 * Devuelve entradas crudas, en orden cronologico ascendente -- Telemetria
 * nunca consolida ni agrega (ese verbo pertenece a Observabilidad). Filtro
 * opcional por nombre de metrica; `profileId` explicito por el mismo motivo
 * ya establecido en el resto de Repository Layer (getIdentity,
 * listActivityHistory): redundante con RLS, pero mantiene la funcion pura y
 * testeable sin necesitar mockear sesion.
 */
export async function listMetrics(profileId: string, filter: MetricFilter = {}): Promise<MetricEntry[]> {
  const supabase = await createClient()

  let query = supabase
    .from('telemetry_metrics')
    .select('id, profile_id, metric_name, metric_value, metric_unit, tags, recorded_at')
    .eq('profile_id', profileId)

  if (filter.name) {
    query = query.eq('metric_name', filter.name)
  }

  const { data, error } = await query.order('recorded_at', { ascending: true }).limit(filter.limit ?? 50)

  if (error || !data) return []

  return data.map((row) => toMetricEntry(row, profileId))
}
