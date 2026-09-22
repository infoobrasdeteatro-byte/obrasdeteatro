import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { unfilteredCriteriaNote, partiallyAppliedCriteriaNote } from '@/lib/scenaia-knowledge-model'

/** Unico dominio cuyo listado puede resolverse sin IA (SCENAIA-004 §4.1 d). */
const DOMINIO_AUTORIZADO = 'Obras'

/**
 * Listado puro: la peticion pide una lista y el conocimiento ya recuperado
 * la responde entera (SCENAIA-004 §4.1).
 *
 * Se comprueban las CINCO condiciones, no una aproximacion de ellas. Las
 * dos primeras las resolvio Request Interpreter leyendo el texto y llegan
 * en `requestsPlainListing`; las tres restantes se leen aqui del
 * conocimiento, que es lo que este componente si ve:
 *
 *   (c) ningun criterio quedo sin aplicar -- ni del todo ni en parte. Se
 *       comprueba por coincidencia exacta con las dos notas que SKM ya
 *       emite, nunca reinterpretando el numero de resultados;
 *   (d) el dominio resuelto es Obras, y solo Obras. Dos dominios a la vez
 *       no son un listado: son dos;
 *   (e) hay al menos una obra recuperada. Sin resultados no hay lista que
 *       dar, y ese caso ya lo resuelve la regla anterior.
 *
 * Si falla cualquiera, devuelve false y el turno se comporta como hoy:
 * ante la duda, IA.
 */
export function isPlainListing(
  normalizedRequest: NormalizedRequest,
  knowledgeContext: KnowledgeContext
): boolean {
  if (!normalizedRequest.requestsPlainListing) return false

  const { knowledgeDomains, knowledgeEntities, knowledgeLimitations } = knowledgeContext

  if (knowledgeDomains.length !== 1 || knowledgeDomains[0] !== DOMINIO_AUTORIZADO) return false
  if (normalizedRequest.requestedKnowledgeDomains.length !== 1) return false

  if (knowledgeLimitations.includes(unfilteredCriteriaNote(DOMINIO_AUTORIZADO))) return false
  if (knowledgeLimitations.includes(partiallyAppliedCriteriaNote(DOMINIO_AUTORIZADO))) return false

  return knowledgeEntities.some((item) => item.domain === DOMINIO_AUTORIZADO)
}
