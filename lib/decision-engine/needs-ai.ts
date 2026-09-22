import type { KnowledgeCompleteness } from '@/lib/scenaia-knowledge-model'

/**
 * Aplica el orden obligatorio ya congelado de SC-002: solo se solicita IA
 * si el conocimiento recuperado no basta.
 *
 * Precision de la señal (Reconexion del Nucleo Conversacional): hasta
 * ahora la unica entrada era `knowledgeCompleteness`, que responde a "¿los
 * dominios pedidos estan cubiertos?" y no a "¿el conocimiento recuperado
 * basta?" -- `estimateCompleteness()` cuenta dominios, nunca resultados,
 * de modo que un dominio cubierto con cero entidades devolvia igualmente
 * `'completo'`. Ese desajuste hacia que la rama determinista absorbiera
 * toda consulta teatral, incluidas aquellas en las que si habia
 * conocimiento real sobre el que conversar.
 *
 * La regla queda ahora enunciada sobre las dos señales reales:
 *
 *   - Conocimiento incompleto (`'parcial'` / `'vacio'`) -> se solicita IA.
 *     Comportamiento identico al anterior, sin cambio alguno.
 *   - Conocimiento completo CON entidades recuperadas -> se solicita IA:
 *     enumerar titulos no es responder a la peticion del usuario, es
 *     listarla. La base factual sigue siendo exclusivamente el
 *     conocimiento recuperado (Knowledge Assets), que Prompt Composer ya
 *     entrega al proveedor; la IA aporta la capa conversacional, nunca el
 *     dato.
 *   - Conocimiento completo SIN ninguna entidad -> NO se solicita IA. Es
 *     el unico caso en el que enumerar es exactamente la respuesta
 *     completa y honesta ("no he encontrado ningun resultado", Caso 2 de
 *     SCENAIA-003): la IA no aportaria valor conversacional, solo coste y
 *     riesgo de inventar un catalogo inexistente.
 *
 * EXCEPCION AUTORIZADA (SCENAIA-004, Acta firmada el 2026-09-22): un
 * LISTADO PURO tampoco solicita IA. La regla de arriba presupone que lo
 * determinista solo sabe enumerar titulos; cuando la peticion es
 * exactamente una lista y el conocimiento ya recuperado la responde
 * entera, esa presuncion deja de sostenerse -- el catalogo ya trae autor,
 * genero, ano, duracion, reparto, edad e idioma, y el Acta autoriza
 * componer la ficha con ellos. La IA solo anadiria coste, espera y el
 * riesgo de entregar la lista cortada, que es el defecto que el Acta
 * corrige.
 *
 * La excepcion no se decide aqui: llega ya resuelta en `plainListing`
 * (§4.1, las cinco condiciones). Fuera de ella la regla anterior sigue
 * intacta, y el valor por defecto `false` preserva a todo llamador que no
 * la declare.
 *
 * Funcion pura y sincrona. No conoce credito, plan, proveedor ni coste:
 * Credit Manager sigue siendo posterior y obligatorio antes de cualquier
 * ejecucion con coste real.
 */
export function needsAI(
  knowledgeCompleteness: KnowledgeCompleteness,
  retrievedEntityCount: number,
  plainListing = false
): boolean {
  if (knowledgeCompleteness !== 'completo') return true
  if (plainListing) return false

  return retrievedEntityCount > 0
}
