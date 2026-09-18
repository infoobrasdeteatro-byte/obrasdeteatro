import type { KnowledgeDomain } from '@/lib/knowledge-assets'

/**
 * Dominios de CAT-001 efectivamente recuperables hoy a traves de Knowledge
 * Assets -- verificado contra el estado real del repositorio (Paso 3), no
 * supuesto. Los 6 restantes no tienen accessor propio (vinculados a IA-003
 * o a ausencia de mapeo de datos, ver Acta de Cierre de Knowledge Assets).
 */
const COVERED_DOMAINS: readonly KnowledgeDomain[] = ['Obras', 'Organizaciones', 'Personas']

export function isDomainCovered(domain: KnowledgeDomain): boolean {
  return COVERED_DOMAINS.includes(domain)
}
