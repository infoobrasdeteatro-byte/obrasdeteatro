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
 * SCENAIA-004C §4.1 -- "peticion de solo criterio de genero": quien escribe
 * un unico genero y nada mas ("comedias", "dame comedias", "las comedias")
 * no admite otra lectura razonable que la de un listado.
 *
 * Vocabulario PROPIO y CERRADO del Request Interpreter: este componente solo
 * puede importar de Knowledge Assets el tipo KnowledgeDomain, asi que no
 * puede leer el del interprete de obras. Una prueba de sincronia en los dos
 * sentidos lo mantiene alineado con el (§7.1 de la Adenda). Ampliar
 * cualquiera de las tres listas exige una adenda nueva.
 */
export const SOLO_GENERO_VERBOS: readonly string[] = ['dame', 'quiero', 'busco', 'tienes', 'hay', 'muestrame', 'ensename']
export const SOLO_GENERO_ARTICULOS: readonly string[] = ['las', 'los', 'unas', 'unos', 'algunas', 'algunos']
export const SOLO_GENERO_TERMINOS: readonly string[] = [
  'comedia', 'comedias', 'musical', 'musicales', 'clasico', 'clasica', 'clasicos', 'clasicas',
]

/**
 * Signos que, dentro de esta forma, separan palabras. La Adenda define la
 * forma "sin signos", y normalizeText() los conserva: "comedias?" y
 * "¿comedias?" deben cumplirla igual que "comedias". Solo se aplica aqui;
 * normalizeText() no cambia.
 */
const SIGNOS = /[¿?¡!.,;:]/g

/**
 * El texto ENTERO es: verbo de peticion opcional + articulo opcional +
 * exactamente un termino de genero, y nada mas. Cualquier otra palabra, o
 * un segundo termino, desactiva la forma. Las palabras de razonar la vetan
 * antes (condicion (b) del §4.1 de SCENAIA-004).
 */
export function detectSoloGeneroRequest(normalizedText: string): boolean {
  if (REASONING_EXPRESSIONS.some((patron) => patron.test(normalizedText))) return false

  const palabras = normalizedText.replace(SIGNOS, ' ').split(' ').filter((palabra) => palabra.length > 0)
  let i = 0
  if (SOLO_GENERO_VERBOS.includes(palabras[i])) i++
  if (SOLO_GENERO_ARTICULOS.includes(palabras[i])) i++

  return palabras.length === i + 1 && SOLO_GENERO_TERMINOS.includes(palabras[i])
}

/**
 * La peticion pide una lista y nada mas que una lista.
 *
 * Solo resuelve las condiciones (a) y (b) del §4.1: quien decida si el
 * turno se resuelve sin IA debe comprobar ademas las tres restantes.
 * SCENAIA-004C amplia la (a) con la peticion de solo criterio de genero.
 */
export function detectPlainListingRequest(normalizedText: string): boolean {
  if (REASONING_EXPRESSIONS.some((patron) => patron.test(normalizedText))) return false

  return LISTING_EXPRESSIONS.some((patron) => patron.test(normalizedText)) || detectSoloGeneroRequest(normalizedText)
}
