import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { unfilteredCriteriaNote } from '@/lib/scenaia-knowledge-model'

/**
 * Unico punto de entrada del componente (IA-008, Plan Tecnico aprobado
 * 2026-07-22). Determinista y sincrono: no invoca IA, no consulta ninguna
 * fuente de datos propia -- solo formatea las etiquetas ya recuperadas por
 * SKM (`entryLabelsByDomain`), nunca sintetiza texto nuevo a partir de
 * conocimiento crudo.
 *
 * SCENAIA-002, correccion definitiva de Caso 1: cuando `knowledgeLimitations`
 * contiene la nota exacta de `unfilteredCriteriaNote(domain)` para un
 * dominio, ese listado se marca explicitamente como no filtrado por el
 * criterio pedido -- nunca se presenta como si cumpliera un criterio de la
 * peticion que en realidad no se pudo reconocer. La comprobacion es una
 * coincidencia exacta de texto sobre un valor ya calculado
 * (`requestWasNarrowed`, dentro de Knowledge Assets), no una heuristica
 * sobre el numero de resultados.
 *
 * SCENAIA-003 (Nucleo Factual Honesto, expediente aprobado 2026-08-27):
 * la salida deja de ser una plantilla telegrafica y pasa a redactarse en
 * lenguaje natural, sin jerga interna, cubriendo tres situaciones:
 *   - Caso 1: hay etiquetas para el dominio -> se enumeran con su recuento.
 *   - Caso 2: el dominio esta cubierto pero no hay ninguna etiqueta -> se
 *     declara la ausencia de forma afirmativa, nunca devolviendo `null`
 *     ni texto vacio.
 *   - Caso 3: el criterio pedido no se reconocio -> se advierte antes de
 *     los resultados, sin presentarlos como coincidencias.
 * `null` se conserva unicamente como guarda defensiva para un
 * `KnowledgeContext` sin ningun dominio cubierto -- estado inalcanzable en
 * la rama determinista (requiere `knowledgeCompleteness === 'completo'`),
 * conservado por contrato (A3 del expediente). La firma publica no cambia.
 */

/** Nombre del dominio tal como se muestra al usuario -- nunca un identificador interno. */
function nombreDominio(domain: string): string {
  return domain.toLowerCase()
}

/** Enumeracion en lenguaje natural: "A", "A y B", "A, B y C". */
function enumerar(etiquetas: readonly string[]): string {
  if (etiquetas.length === 1) return etiquetas[0]
  return `${etiquetas.slice(0, -1).join(', ')} y ${etiquetas[etiquetas.length - 1]}`
}

/** Recuento concordado: "un resultado" / "N resultados". */
function recuento(total: number): string {
  return total === 1 ? 'un resultado' : `${total} resultados`
}

export function buildDirectContent(knowledgeContext: KnowledgeContext): string | null {
  const { knowledgeDomains, knowledgeSummary, knowledgeLimitations } = knowledgeContext

  if (knowledgeDomains.length === 0) return null

  const frases = knowledgeDomains.map((domain) => {
    const posiblesEtiquetas = knowledgeSummary.entryLabelsByDomain[domain] ?? []
    const etiquetas = Array.isArray(posiblesEtiquetas) ? posiblesEtiquetas : []
    const criterioNoAplicado = knowledgeLimitations.includes(unfilteredCriteriaNote(domain))
    const donde = `En ${nombreDominio(domain)}`

    if (etiquetas.length === 0) {
      return criterioNoAplicado
        ? `${donde} no he podido aplicar el criterio que pedías, y tampoco he encontrado ningún resultado.`
        : `${donde} no he encontrado ningún resultado.`
    }

    const hallazgo = `he encontrado ${recuento(etiquetas.length)}: ${enumerar(etiquetas)}.`

    return criterioNoAplicado
      ? `${donde} no he podido aplicar el criterio que pedías; aun así, ${hallazgo}`
      : `${donde} ${hallazgo}`
  })

  return frases.join(' ')
}
