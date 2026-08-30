import type { KnowledgeProvenance } from './types'

/**
 * Procedencia de un dato leido del catalogo propio de ObrasDeTeatro.
 *
 * `authority` es siempre `CATALOGO_PROPIO`: es dato verificado del
 * ecosistema, el nivel mas alto de la jerarquia. `sourceName`/`sourceUrl`
 * recogen exclusivamente lo que el registro real declara -- si el catalogo
 * no declara fuente, viajan como `null`, nunca se inventa una.
 *
 * `validUntil` es `null` porque el catalogo propio es conocimiento estable:
 * una obra o una organizacion no caducan. Cuando se incorporen fuentes con
 * vigencia (subvenciones, convocatorias, cartelera) produciran su propia
 * fecha aqui, sin modificar este contrato.
 */
export function catalogProvenance(source: { sourceName?: string | null; sourceUrl?: string | null } = {}): KnowledgeProvenance {
  return {
    authority: 'CATALOGO_PROPIO',
    sourceName: source.sourceName ?? null,
    sourceUrl: source.sourceUrl ?? null,
    observedAt: new Date().toISOString(),
    validUntil: null,
  }
}
