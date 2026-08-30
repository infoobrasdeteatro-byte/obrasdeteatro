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
  ]

  // Una sola escritura para las siete metricas. Medido antes de decidirlo:
  // enviarlas por separado costaba ~194 ms al cierre de cada turno.
  return recordMetrics(profileId, metricas)
}
