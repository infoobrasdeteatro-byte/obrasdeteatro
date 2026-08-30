import { COUNTRIES } from '@/lib/geo/countries'
import { normalizeLocationValue } from '@/lib/repository-layer'
import type { PersonLocations, PersonSearchCriteria } from '@/lib/repository-layer'

/**
 * Motor de interpretacion del dominio Personas, conforme al patron oficial
 * ADR SCENAIA-002C.1: interpretacion por reglas declarativas sobre el
 * modelo relacional existente, nunca mediante IA.
 *
 * Separa los tres ejes sin mezclarlos:
 *   DOMINIO   -> lo decide Request Interpreter (Personas)
 *   TIPO      -> `tipo_perfil`, columna enumerada real
 *   CONTEXTO  -> pais, region y ciudad, columnas reales
 *
 * TIPO no es FUNCION. "director" produce el criterio `profileType:
 * 'director'`; la funcion `direccion` la sigue derivando
 * `derivePersonFunctions()` desde ese mismo `tipo_perfil`. Ninguno de los
 * dos ejes se reconstruye a partir del otro.
 */

/**
 * Vocabulario de dominio -> valor canonico de `tipo_perfil`. Los valores de
 * la derecha son EXACTAMENTE los que la clasificacion reconoce como
 * persona; ninguno se inventa. Los terminos de la izquierda son los mismos
 * que `DOMAIN_KEYWORDS.Personas` ya emplea para activar el dominio, mas sus
 * plurales y femeninos.
 */
const PROFILE_TYPE_TERMS: Readonly<Record<string, readonly string[]>> = {
  actor: ['actor', 'actores', 'actriz', 'actrices'],
  director: ['director', 'directores', 'directora', 'directoras'],
  dramaturgo: ['dramaturgo', 'dramaturgos', 'dramaturga', 'dramaturgas'],
  profesional: ['profesional', 'profesionales'],
}

/** Coincidencia por palabra completa: evita que "actor" case dentro de otra palabra. */
function containsTerm(normalizedQuery: string, term: string): boolean {
  return new RegExp(`\\b${term}\\b`).test(normalizedQuery)
}

/** Posicion de la primera aparicion del termino como palabra completa, o -1. */
function termPosition(normalizedQuery: string, term: string): number {
  return normalizedQuery.search(new RegExp(`\\b${term}\\b`))
}

/**
 * Cuando concurren varios tipos gana el que aparece ANTES en la peticion:
 * es el nucleo del sintagma. Misma regla de nucleo que ya aplican Request
 * Interpreter y el motor de Organizaciones -- no una lista de parejas.
 */
function detectProfileType(normalizedQuery: string): string | undefined {
  let elegido: string | undefined
  let mejorPosicion = Number.POSITIVE_INFINITY

  for (const canonical of Object.keys(PROFILE_TYPE_TERMS)) {
    for (const term of PROFILE_TYPE_TERMS[canonical]) {
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
 * del proyecto, nunca por su codigo de dos letras: "es", "ar" o "mx" son
 * palabras corrientes del castellano.
 */
function detectCountryCode(normalizedQuery: string): string | undefined {
  return COUNTRIES.find((country) => containsTerm(normalizedQuery, normalizeLocationValue(country.name)))?.code
}

/**
 * Reconoce region y ciudad EXCLUSIVAMENTE contra las ubicaciones que el
 * catalogo de personas contiene de verdad. No hay diccionario geografico:
 * si ninguna persona esta en Cuenca, "cuenca" no es criterio reconocible,
 * por muy real que sea la ciudad. La ausencia de dato no se convierte en
 * conocimiento inventado.
 *
 * Devuelve la forma CANONICA, no la del catalogo: asi "Tenerife",
 * "TENERIFE" y "tenerife " convergen en el mismo criterio, y Repository
 * Layer lo resuelve despues contra todas sus variantes reales.
 */
function detectLocation(normalizedQuery: string, known: readonly string[]): string | undefined {
  const encontrada = known.find((place) => containsTerm(normalizedQuery, normalizeLocationValue(place)))

  return encontrada === undefined ? undefined : normalizeLocationValue(encontrada)
}

/**
 * Unico punto de entrada. Funcion pura, sincrona y determinista: no accede
 * a persistencia, no invoca IA, no consulta red. Un criterio ausente
 * significa "sin filtrar por ese atributo" -- nunca un valor por defecto.
 */
export function interpretPersonQuery(
  normalizedQuery: string,
  knownLocations: PersonLocations = { regions: [], cities: [] }
): PersonSearchCriteria {
  const criteria: { -readonly [K in keyof PersonSearchCriteria]?: PersonSearchCriteria[K] } = {}

  const profileType = detectProfileType(normalizedQuery)
  if (profileType !== undefined) criteria.profileType = profileType

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
 * "en Canarias", "en Argentina". Unica construccion que este motor reconoce
 * como peticion de ubicacion.
 */
const LOCATIVE_PREPOSITION = /\ben\s+([a-z0-9]+(?:\s+[a-z0-9]+)?)/

/** Palabras que siguen a "en" sin designar un lugar. */
const NON_PLACE_COMPLEMENTS = new Set([
  'total',
  'general',
  'concreto',
  'particular',
  'activo',
  'activa',
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
  'teatro',
  'cine',
  'television',
  'publicidad',
])

/**
 * Declara si el usuario pidio una ubicacion que NO se ha podido resolver:
 * o no existe en el catalogo, o el modelo no la representa. Es el
 * equivalente exacto de `hasUnresolvedLocation` en Organizaciones, y
 * alimenta el mismo canal `unappliedCriteria` ya establecido -- nunca un
 * segundo sistema de señales.
 *
 * No conoce ningun toponimo: solo comprueba si lo que sigue a la
 * preposicion quedo o no resuelto por los criterios ya calculados.
 */
export function hasUnresolvedPersonLocation(normalizedQuery: string, criteria: PersonSearchCriteria): boolean {
  if (criteria.countryCode !== undefined || criteria.region !== undefined || criteria.city !== undefined) {
    return false
  }

  const match = normalizedQuery.match(LOCATIVE_PREPOSITION)
  if (match === null) return false

  const primeraPalabra = match[1].trim().split(/\s+/)[0]

  return !NON_PLACE_COMPLEMENTS.has(primeraPalabra)
}
