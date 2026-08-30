import type { WorkSearchCriteria } from '@/lib/repository-layer'

/**
 * Conceptos canonicos ya reconocidos en el texto -- salida exclusiva de
 * domainVocabulary(), entrada exclusiva de interpretRules(). Es la
 * frontera explicita entre "reconocer vocabulario" y "decidir un
 * criterio" (revision tecnica final, SCENAIA-002C).
 */
interface CanonicalConcepts {
  readonly terms: readonly string[]
  readonly author?: string
  readonly explicitCastSize?: number
}

/**
 * Domain Vocabulary del dominio Obras (ADR SCENAIA-002C.1, responsabilidad
 * logica -- integrada en este archivo, no constituye modulo propio hasta
 * que un segundo dominio demuestre reutilizacion real). Traduce variantes
 * lexicas a conceptos canonicos del dominio -- nunca interpreta intencion,
 * nunca construye criterios, nunca accede a datos.
 */
const CANONICAL_TERMS: Readonly<Record<string, readonly string[]>> = {
  COMEDIA: ['comedia', 'comedias', 'humoristica', 'humoristicas', 'divertida', 'divertidas'],
  MUSICAL: ['musical', 'musicales'],
  INFANTIL: ['infantil', 'infantiles', 'ninos', 'para ninos'],
  CLASICO: ['clasico', 'clasica', 'clasicos', 'clasicas'],
  CONTEMPORANEO: ['contemporanea', 'contemporaneo', 'contemporaneas', 'contemporaneos', 'actual', 'moderna'],
  CORTA: ['corta', 'cortas', 'breve', 'breves'],
  LARGA: ['larga', 'largas'],
  POCOS_ACTORES: ['pocos actores', 'reparto reducido', 'pocos personajes'],
}

function detectCanonicalTerms(normalizedQuery: string): string[] {
  return Object.keys(CANONICAL_TERMS).filter((canonical) =>
    CANONICAL_TERMS[canonical].some((synonym) => normalizedQuery.includes(synonym))
  )
}

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
}

/** "obras para dos actores" / "obras para 2 actores" -- numero explicito, distinto de POCOS_ACTORES (umbral generico). */
function detectExplicitCastSize(normalizedQuery: string): number | undefined {
  const match = normalizedQuery.match(/para\s+(\d+|uno|dos|tres|cuatro|cinco|seis)\s+actor/)
  if (!match) return undefined

  const raw = match[1]
  return /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw]
}

const DIACRITICS = /\p{Diacritic}/gu

/**
 * Elimina diacriticos de una palabra individual -- misma operacion mecanica
 * que aplica normalizeText() en el modulo de interpretacion de peticiones
 * sobre la consulta completa, duplicada aqui de forma local y minima
 * porque este archivo no puede importar nada de ese componente del Nucleo
 * (invariante ya verificada en contract-invariants.test.ts).
 * normalizedQuery ya llega sin diacriticos por contrato; knownAuthors llega
 * tal cual esta en el catalogo real, con sus diacriticos originales -- sin
 * este paso, ambos lados de la comparacion usan alfabetos distintos y
 * nunca coinciden (microexpediente correctivo, SCENAIA-002C).
 */
function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '')
}

/**
 * Reconoce una referencia a un autor conocido dentro del texto -- nunca
 * inventa un autor que no exista ya en el catalogo real (knownAuthors se
 * recibe ya resuelto por quien orquesta; esta funcion no accede a datos).
 * Compara por palabra significativa (longitud > 3) para reconocer
 * apellidos sueltos ("Lorca") dentro de un nombre completo ("Federico
 * Garcia Lorca"), sin exigir coincidencia del nombre completo. El valor
 * devuelto es siempre el nombre original de knownAuthors, sin normalizar
 * -- stripDiacritics() solo se usa para comparar, nunca para el resultado.
 */
/**
 * Palabras que aparecen en nombres de autor pero NO identifican a nadie:
 * son vocabulario generico del dominio teatral. Sin esta guarda, una
 * peticion como "una obra para una compania con pocos actores" casaba con
 * el autor "Compania La Bicicleta" por la sola presencia de "compania", y
 * ScenaIA presentaba su obra como si el usuario la hubiera pedido.
 *
 * La regla es general, no una lista de excepciones por autor: una palabra
 * del vocabulario del dominio nunca basta, por si sola, para identificar a
 * un autor. El nombre propio que si lo distingue sigue funcionando.
 */
const NON_IDENTIFYING_WORDS = new Set([
  'compania',
  'companias',
  'teatro',
  'teatros',
  'grupo',
  'grupos',
  'festival',
  'sala',
  'salas',
  'obra',
  'obras',
  'ediciones',
  'editorial',
  'universidad',
  'fundacion',
  'plataforma',
  'produccion',
  'producciones',
])

function detectAuthor(normalizedQuery: string, knownAuthors: readonly string[]): string | undefined {
  return knownAuthors.find((author) =>
    stripDiacritics(author.toLowerCase())
      .split(' ')
      .some(
        (word) => word.length > 3 && !NON_IDENTIFYING_WORDS.has(word) && normalizedQuery.includes(word)
      )
  )
}

/**
 * Domain Vocabulary -- fase 2 del flujo (fase 1, normalizacion mecanica,
 * ya se completo antes de llegar aqui: normalizedQuery es siempre la
 * salida de normalizeText() en Request Interpreter, nunca se repite en
 * este archivo). Unico punto que traduce texto a conceptos canonicos --
 * terminos, autor, numero explicito de reparto. Nunca decide que campo
 * de WorkSearchCriteria corresponde a cada concepto; esa es la
 * responsabilidad exclusiva de interpretRules().
 */
function domainVocabulary(normalizedQuery: string, knownAuthors: readonly string[]): CanonicalConcepts {
  return {
    terms: detectCanonicalTerms(normalizedQuery),
    author: detectAuthor(normalizedQuery, knownAuthors),
    explicitCastSize: detectExplicitCastSize(normalizedQuery),
  }
}

// Umbrales de politica (SCENAIA-002C): decisiones explicitas y documentadas,
// no valores magicos ocultos -- abiertas a revision por Direccion.
const INFANTIL_MAX_AGE = 8
const CORTA_MAX_MINUTES = 60
const LARGA_MIN_MINUTES = 90
const CONTEMPORANEO_YEAR_FROM = 1950
const POCOS_ACTORES_MAX = 4

/**
 * Interpretacion por reglas -- fase 3 del flujo (ADR SCENAIA-002C.1):
 * unico punto donde los conceptos canonicos ya reconocidos por
 * domainVocabulary() se traducen a un WorkSearchCriteria estructurado.
 * Nunca reconoce vocabulario por si misma (recibe los conceptos ya
 * resueltos), nunca accede a datos.
 *
 * Contrato de combinacion (revision tecnica final, SCENAIA-002C):
 *   - Criterios que escriben campos DISTINTOS siempre se acumulan --
 *     "comedias cortas" produce {genre, maxDurationMinutes} a la vez,
 *     nunca se descarta uno a favor del otro.
 *   - Criterios que escribirian el MISMO campo (p.ej. una consulta que
 *     coincidiera a la vez con COMEDIA y MUSICAL) no tienen ninguna
 *     prioridad de negocio definida -- prevalece el ultimo evaluado
 *     segun el orden de este cuerpo de funcion, que es un detalle de
 *     implementacion, nunca una decision de producto. Si esto llega a
 *     importar en la practica, requiere una decision explicita de
 *     Direccion, igual que la ya tomada para "clasicos".
 *   - Un concepto sin ninguna regla aplicable no anade ningun campo --
 *     degradacion silenciosa a "sin filtro para ese concepto", nunca un
 *     valor inventado (taxonomia de degradacion, ADR SCENAIA-002C.1).
 *
 * Ambiguedad "clasicos" (genero vs. epoca, senalada en el ADR): resuelta
 * hacia genero -- coincide textualmente con el valor real "Teatro
 * clasico" ya existente en el catalogo. Decision explicita y documentada,
 * no una eleccion arbitraria en tiempo de ejecucion; pendiente de
 * confirmacion de Direccion si se prefiere la interpretacion por epoca.
 */
function interpretRules(concepts: CanonicalConcepts): WorkSearchCriteria {
  const criteria: { -readonly [K in keyof WorkSearchCriteria]?: WorkSearchCriteria[K] } = {}

  if (concepts.author !== undefined) criteria.author = concepts.author

  if (concepts.terms.includes('COMEDIA')) criteria.genre = 'comedia'
  if (concepts.terms.includes('MUSICAL')) criteria.genre = 'musical'
  if (concepts.terms.includes('CLASICO')) criteria.genre = 'clasico'

  if (concepts.terms.includes('INFANTIL')) criteria.maxAge = INFANTIL_MAX_AGE
  if (concepts.terms.includes('CORTA')) criteria.maxDurationMinutes = CORTA_MAX_MINUTES
  if (concepts.terms.includes('LARGA')) criteria.minDurationMinutes = LARGA_MIN_MINUTES
  if (concepts.terms.includes('CONTEMPORANEO')) criteria.yearFrom = CONTEMPORANEO_YEAR_FROM
  if (concepts.terms.includes('POCOS_ACTORES')) criteria.maxCastSize = POCOS_ACTORES_MAX

  if (concepts.explicitCastSize !== undefined) criteria.maxCastSize = concepts.explicitCastSize

  return criteria
}

/**
 * Unico punto de entrada publico (SCENAIA-002C). Funcion pura y
 * determinista: misma entrada, misma salida, siempre; sin I/O, sin
 * acceso a datos (knownAuthors se recibe ya resuelto).
 *
 * Flujo explicito de 3 fases (revision tecnica final):
 *   1. Normalizacion mecanica -- ya completada antes de esta llamada
 *      (normalizeText(), Request Interpreter). No se repite aqui.
 *   2. domainVocabulary()  -- texto -> conceptos canonicos.
 *   3. interpretRules()    -- conceptos canonicos -> WorkSearchCriteria.
 */
export function interpretWorkQuery(normalizedQuery: string, knownAuthors: readonly string[] = []): WorkSearchCriteria {
  const concepts = domainVocabulary(normalizedQuery, knownAuthors)
  return interpretRules(concepts)
}

/**
 * Preposiciones con las que el castellano atribuye la autoria de una obra:
 * "obras DE Lorca", "escrita POR Valle-Inclan". Es la unica construccion
 * que este motor reconoce como peticion de autor -- deliberadamente
 * estrecha, para no clasificar como autor lo que no lo es.
 */
const AUTHORSHIP_PREPOSITION = /\b(?:de|del|por)\s+([a-z0-9]+(?:\s+[a-z0-9]+)?)/g

/**
 * Palabras que siguen a "de/por" sin nombrar a nadie. La lista es corta y
 * cerrada: recoge el vocabulario que el propio motor ya consume (generos,
 * duraciones, reparto) mas los cuantificadores mas frecuentes. Cualquier
 * palabra de aqui significa que el usuario NO estaba atribuyendo autoria.
 */
const NON_AUTHOR_COMPLEMENTS = new Set([
  'poca',
  'poco',
  'pocos',
  'pocas',
  'mucha',
  'mucho',
  'muchos',
  'muchas',
  'media',
  'medio',
  'gran',
  'larga',
  'largo',
  'corta',
  'corto',
  'duracion',
  'reparto',
  'elenco',
  'grupo',
  'compania',
  'teatro',
  'obra',
  'obras',
  'pieza',
  'piezas',
  'actores',
  'actrices',
  'interpretes',
  'personajes',
  'epoca',
  'estilo',
  'tipo',
  'clase',
  'calidad',
  'nivel',
  'esas',
  'esos',
  'esta',
  'este',
  'ellas',
  'ellos',
  'cualquier',
  'alguna',
  'algunas',
  'algun',
  'algunos',
  'otra',
  'otras',
  'otro',
  'otros',
  'nuevo',
  'nueva',
  'siempre',
  'ahora',
])

/**
 * Declara si el usuario atribuyo una obra a alguien y ese alguien NO se ha
 * podido resolver contra el catalogo real.
 *
 * Es el equivalente exacto, en el dominio Obras, de `hasUnresolvedLocation`
 * en Organizaciones: permite separar "no se pidio criterio de autor" de "se
 * pidio y no existe en el catalogo". Sin esta distincion, "obras de
 * Shakespeare" y "que obras tienes" producian la misma señal.
 *
 * No conoce ningun nombre propio: solo comprueba si lo que sigue a la
 * preposicion quedo o no resuelto, y descarta el vocabulario que el propio
 * motor ya consume.
 */
export function hasUnresolvedAuthor(normalizedQuery: string, criteria: WorkSearchCriteria): boolean {
  if (criteria.author !== undefined) return false

  for (const match of normalizedQuery.matchAll(AUTHORSHIP_PREPOSITION)) {
    const primeraPalabra = match[1].trim().split(/\s+/)[0]

    if (primeraPalabra.length <= 3) continue
    if (NON_AUTHOR_COMPLEMENTS.has(primeraPalabra)) continue
    if (detectCanonicalTerms(primeraPalabra).length > 0) continue

    return true
  }

  return false
}
