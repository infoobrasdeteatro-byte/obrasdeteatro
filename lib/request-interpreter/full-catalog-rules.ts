/**
 * Expresiones con las que el usuario pide el catalogo completo, sin los
 * filtros de turnos anteriores. Lista CERRADA: lo que no aparece aqui no
 * activa la regla. Se comparan ya normalizadas (sin diacriticos, ver
 * normalize-text.ts).
 */
const FULL_CATALOG_EXPRESSIONS = [
  /\btodas las obras\b/,
  /\btodas las piezas\b/,
  /\btodo el catalogo\b/,
  /\btoda la biblioteca\b/,
  /\btodo el repertorio\b/,
  /\bel catalogo completo\b/,
  /\bcualquier obra\b/,
  /\bcualquier pieza\b/,
  /\bsin filtros\b/,
  /\bsin criterios\b/,
]

/**
 * Palabras que pueden acompanar a la expresion sin anadir ningun criterio:
 * las de la propia peticion ("dame una lista de...", "¿que obras tienes?").
 * Tambien es una lista cerrada. Cualquier otra palabra -- "cortas",
 * "comedias", "de Lorca", "para tres" -- puede ser un criterio propio, y
 * ante la duda la regla no actua.
 */
const REQUEST_WORDS = new Set([
  'y',
  'e',
  'o',
  'a',
  'de',
  'del',
  'el',
  'la',
  'los',
  'las',
  'lo',
  'un',
  'una',
  'me',
  'nos',
  'que',
  'cuales',
  'dame',
  'danos',
  'lista',
  'listado',
  'listar',
  'muestrame',
  'muestranos',
  'mostrar',
  'ensename',
  'ensenanos',
  'ver',
  'quiero',
  'querria',
  'puedes',
  'podrias',
  'por',
  'favor',
  'tienes',
  'teneis',
  'hay',
  'obra',
  'obras',
  'pieza',
  'piezas',
  'catalogo',
  'completo',
  'entero',
  'todas',
  'todos',
  'todo',
  'toda',
])

/**
 * El usuario pide el catalogo completo: la peticion contiene una de las
 * expresiones de la lista y, fuera de ella, ninguna palabra que pueda ser
 * un criterio propio. "Todas las obras cortas" no la activa.
 */
export function detectFullCatalogRequest(normalizedText: string): boolean {
  const expression = FULL_CATALOG_EXPRESSIONS.find((pattern) => pattern.test(normalizedText))
  if (expression === undefined) return false

  const remainingWords = normalizedText
    .replace(expression, ' ')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0)

  return remainingWords.every((word) => REQUEST_WORDS.has(word))
}
