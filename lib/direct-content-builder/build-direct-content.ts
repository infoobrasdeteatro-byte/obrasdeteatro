import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { unfilteredCriteriaNote } from '@/lib/scenaia-knowledge-model'
import { languageName } from '@/lib/geo/languages'

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

/**
 * SCENAIA-004 §4.3 -- la ficha de una obra.
 *
 * Todos los datos salen de `knowledgeEntities`, que ya viaja en el
 * KnowledgeContext que este componente recibe: no se recupera nada nuevo,
 * no se consulta ninguna fuente y no se escribe ningun dato que el
 * catalogo no traiga. Un campo ausente simplemente no se menciona -- jamas
 * se rellena con un valor convenido.
 *
 * Amplia el Caso 1 de SCENAIA-003, que se limitaba a las etiquetas de
 * `entryLabelsByDomain`, por autorizacion expresa del Acta firmada el
 * 2026-09-22. El resto de dominios conserva exactamente aquel formato.
 */
function ficha(obra: DatosDeObra): string {
  const atributos: string[] = []

  if (obra.author) atributos.push(obra.author)
  if (obra.genre) atributos.push(obra.genre)
  if (obra.year !== null && obra.year !== undefined) atributos.push(String(obra.year))
  if (obra.durationMinutes !== null && obra.durationMinutes !== undefined) {
    atributos.push(`${obra.durationMinutes} min`)
  }
  if (obra.castSizeMax !== null && obra.castSizeMax !== undefined) {
    atributos.push(`reparto de hasta ${obra.castSizeMax}`)
  }
  if (obra.minAge !== null && obra.minAge !== undefined) atributos.push(`a partir de ${obra.minAge} años`)
  if (obra.language) atributos.push(languageName(obra.language))

  return atributos.length > 0 ? `- ${obra.title} — ${atributos.join(' · ')}` : `- ${obra.title}`
}

/** Campos de una obra que la ficha puede mostrar. Todos opcionales en origen. */
interface DatosDeObra {
  readonly title: string
  readonly author?: string | null
  readonly genre?: string | null
  readonly year?: number | null
  readonly durationMinutes?: number | null
  readonly castSizeMax?: number | null
  readonly minAge?: number | null
  readonly language?: string | null
}

/** Obras realmente recuperadas en este turno, en el orden en que llegaron. */
function obrasDe(knowledgeContext: KnowledgeContext): DatosDeObra[] {
  return knowledgeContext.knowledgeEntities
    .filter((item) => item.domain === 'Obras')
    .map((item) => item.data as DatosDeObra)
    .filter((obra) => typeof obra?.title === 'string' && obra.title !== '')
}

export function buildDirectContent(knowledgeContext: KnowledgeContext): string | null {
  const { knowledgeDomains, knowledgeSummary, knowledgeLimitations } = knowledgeContext

  if (knowledgeDomains.length === 0) return null

  const obras = obrasDe(knowledgeContext)
  let hayFichas = false

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

    // SCENAIA-004: en Obras, y solo cuando el turno trae las obras reales,
    // cada resultado se presenta con su ficha en vez de con su titulo
    // suelto. El resto de dominios conserva el formato de SCENAIA-003.
    if (domain === 'Obras' && obras.length > 0) {
      hayFichas = true
      const listado = `he encontrado ${recuento(obras.length)}:\n${obras.map(ficha).join('\n')}`

      return criterioNoAplicado
        ? `${donde} no he podido aplicar el criterio que pedías; aun así, ${listado}`
        : `${donde} ${listado}`
    }

    const hallazgo = `he encontrado ${recuento(etiquetas.length)}: ${enumerar(etiquetas)}.`

    return criterioNoAplicado
      ? `${donde} no he podido aplicar el criterio que pedías; aun así, ${hallazgo}`
      : `${donde} ${hallazgo}`
  })

  // Con fichas, cada dominio ocupa su propio bloque: pegarlos con un
  // espacio dejaria la frase del siguiente dominio colgando de la ultima
  // ficha. Sin fichas, el formato es exactamente el de siempre.
  return frases.join(hayFichas ? '\n\n' : ' ')
}
