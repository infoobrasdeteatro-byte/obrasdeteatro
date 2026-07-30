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
