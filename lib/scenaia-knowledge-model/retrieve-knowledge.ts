import { retrieveRelevantKnowledge } from '@/lib/knowledge-assets'
import type { KnowledgeDomain, KnowledgeRetrievalResult, WorkSlotOccupancy, WorksPageRequest } from '@/lib/knowledge-assets'

/**
 * IA-003 (Plan Tecnico aprobado 2026-07-22): transporta el texto de la
 * peticion hasta Knowledge Assets a traves de su interfaz publica
 * `retrieveRelevantKnowledge`. La implementacion base activa hoy no tiene
 * motor de recuperacion semantica real para todos los dominios -- Obras ya
 * interpreta la peticion desde SCENAIA-002C -- pero el contrato ya
 * transporta `query`, sin exigir un cambio de firma cuando en el futuro
 * exista un motor real (independencia tecnologica). `requestWasNarrowed`
 * (SCENAIA-002, correccion definitiva de Caso 1) se transporta sin
 * modificar, junto con `items`.
 *
 * SCENAIA-004B §4.4: la pagina, si llega, se transporta tal cual; este
 * modulo no define su tamano. Sin pagina, la llamada es la de siempre.
 */
export async function retrieveKnowledgeForDomain(
  domain: KnowledgeDomain,
  query: string,
  previousOccupancy?: WorkSlotOccupancy,
  page?: WorksPageRequest
): Promise<KnowledgeRetrievalResult> {
  return page !== undefined
    ? retrieveRelevantKnowledge(domain, query, undefined, previousOccupancy, page)
    : retrieveRelevantKnowledge(domain, query, undefined, previousOccupancy)
}
