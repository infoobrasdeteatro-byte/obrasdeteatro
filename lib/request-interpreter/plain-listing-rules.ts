/**
 * SCENAIA-004 §4.1, condiciones (a) y (b) -- las dos que se deciden con el
 * texto. Las otras tres (criterios aplicados, dominio Obras, al menos un
 * resultado) dependen del conocimiento ya recuperado y no se deciden aqui:
 * Request Interpreter no ve el conocimiento.
 *
 * Las dos listas son CERRADAS. Lo que no aparece en ellas no activa nada, y
 * cualquier palabra de razonamiento lo desactiva todo: ante la duda, IA.
 */

/**
 * (a) Expresiones que piden un listado. Un verbo suelto como "dame" NO
 * basta: "dame algo divertido" pide una sugerencia, no una lista. Por eso
 * los verbos solo cuentan acompanados de aquello que se pide listar.
 */
const LISTING_EXPRESSIONS = [
  /\blistados?\b/,
  /\blista(me|nos)?\b/,
  /\blistar\b/,
  /\benumera(me|nos)?\b/,
  /\bcatalogo\b/,
  /\btodas las (obras|piezas)\b/,
  /\btodo el (catalogo|repertorio)\b/,
  /\bcuantas (obras|piezas)\b/,
  /\bque (obras|piezas) (tienes|teneis|tenemos|hay|existen)\b/,
  /\b(dame|danos|muestrame|muestranos|ensename|ensenanos|quiero ver|quiero la|ver)\s+(el|la|las|los|un|una)?\s*(lista|listado|catalogo|obras|piezas|todas|todos)\b/,
]

/**
 * (b) Palabras que piden razonar. Cualquiera de ellas devuelve el turno a
 * la IA, aunque la peticion parezca un listado: quien pide que se elija,
 * se compare o se resuma no esta pidiendo una lista.
 *
 * Los comparativos entran por regla ("mas corta", "menos actores"): pedir
 * un extremo es pedir un criterio que el listado no resuelve.
 */
const REASONING_EXPRESSIONS = [
  /\brecomienda(me|nos)?\b/,
  /\brecomiendas\b/,
  /\brecomendarias\b/,
  /\brecomendacion(es)?\b/,
  /\bsugiere(me|nos)?\b/,
  /\bsugieres\b/,
  /\bsugerencia(s)?\b/,
  /\baconseja(me|nos|s)?\b/,
  /\belige\b|\belegir\b|\bescoge\b|\bescoger\b/,
  /\bcual(es)?\b/,
  /\bcompar[ae]\w*/,
  /\bdiferencia(s)?\b/,
  /\bresume(me|n)?\b|\bresumir\b|\bsinopsis\b|\bargumento\b/,
  /\bexplica(me|r)?\b|\bexplicacion\b/,
  /\bpor que\b|\bporque\b/,
  /\bmejor(es)?\b|\bpeor(es)?\b/,
  /\b(mas|menos)\s+[a-z]+/,
  /\bopina(s)?\b|\bopinion\b|\bcrees\b|\bpiensas\b|\bparecida(s)?\b|\bsimilar(es)?\b/,
  /\badecuada(s)?\b|\bapropiada(s)?\b|\bidonea(s)?\b|\bencaja\b|\bsirve\b/,
]

/**
 * La peticion pide una lista y nada mas que una lista.
 *
 * Solo resuelve las condiciones (a) y (b) del §4.1: quien decida si el
 * turno se resuelve sin IA debe comprobar ademas las tres restantes.
 */
export function detectPlainListingRequest(normalizedText: string): boolean {
  if (REASONING_EXPRESSIONS.some((patron) => patron.test(normalizedText))) return false

  return LISTING_EXPRESSIONS.some((patron) => patron.test(normalizedText))
}
