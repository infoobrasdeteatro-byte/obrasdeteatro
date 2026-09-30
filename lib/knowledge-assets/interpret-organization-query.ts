import { COUNTRIES } from '@/lib/geo/countries'
import type { OrganizationLocations, OrganizationSearchCriteria } from '@/lib/repository-layer'
import { VOCABULARIO_EPOCA, VOCABULARIO_GENERO } from './interpret-work-query'

/**
 * Motor de interpretacion del dominio Organizaciones, conforme al patron
 * oficial ADR SCENAIA-002C.1: interpretacion por reglas declarativas sobre
 * el modelo relacional existente, nunca mediante IA, nunca mediante
 * coincidencia semantica.
 *
 * ALCANCE ACOTADO AL DATO REAL. Los cuatro criterios corresponden a
 * columnas reales de `institutions`: `type`, `country_code`, `region` y
 * `ciudad`. La ubicacion se reconoce EXCLUSIVAMENTE contra las localidades
 * que el catalogo contiene de verdad -- mismo patron que `detectAuthor()`
 * en el dominio Obras, que solo reconoce autores publicados. Un lugar
 * ausente del catalogo no se reconoce como criterio: `hasUnresolvedLocation`
 * lo declara pendiente y el flujo advierte al usuario, en vez de presentar
 * un listado ajeno como coincidencia.
 */

/**
 * Vocabulario de dominio -> valor canonico de la columna `type`. Los valores
 * de la derecha son EXACTAMENTE los admitidos por
 * `institutions_type_check`; ninguno se inventa. `company` y `theater` los
 * incorporo la migracion 20260828120000, que amplio el CHECK de forma
 * compatible sin reasignar ninguna fila existente.
 */
const ORGANIZATION_TYPE_TERMS: Readonly<Record<string, readonly string[]>> = {
  company: ['compania', 'companias', 'grupo teatral', 'grupos teatrales'],
  theater: ['teatro', 'teatros', 'sala', 'salas'],
  festival: ['festival', 'festivales'],
  editorial: ['editorial', 'editoriales'],
  university: ['universidad', 'universidades'],
  foundation: ['fundacion', 'fundaciones'],
  platform: ['plataforma', 'plataformas'],
  cultural_org: ['organizacion cultural', 'asociacion cultural', 'entidad cultural'],
}

const DIACRITICS = /\p{Diacritic}/gu

function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '')
}

/** Coincidencia por palabra completa: evita que "festival" case dentro de otra palabra. */
function containsTerm(normalizedQuery: string, term: string): boolean {
  return new RegExp(`\\b${term}\\b`).test(normalizedQuery)
}

/** Posicion de la primera aparicion del termino como palabra completa, o -1. */
function termPosition(normalizedQuery: string, term: string): number {
  return normalizedQuery.search(new RegExp(`\\b${term}\\b`))
}

/**
 * Cuando concurren varios tipos ("editoriales de teatro", "companias de
 * teatro") gana el que aparece ANTES en la peticion: es el nucleo del
 * sintagma, y lo que le sigue tras una preposicion lo complementa. Misma
 * regla de nucleo que aplica Request Interpreter a los dominios -- no una
 * lista de parejas concretas.
 */
function detectType(normalizedQuery: string): string | undefined {
  let elegido: string | undefined
  let mejorPosicion = Number.POSITIVE_INFINITY

  for (const canonical of Object.keys(ORGANIZATION_TYPE_TERMS)) {
    for (const term of ORGANIZATION_TYPE_TERMS[canonical]) {
      const posicion = termPosition(normalizedQuery, term)
      if (posicion !== -1 && posicion < mejorPosicion) {
        mejorPosicion = posicion
        elegido = canonical
      }
    }
  }

  return elegido
}

/**
 * Reconoce el pais por su nombre real del catalogo geografico ya existente
 * del proyecto (`lib/geo/countries.ts`), nunca por su codigo de dos letras:
 * "es", "ar" o "mx" son palabras corrientes del castellano y produciran
 * falsos positivos constantes.
 */
function detectCountryCode(normalizedQuery: string): string | undefined {
  return COUNTRIES.find((country) => containsTerm(normalizedQuery, stripDiacritics(country.name.toLowerCase())))?.code
}

/**
 * Reconoce region y ciudad contra las localidades realmente presentes en el
 * catalogo. No hay diccionario geografico: si ninguna organizacion esta en
 * Madrid, "madrid" no es un criterio reconocible y el flujo lo declarara.
 * La comparacion se hace sobre el nombre normalizado y por palabra completa,
 * de modo que "las palmas" no case dentro de otra expresion.
 */
function detectLocation(normalizedQuery: string, known: readonly string[]): string | undefined {
  return known.find((place) => containsTerm(normalizedQuery, stripDiacritics(place.toLowerCase())))
}

/**
 * Unico punto de entrada. Funcion pura, sincrona y determinista: no accede
 * a persistencia, no invoca IA, no consulta red. Un criterio ausente
 * significa "sin filtrar por ese atributo" -- nunca un valor por defecto.
 */
export function interpretOrganizationQuery(
  normalizedQuery: string,
  knownLocations: OrganizationLocations = { regions: [], cities: [] }
): OrganizationSearchCriteria {
  const criteria: { -readonly [K in keyof OrganizationSearchCriteria]?: OrganizationSearchCriteria[K] } = {}

  const type = detectType(normalizedQuery)
  if (type !== undefined) criteria.type = type

  const countryCode = detectCountryCode(normalizedQuery)
  if (countryCode !== undefined) criteria.countryCode = countryCode

  const region = detectLocation(normalizedQuery, knownLocations.regions)
  if (region !== undefined) criteria.region = region

  const city = detectLocation(normalizedQuery, knownLocations.cities)
  if (city !== undefined) criteria.city = city

  return criteria
}

/**
 * Complementos locativos que el castellano introduce con "en": "en Madrid",
 * "en Canarias", "en Argentina". Es la unica construccion que este motor
 * reconoce como peticion de ubicacion -- deliberadamente estrecha, para no
 * clasificar como geografico lo que no lo es.
 */
const LOCATIVE_PREPOSITION = /\ben\s+([a-z0-9]+(?:\s+[a-z0-9]+)?)/

/**
 * Palabras que siguen a "en" sin designar un lugar. Ninguna es una
 * localidad; su presencia significa que el usuario no pidio ubicacion.
 */
const NON_PLACE_COMPLEMENTS = new Set([
  'total',
  'general',
  'concreto',
  'particular',
  'activo',
  'cartel',
  'gira',
  'marcha',
  'este',
  'esta',
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
])

/**
 * Declara si el usuario pidio una ubicacion que NO se ha podido resolver.
 *
 * Es cierto cuando la peticion contiene un complemento locativo y, aun asi,
 * la interpretacion no produjo ni pais, ni region, ni ciudad: o el lugar no
 * existe en el catalogo, o el modelo no puede representarlo. Distinguir
 * este caso de "el usuario no pidio ubicacion" es lo que impide dos errores
 * simetricos: presentar un listado parcial como si estuviera completamente
 * filtrado, y advertir de un criterio que nadie pidio.
 *
 * No conoce ningun toponimo: solo comprueba si lo que sigue a la
 * preposicion quedo o no resuelto por los criterios ya calculados.
 */
export function hasUnresolvedLocation(normalizedQuery: string, criteria: OrganizationSearchCriteria): boolean {
  if (criteria.countryCode !== undefined || criteria.region !== undefined || criteria.city !== undefined) {
    return false
  }

  const match = normalizedQuery.match(LOCATIVE_PREPOSITION)
  if (match === null) return false

  const complemento = match[1].trim()
  const primeraPalabra = complemento.split(/\s+/)[0]

  if (NON_PLACE_COMPLEMENTS.has(primeraPalabra)) return false

  // Si lo que sigue a "en" es vocabulario de tipo ("en teatro"), el usuario
  // esta describiendo el ambito, no una localidad.
  const esVocabularioDeTipo = Object.values(ORGANIZATION_TYPE_TERMS).some((terms) =>
    terms.some((term) => containsTerm(complemento, term))
  )

  return !esVocabularioDeTipo
}

/** Criterios de obra que Organizaciones reconoce en la consulta pero no sabe aplicar. */
export type CriterioDeObraNoAplicable = 'genero' | 'epoca'

/**
 * SCENAIA-008 §4.1 -- declara que criterios de OBRA menciona la consulta:
 * `'genero'` si nombra un genero y `'epoca'` si nombra una epoca. `institutions`
 * no tiene columnas para ninguno de los dos, asi que Organizaciones no puede
 * filtrar por ellos; declararlos evita presentar el dominio entero como si
 * coincidiera con lo pedido ("teatro barroco" no son todos los teatros).
 *
 * El vocabulario es el del interprete de obras (§4.2), leido de alli y nunca
 * copiado, y cuenta siempre, con el interruptor de epoca encendido o apagado
 * (§4.3). La comparacion es por palabra completa: "actual" no se reconoce
 * dentro de "actualmente".
 */
export function unappliedWorkCriteria(normalizedQuery: string): CriterioDeObraNoAplicable[] {
  const declarados: CriterioDeObraNoAplicable[] = []

  if (VOCABULARIO_GENERO.some((term) => containsTerm(normalizedQuery, term))) declarados.push('genero')
  if (VOCABULARIO_EPOCA.some((term) => containsTerm(normalizedQuery, term))) declarados.push('epoca')

  return declarados
}
