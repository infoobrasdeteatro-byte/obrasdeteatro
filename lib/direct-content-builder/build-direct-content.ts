import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'

/**
 * Unico punto de entrada del componente (IA-008, Plan Tecnico aprobado
 * 2026-07-22). Determinista y sincrono: no invoca IA, no consulta ninguna
 * fuente de datos propia -- solo formatea las etiquetas ya recuperadas por
 * SKM (`entryLabelsByDomain`), nunca sintetiza texto nuevo a partir de
 * conocimiento crudo.
 */
export function buildDirectContent(knowledgeContext: KnowledgeContext): string | null {
  const labelGroups = knowledgeContext.knowledgeDomains
    .map((domain) => knowledgeContext.knowledgeSummary.entryLabelsByDomain[domain])
    .filter((labels): labels is string[] => Array.isArray(labels) && labels.length > 0)

  if (labelGroups.length === 0) return null

  return `Resultados encontrados: ${labelGroups.map((labels) => labels.join(', ')).join('; ')}.`
}
