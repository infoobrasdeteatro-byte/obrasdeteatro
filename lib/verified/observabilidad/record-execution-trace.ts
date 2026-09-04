import { recordMetric } from '@/lib/telemetria'
import { calculateExecutionCost } from '@/lib/provider-catalog'
import type { ExecutionAudit, ExecutionTraceContext } from './types'

type NumericAuditField =
  | 'executionLatencyMs'
  | 'tokensConsumed'
  | 'inputTokens'
  | 'outputTokens'
  | 'maxOutputTokens'
  | 'realExecutionCost'

/**
 * `real_execution_cost` conserva su nombre de metrica ya establecido, pero
 * su unidad deja de estar fijada en el codigo: la moneda real viaja como
 * tag desde la tarifa del catalogo (IA-006), porque no le corresponde a
 * este modulo decidir en que se cobra.
 */
const NUMERIC_FIELDS: Array<{ key: NumericAuditField; name: string; unit: string }> = [
  { key: 'executionLatencyMs', name: 'ai_gateway.execution_latency_ms', unit: 'ms' },
  { key: 'tokensConsumed', name: 'ai_gateway.tokens_consumed', unit: 'tokens' },
  { key: 'inputTokens', name: 'ai_gateway.input_tokens', unit: 'tokens' },
  { key: 'outputTokens', name: 'ai_gateway.output_tokens', unit: 'tokens' },
  // F5F-2 -- el techo que la ejecucion aplico. Entra por el mecanismo
  // existente, sin rama propia: `null` (sin ejecucion, o adaptador que no
  // lo declara) simplemente no emite metrica, igual que el resto.
  //
  // Se registra junto a `output_tokens` porque solo tiene sentido con el:
  // el par da el margen que quedaba, y es lo que permitira recalibrar el
  // techo con datos en lugar de deducirlo del codigo.
  { key: 'maxOutputTokens', name: 'ai_gateway.max_output_tokens', unit: 'tokens' },
  { key: 'realExecutionCost', name: 'ai_gateway.real_execution_cost', unit: 'currency' },
]

/**
 * Tarificacion de la ejecucion (IA-006).
 *
 * Ocurre AQUI y no en AI Gateway por una razon de gobernanza, no de
 * comodidad: el catalogo de proveedores es competencia de Decision Engine y
 * "AI Gateway nunca lo importa: invoca, nunca selecciona" (invariante de
 * Direccion, cierre de IA-006). Observabilidad si puede consultarlo -- no es
 * un componente del Nucleo, y ya recibe todo lo necesario: proveedor,
 * modelo y tokens.
 *
 * Solo tarifa cuando el audit NO trae ya un coste: si el proveedor lo
 * comunico por su cuenta, ese valor manda y se registra tal cual, sin
 * atribuirle una moneda que nadie ha declarado. Si no hay tarifa en el
 * catalogo, no hay coste: `null`, nunca cero.
 */
function resolveCost(audit: ExecutionAudit): { amount: number; currency: string } | null {
  if (audit.realExecutionCost !== null) return null
  if (audit.providerIdentifier === null || audit.providerModel === null) return null

  return calculateExecutionCost({
    providerId: audit.providerIdentifier,
    model: audit.providerModel,
    inputTokens: audit.inputTokens,
    outputTokens: audit.outputTokens,
  })
}

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
 *
 * `context` (Fase 0) es opcional y solo anade tags: `requestId` correlaciona
 * esta ejecucion con el resto de metricas del mismo turno, y `stage`
 * distingue la ejecucion del resolutor de la de la respuesta -- sin el, el
 * coste y la latencia de ambas quedaban sumados e indistinguibles. Su
 * ausencia deja el comportamiento anterior intacto.
 */
export async function recordExecutionTrace(
  profileId: string,
  audit: ExecutionAudit,
  context?: ExecutionTraceContext
): Promise<boolean> {
  const tags: Record<string, string> = {}
  if (audit.providerIdentifier) tags.providerIdentifier = audit.providerIdentifier
  if (audit.providerModel) tags.providerModel = audit.providerModel
  const cost = resolveCost(audit)
  if (cost !== null) tags.currency = cost.currency
  if (context) {
    tags.requestId = context.requestId
    tags.stage = context.stage
  }
  const hasTags = Object.keys(tags).length > 0

  const writes = NUMERIC_FIELDS.filter((field) => audit[field.key] !== null).map((field) =>
    recordMetric(profileId, {
      name: field.name,
      value: audit[field.key] as number,
      unit: field.unit,
      ...(hasTags ? { tags } : {}),
    })
  )

  // El coste tarificado se registra bajo la misma metrica ya establecida
  // cuando el audit no lo traia calculado -- no se inventa una segunda.
  if (cost !== null) {
    writes.push(
      recordMetric(profileId, {
        name: 'ai_gateway.real_execution_cost',
        value: cost.amount,
        unit: 'currency',
        ...(hasTags ? { tags } : {}),
      })
    )
  }

  // TRUNCAMIENTO (Bloque 5C; renombrada en 5D). Pertenece a la familia
  // `ai_gateway.*` -- hechos de UNA ejecucion concreta del proveedor --, no
  // a `scenaia.*`, reservada a hechos del turno. Un turno puede contener
  // dos ejecuciones (resolutor y respuesta) y truncarse solo una: llamarla
  // "del turno" haria imposible saber cual.
  //
  // Se emite como bandera 0/1 SIEMPRE que hubo ejecucion -- mismo patron de
  // bandera ya usado por `scenaia.response.empty` --, no solo cuando corta.
  // La razon es que la pregunta que hay que responder no es "cuantas veces
  // se trunco", sino "que PROPORCION de ejecuciones se trunca": sin el
  // denominador, la metrica no sirve para decidir un techo, que es
  // exactamente para lo que existe.
  //
  // `null` (no hubo ejecucion) no emite nada: no es un cero, es una
  // pregunta sin sujeto.
  //
  // Los tags ya distinguen las cuatro dimensiones pedidas: la operacion la
  // aporta `stage` (resolver / response), y proveedor y modelo vienen del
  // propio audit. No se anade ni un campo nuevo.
  if (audit.truncated !== null) {
    writes.push(
      recordMetric(profileId, {
        name: 'ai_gateway.truncated',
        value: audit.truncated ? 1 : 0,
        unit: 'flag',
        ...(hasTags ? { tags } : {}),
      })
    )
  }

  const results = await Promise.all(writes)
  return results.every(Boolean)
}
