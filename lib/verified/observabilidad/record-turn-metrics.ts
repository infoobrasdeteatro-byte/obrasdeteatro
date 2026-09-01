import { recordMetrics } from '@/lib/telemetria'
import type { TurnObservation } from './types'

/**
 * Observabilidad del turno completo (Fase 0 del Plan Maestro).
 *
 * `recordExecutionTrace` ya traducia el ExecutionAudit -- lo que ocurre
 * DENTRO del proveedor: latencia, tokens, coste. Lo que no habia forma de
 * observar era lo que ocurre ANTES: que entendio ScenaIA, cuanto recupero y
 * si se quedo sin nada que decir. Sin eso no puede medirse ninguna de las
 * fases siguientes -- especialmente la Fase 1, cuyo objetivo entero es que
 * `scenaia.response.empty` deje de dispararse.
 *
 * Se apoya en el mismo mecanismo general ya autorizado (`recordMetric`,
 * SC-005), sobre la misma tabla y con el mismo modelo de RLS. No introduce
 * persistencia nueva, ni tabla nueva, ni via nueva.
 *
 * PRIVACIDAD -- limite duro de esta capa: se registra lo que el sistema
 * ENTENDIO, jamas lo que la persona escribio. Los tags solo admiten
 * vocabulario cerrado del propio sistema (nombres de dominio, terminos
 * canonicos, tipos de respuesta), recuentos y el identificador tecnico del
 * turno. Ni el texto de la peticion, ni la respuesta del modelo, ni los
 * identificadores de las entidades recuperadas salen de aqui: de estas
 * ultimas solo viaja cuantas fueron.
 *
 * Nunca lanza: `recordMetric` ya captura sus propios fallos y devuelve un
 * booleano. Un fallo de observabilidad no puede degradar una respuesta ya
 * construida (misma propiedad ya congelada para recordActivity).
 */
/**
 * De donde salio el dominio con el que se resolvio el turno (Fase 1).
 *
 *   propio    -- la peticion nombraba su dominio y se interpreto sola.
 *   heredado  -- no lo nombraba y lo tomo de la conversacion anterior.
 *   ninguno   -- no se resolvio ningun dominio.
 *
 * Es la señal que faltaba: un turno resuelto por si mismo y otro que
 * arrastra el contexto producian metricas identicas, de modo que la
 * perdida de anclaje conversacional era invisible mientras el numero de
 * dominios siguiera siendo uno. Vocabulario cerrado de tres valores.
 */
function resolveDomainSource(domainCount: number, isContinuation: boolean): 'propio' | 'heredado' | 'ninguno' {
  if (domainCount === 0) return 'ninguno'

  return isContinuation ? 'heredado' : 'propio'
}

/**
 * Por que un turno se quedo sin entidades (Fase 1). Dos causas opuestas
 * que hasta ahora compartian el mismo `retrieval.entities_count = 0`:
 *
 *   sin_dominio     -- no habia ningun dominio cubierto que consultar.
 *   sin_resultados  -- se consulto el catalogo y no contenia nada.
 *
 * Devuelve `null` cuando si hubo entidades: entonces no hay vacio que
 * explicar y la metrica no se emite, en lugar de inventar un tercer valor
 * para "no aplica". Vocabulario cerrado de dos valores, tal como quedo
 * acotado tras la revision adversarial -- `criterios_imposibles` se
 * descarto por vestigial.
 */
function resolveEmptyReason(coveredDomainCount: number, retrievedEntityCount: number): 'sin_dominio' | 'sin_resultados' | null {
  if (retrievedEntityCount > 0) return null

  return coveredDomainCount === 0 ? 'sin_dominio' : 'sin_resultados'
}

export async function recordTurnMetrics(profileId: string, observation: TurnObservation): Promise<boolean> {
  const { requestId, domains, isContinuation, resolvedTerms } = observation

  /** Presente en TODA metrica del turno: es lo que permite correlacionarlas despues. */
  const base: Record<string, string> = { requestId }

  const contexto: Record<string, string> = {
    ...base,
    // Vocabulario cerrado del sistema, nunca texto de la persona.
    domains: domains.length > 0 ? domains.join(',') : 'ninguno',
    isContinuation: String(isContinuation),
  }

  const metricas = [
    { name: 'scenaia.request.duration_ms', value: observation.durationMs, unit: 'ms', tags: { ...contexto, responseType: observation.responseType } },
    { name: 'scenaia.interpreter.domains_count', value: domains.length, unit: 'count', tags: contexto },
    {
      name: 'scenaia.resolver.terms_count',
      value: resolvedTerms.length,
      unit: 'count',
      // Terminos del vocabulario CERRADO del resolutor -- nunca la peticion.
      tags: { ...base, terms: resolvedTerms.length > 0 ? resolvedTerms.join(',') : 'ninguno' },
    },
    // Solo el RECUENTO de entidades: que se recupero es dato del catalogo y
    // ya vive en su tabla; cuantas se recuperaron es lo que hay que medir.
    { name: 'scenaia.retrieval.entities_count', value: observation.retrievedEntityCount, unit: 'count', tags: contexto },
    { name: 'scenaia.knowledge.completeness', value: observation.knowledgeConfidence, unit: 'ratio', tags: contexto },
    // Metrica central de la Fase 1: 1 cuando el usuario se quedo sin nada.
    { name: 'scenaia.response.empty', value: observation.isEmptyResult ? 1 : 0, unit: 'flag', tags: contexto },
    { name: 'scenaia.response.status', value: 1, unit: 'count', tags: { ...base, responseType: observation.responseType } },
    // Fase 1 -- el origen del dominio viaja en el tag; el valor solo cuenta
    // la ocurrencia, mismo patron que `response.status` ya usaba.
    {
      name: 'scenaia.state.domain_source',
      value: 1,
      unit: 'count',
      tags: { ...contexto, domainSource: resolveDomainSource(domains.length, isContinuation) },
    },
  ]

  // Fase 1 -- solo cuando hay un vacio que explicar. Un turno con
  // resultados no emite esta metrica: la ausencia de la metrica ES la
  // afirmacion de que no hubo vacio, y no hace falta un valor "no aplica".
  const emptyReason = resolveEmptyReason(observation.coveredDomainCount, observation.retrievedEntityCount)
  if (emptyReason !== null) {
    metricas.push({ name: 'scenaia.retrieval.empty_reason', value: 1, unit: 'count', tags: { ...contexto, reason: emptyReason } })
  }

  // Bloque 4 -- solo cuando la estimacion se quedo corta. El VALOR de la
  // metrica es la diferencia: cuanto falto por reservar. Lo reservado y lo
  // liquidado viajan como etiquetas para poder recalibrar sin volver a la
  // base de datos.
  const anomalia = observation.settlementAnomaly
  if (anomalia !== null) {
    metricas.push({
      name: 'scenaia.accounting.settlement_anomaly',
      value: anomalia.settledCredits - anomalia.reservedCredits,
      unit: 'credits',
      tags: {
        ...base,
        reservationId: anomalia.reservationId,
        reserved: String(anomalia.reservedCredits),
        settled: String(anomalia.settledCredits),
        providerIdentifier: anomalia.providerIdentifier ?? 'ninguno',
        providerModel: anomalia.providerModel ?? 'ninguno',
      },
    })
  }

  // Una sola escritura para todas las metricas del turno. Medido antes de
  // decidirlo: enviarlas por separado costaba ~194 ms al cierre de cada
  // turno. Las metricas anadidas en la Fase 1 viajan en la misma escritura,
  // de modo que observar mas no cuesta un viaje mas.
  return recordMetrics(profileId, metricas)
}
