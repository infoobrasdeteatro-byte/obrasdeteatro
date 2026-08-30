/**
 * Acto de habla de la peticion (A3.1-alfa).
 *
 * Una palabra del vocabulario no significa que el usuario pida entidades del
 * catalogo. "¿Que es el teatro del absurdo?" contiene "teatro" y activaba
 * Organizaciones: al proveedor le llegaba una sala real del ecosistema como
 * conocimiento pertinente para una pregunta conceptual, y el contexto se
 * marcaba ademas como completo.
 *
 * Lo que separa ese caso de "¿que teatros hay en Madrid?" no es el lexico --
 * ambos dicen "teatro" -- sino QUE SE ESTA HACIENDO con la frase: preguntar
 * por el significado de un termino no es pedir ejemplares de el.
 *
 * Este modulo reconoce esa diferencia por estructura, nunca por tema: no
 * conoce "absurdo", ni ningun concepto teatral, ni lista frase alguna. Solo
 * distingue dos construcciones del castellano.
 *
 * Alcance deliberadamente estrecho: decide si la peticion es definicional, y
 * nada mas. No elige dominio, no ordena dominios, no toca la regla de
 * nucleo/complemento ni el vocabulario.
 */

/**
 * Formulas con las que el castellano pregunta por el SIGNIFICADO de un
 * termino. Son construcciones gramaticales, no temas: cualquier sustantivo
 * puede ocupar el hueco, incluido uno que no exista.
 */
const DEFINITIONAL_PATTERNS: readonly RegExp[] = [
  /\bque\s+(?:es|son)\b/,
  /\bque\s+significan?\b/,
  /\bque\s+quieren?\s+decir\b/,
  /\bdefinicion(?:es)?\s+de\b/,
  /\ba\s+que\s+se\s+(?:llama|denomina)\b/,
]

/**
 * Verbos con los que se pide que el ecosistema APORTE algo: existencia,
 * posesion, disponibilidad o busqueda. Su presencia revela que la peticion
 * espera entidades, aunque adopte forma de pregunta definicional --
 * "¿que es lo que tienes de Lorca?" pide obras, no una definicion.
 *
 * Lista cerrada y gramatical, no teatral: ni una sola palabra del dominio.
 * Cubre las variantes de las principales areas hispanohablantes ("tenes",
 * "teneis") porque son la misma forma verbal, no vocabulario nuevo.
 */
const CATALOG_VERBS =
  /\b(?:hay|tienes|tiene|tienen|teneis|tenes|tengo|tendras|dispones|existe|existen|busco|buscas|buscamos|quiero|queremos|necesito|necesitamos|conoces|conoceis|recomiendas|muestrame|ensename|dame)\b/

/**
 * Declara si la peticion pregunta por el significado de algo en vez de pedir
 * entidades del catalogo.
 *
 * Funcion pura y determinista sobre el texto ya normalizado (minusculas, sin
 * diacriticos). Ante duda decide que NO es definicional: preferimos recuperar
 * de mas -- comportamiento de siempre -- a callar una peticion legitima de
 * catalogo.
 */
export function isDefinitionalRequest(normalizedText: string): boolean {
  if (!DEFINITIONAL_PATTERNS.some((pattern) => pattern.test(normalizedText))) return false

  return !CATALOG_VERBS.test(normalizedText)
}
