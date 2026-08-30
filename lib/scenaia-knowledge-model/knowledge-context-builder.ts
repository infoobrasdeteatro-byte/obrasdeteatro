import type { NormalizedRequest } from '@/lib/request-interpreter'
import type { WorkSlotOccupancy } from '@/lib/knowledge-assets'
import type { KnowledgeCompleteness, KnowledgeContext } from './types'
import { isDomainCovered } from './domain-coverage'
import { retrieveKnowledgeForDomain } from './retrieve-knowledge'
import { buildKnowledgeSummary } from './summary'
import { unfilteredCriteriaNote, partiallyAppliedCriteriaNote } from './unfiltered-note'

function estimateCompleteness(requestedCount: number, coveredCount: number): KnowledgeCompleteness {
  if (requestedCount === 0 || coveredCount === 0) return 'vacio'
  return coveredCount === requestedCount ? 'completo' : 'parcial'
}

function completenessToConfidence(completeness: KnowledgeCompleteness): number {
  if (completeness === 'completo') return 1
  if (completeness === 'parcial') return 0.5
  return 0
}

/**
 * Unico punto de entrada del SKM (SC-004.3). ProfessionalContext no forma
 * parte de la interfaz publica en esta version -- ningun comportamiento
 * depende de el todavia (aprobado por la Direccion, 2026-07-16); su
 * consumo futuro para personalizar la recuperacion queda como evolucion
 * posterior, fuera del alcance actual. Objeto efimero: se construye de
 * nuevo en cada invocacion, nunca se cachea ni se reutiliza.
 */
export async function buildKnowledgeContext(
  normalizedRequest: NormalizedRequest,
  previousOccupancy: WorkSlotOccupancy = {}
): Promise<KnowledgeContext> {
  // Deduplicado defensivo: NormalizedRequest no garantiza unicidad a nivel de
  // tipos, aunque el unico productor actual (Request Interpreter) nunca la
  // viola -- evita recuperar el mismo dominio dos veces si eso cambiara.
  const requestedDomains = [...new Set(normalizedRequest.requestedKnowledgeDomains)]
  const coveredDomains = requestedDomains.filter(isDomainCovered)
  const notCoveredDomains = requestedDomains.filter((domain) => !isDomainCovered(domain))

  const resultsByDomain = await Promise.all(
    coveredDomains.map((domain) => retrieveKnowledgeForDomain(domain, normalizedRequest.retrievalQuery, previousOccupancy))
  )
  const knowledgeEntities = resultsByDomain.flatMap((result) => result.items)

  const knowledgeLimitations = notCoveredDomains.map(
    (domain) => `dominio ${domain} solicitado pero no cubierto por Knowledge Assets en esta version`
  )
  if (coveredDomains.length > 0) {
    knowledgeLimitations.push(
      'los dominios cubiertos se enumeran sin relevancia ni relacion con el texto de la peticion -- sin motor de busqueda (IA-003)'
    )
  }
  /**
   * SCENAIA-002, correccion definitiva de Caso 1: transporta, sin
   * reconstruirlo, el mismo `requestWasNarrowed` real ya calculado por el
   * motor de interpretacion de cada dominio. Cuando es false, el dominio
   * devolvio resultados sin haber reconocido ningun criterio explicito de
   * la peticion -- direct-content-builder.ts la usa para no presentar ese
   * listado como si cumpliera un criterio que en realidad no aplico.
   */
  // Cuatro estados, tres resultados distintos -- ninguno inferido: cada uno
  // se lee de las dos señales explicitas que Knowledge Assets ya calculo.
  //
  //   narrowed=true,  unapplied=[]   -> COMPLETO: nada que declarar.
  //   narrowed=true,  unapplied=[..] -> PARCIAL: se aplico parte del criterio.
  //   narrowed=false, unapplied=[..] -> se pidio criterio y no se aplico ninguno.
  //   narrowed=false, unapplied=[]   -> SIN criterio: el usuario no pidio nada
  //                                     que filtrar, advertirle seria falso.
  coveredDomains.forEach((domain, index) => {
    const { requestWasNarrowed, unappliedCriteria } = resultsByDomain[index]
    if (unappliedCriteria.length === 0) return

    knowledgeLimitations.push(
      requestWasNarrowed ? partiallyAppliedCriteriaNote(domain) : unfilteredCriteriaNote(domain)
    )
  })

  const knowledgeCompleteness = estimateCompleteness(requestedDomains.length, coveredDomains.length)

  return {
    knowledgeSummary: buildKnowledgeSummary(requestedDomains, coveredDomains, knowledgeEntities),
    knowledgeDomains: coveredDomains,
    knowledgeEntities,
    knowledgeRelations: null,
    knowledgeConfidence: completenessToConfidence(knowledgeCompleteness),
    knowledgeCompleteness,
    knowledgeLimitations,
    // Contexto que sobrevive al turno (Fase 3). Se transporta sin
    // interpretarlo: este componente no decide que significa una ranura,
    // solo lleva hasta el Orquestador lo que el motor de dominio resolvio.
    workOccupancy: resultsByDomain.find((resultado) => Object.keys(resultado.workOccupancy).length > 0)?.workOccupancy ?? {},
    knowledgeTimestamp: new Date().toISOString(),
  }
}
