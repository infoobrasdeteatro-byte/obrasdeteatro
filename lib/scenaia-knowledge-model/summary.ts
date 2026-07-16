import type { KnowledgeDomain, StructuredKnowledgeItem } from '@/lib/knowledge-assets'
import type { KnowledgeSummary } from './types'

/** La etiqueta es el titulo/nombre ya existente del dato, nunca texto compuesto. */
function labelOf(item: StructuredKnowledgeItem): string {
  return item.domain === 'Obras' ? item.data.title : item.data.name
}

export function buildKnowledgeSummary(
  requestedDomains: KnowledgeDomain[],
  coveredDomains: KnowledgeDomain[],
  entities: StructuredKnowledgeItem[]
): KnowledgeSummary {
  const domainsNotCovered = requestedDomains.filter((domain) => !coveredDomains.includes(domain))

  const entryLabelsByDomain: Partial<Record<KnowledgeDomain, string[]>> = {}
  for (const domain of coveredDomains) {
    entryLabelsByDomain[domain] = entities.filter((item) => item.domain === domain).map(labelOf)
  }

  return {
    domainsRequested: requestedDomains,
    domainsCovered: coveredDomains,
    domainsNotCovered,
    entryLabelsByDomain,
  }
}
