import type { Organization, Work } from '@/lib/repository-layer'

/**
 * The 8 official knowledge domains (CAT-001). No other value may be used
 * to tag a knowledge item.
 */
export type KnowledgeDomain =
  | 'Personas'
  | 'Obras'
  | 'Organizaciones'
  | 'Oportunidades'
  | 'Editorial'
  | 'Relaciones'
  | 'Trayectoria'
  | 'Inteligencia'

export interface KnowledgeItem<TDomain extends KnowledgeDomain, TData> {
  domain: TDomain
  data: TData
}

export type WorkKnowledgeItem = KnowledgeItem<'Obras', Work>
export type OrganizationKnowledgeItem = KnowledgeItem<'Organizaciones', Organization>

export type StructuredKnowledgeItem = WorkKnowledgeItem | OrganizationKnowledgeItem
