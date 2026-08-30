import type { KnowledgeDomain } from '@/lib/knowledge-assets'

/**
 * Formato exacto y unico de la nota que knowledge-context-builder.ts anade
 * a knowledgeLimitations cuando un dominio con motor de interpretacion
 * propio (hoy, solo Obras) no reconoce ningun criterio en la peticion --
 * direct-content-builder.ts la busca por coincidencia exacta. No es una
 * heuristica: ambos lados representan el mismo booleano real ya calculado
 * por el motor de interpretacion de cada dominio dentro de Knowledge Assets
 * (`requestWasNarrowed`); nunca se reconstruye a partir del numero de
 * resultados (Decision de Direccion, SCENAIA-002 Caso 1). Vive en
 * scenaia-knowledge-model/ porque es quien define y puebla
 * `knowledgeLimitations`; direct-content-builder.ts ya depende de este
 * modulo para el tipo `KnowledgeContext`.
 */
export function unfilteredCriteriaNote(domain: KnowledgeDomain): string {
  return `${domain}: sin criterio reconocido en la peticion -- resultado sin filtrar`
}

/**
 * Nota de criterio PARCIALMENTE aplicado: el usuario pidio varias cosas, se
 * aplicaron unas y quedaron otras sin aplicar. Formato exacto y unico, igual
 * que `unfilteredCriteriaNote`, para que los consumidores la reconozcan por
 * coincidencia literal y nunca por heuristica.
 *
 * Es una nota distinta y no sustituye a la anterior: "no pude aplicar nada
 * de lo que pediste" y "apliqué parte de lo que pediste" son dos estados de
 * dominio diferentes y deben poder distinguirse (PRD-001). El detalle de que
 * criterio concreto quedo pendiente vive en
 * `KnowledgeRetrievalResult.unappliedCriteria`; esta nota transporta el
 * estado, no el detalle.
 */
export function partiallyAppliedCriteriaNote(domain: KnowledgeDomain): string {
  return `${domain}: criterio aplicado solo en parte -- el resultado no esta filtrado por todo lo pedido`
}
