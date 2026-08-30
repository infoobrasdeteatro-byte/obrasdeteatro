import type { KnowledgeDomain, StructuredKnowledgeItem, WorkSlotOccupancy } from '@/lib/knowledge-assets'

/**
 * Mide la propia cobertura del SKM (dominios solicitados vs. efectivamente
 * cubiertos) -- no es una taxonomia de dominio, es una medida interna del
 * proceso de recuperacion (aprobado por la Direccion, 2026-07-16, mismo
 * criterio ya aplicado a EstimatedComplexity en Request Interpreter).
 */
export type KnowledgeCompleteness = 'completo' | 'parcial' | 'vacio'

/**
 * Sintesis objetiva y determinista del resultado de la recuperacion --
 * precision de la Direccion (2026-07-16): no debe ser unicamente un
 * conjunto de estadisticas (por eso incluye las etiquetas reales de las
 * entidades encontradas, no solo conteos) ni texto generado (las etiquetas
 * son el titulo/nombre ya existente de cada entidad, nunca prosa
 * compuesta). Distinta de `knowledgeEntities` en el contrato: aqui se
 * sintetiza por dominio, alli se conserva el dato completo.
 */
export interface KnowledgeSummary {
  readonly domainsRequested: KnowledgeDomain[]
  readonly domainsCovered: KnowledgeDomain[]
  readonly domainsNotCovered: KnowledgeDomain[]
  readonly entryLabelsByDomain: Partial<Record<KnowledgeDomain, string[]>>
}

/**
 * Objeto efimero (SC-004.3): no se almacena, no se modifica una vez
 * construido, no se reutiliza entre peticiones. `knowledgeRelations`
 * siempre `null` en v1: Knowledge Assets no produce relaciones entre
 * entidades (coincide con que "Relaciones" es uno de los dominios CAT-001
 * todavia sin implementar).
 */
export interface KnowledgeContext {
  readonly knowledgeSummary: KnowledgeSummary
  readonly knowledgeDomains: KnowledgeDomain[]
  readonly knowledgeEntities: StructuredKnowledgeItem[]
  readonly knowledgeRelations: null
  readonly knowledgeConfidence: number
  readonly knowledgeCompleteness: KnowledgeCompleteness
  readonly knowledgeLimitations: string[]
  /**
   * Ranuras del dominio Obras vigentes tras este turno (Fase 3). Se
   * transporta hasta el Orquestador, que es quien compone el estado
   * conversacional; este modulo no lo interpreta ni lo almacena. Un
   * objeto vacio significa "ninguna dimension acotada", estado real y
   * explicito, nunca ausencia de dato.
   */
  readonly workOccupancy: WorkSlotOccupancy
  readonly knowledgeTimestamp: string
}
