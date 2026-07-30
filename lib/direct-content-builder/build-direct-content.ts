import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { unfilteredCriteriaNote } from '@/lib/scenaia-knowledge-model'

/**
 * Unico punto de entrada del componente (IA-008, Plan Tecnico aprobado
 * 2026-07-22). Determinista y sincrono: no invoca IA, no consulta ninguna
 * fuente de datos propia -- solo formatea las etiquetas ya recuperadas por
 * SKM (`entryLabelsByDomain`), nunca sintetiza texto nuevo a partir de
 * conocimiento crudo.
 *
 * SCENAIA-002, correccion definitiva de Caso 1: cuando `knowledgeLimitations`
 * contiene la nota exacta de `unfilteredCriteriaNote(domain)` para un
 * dominio, ese listado se marca explicitamente como catalogo general sin
 * filtrar -- nunca se presenta como si cumpliera un criterio de la peticion
 * que en realidad no se pudo reconocer. La comprobacion es una coincidencia
 * exacta de texto sobre un valor ya calculado (`requestWasNarrowed`, dentro
 * de Knowledge Assets), no una heuristica sobre el numero de resultados.
 */
export function buildDirectContent(knowledgeContext: KnowledgeContext): string | null {
  const domainsWithLabels = knowledgeContext.knowledgeDomains.filter((domain) => {
    const labels = knowledgeContext.knowledgeSummary.entryLabelsByDomain[domain]
    return Array.isArray(labels) && labels.length > 0
  })

  if (domainsWithLabels.length === 0) return null

  const groups = domainsWithLabels.map((domain) => {
    const labels = knowledgeContext.knowledgeSummary.entryLabelsByDomain[domain] as string[]
    const sinFiltro = knowledgeContext.knowledgeLimitations.includes(unfilteredCriteriaNote(domain))
    const aviso = sinFiltro ? ' (no se ha podido aplicar el criterio solicitado; catalogo general sin filtrar)' : ''
    return `${labels.join(', ')}${aviso}`
  })

  return `Resultados encontrados: ${groups.join('; ')}.`
}
