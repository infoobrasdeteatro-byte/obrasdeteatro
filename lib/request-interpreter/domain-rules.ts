import type { KnowledgeDomain } from '@/lib/knowledge-assets'
import { isDefinitionalRequest } from './speech-act'

/**
 * Tabla estatica palabra-clave -> dominio, restringida exclusivamente a los
 * 8 dominios oficiales de CAT-001. `Inteligencia` no tiene palabras clave
 * propias en v1: es un dominio derivado internamente por el ecosistema, no
 * vocabulario que un usuario use directamente en su peticion -- ausencia
 * intencional, no un olvido. Las claves se comparan ya normalizadas (sin
 * diacriticos, ver normalize-text.ts), por lo que aqui solo aparecen formas
 * sin acento.
 */
const DOMAIN_KEYWORDS: Record<KnowledgeDomain, string[]> = {
  Personas: ['perfil', 'actor', 'actriz', 'director', 'directora', 'dramaturgo', 'dramaturga', 'profesional'],
  Obras: ['obra', 'guion', 'texto teatral', 'dramaturgia', 'repertorio'],
  Organizaciones: ['compania', 'teatro', 'festival', 'productora', 'escuela', 'institucion'],
  Oportunidades: ['casting', 'audicion', 'convocatoria', 'ayuda', 'subvencion'],
  Editorial: ['articulo', 'publicacion', 'editorial'],
  Relaciones: ['colabora', 'colaboracion', 'conexion', 'relacion'],
  Trayectoria: ['trayectoria', 'carrera', 'experiencia'],
  Inteligencia: [],
}

/**
 * Preposiciones que en castellano subordinan un sintagma al nucleo que le
 * precede: "obra DE teatro", "obra PARA pocos actores", "actores EN esta
 * obra". Lo que aparece tras ellas complementa a lo anterior; no es una
 * peticion propia.
 */
const SUBORDINATORS = ['de', 'del', 'para', 'con', 'en', 'sin', 'sobre', 'por']

/** Distancia maxima, en palabras, a la que una preposicion sigue rigiendo. */
const SUBORDINATION_WINDOW = 3

/** Signos que cierran la clausula: mas alla de ellos ninguna preposicion rige. */
const CLAUSE_BOUNDARY = /[.,;:?!()]/

/**
 * Sufijos flexivos del castellano admitidos tras una palabra clave. Permiten
 * reconocer "obras", "actores", "festivales" o "companias" sin recurrir a
 * coincidencia de subcadena, que confundia "obra" dentro de "maniobra".
 */
const INFLECTION = '(?:es|s|as|os|a|n)?'

function keywordPattern(keyword: string): RegExp {
  return new RegExp(`\\b${keyword}${INFLECTION}\\b`, 'g')
}

interface KeywordHit {
  readonly domain: KnowledgeDomain
  readonly index: number
}

function findHits(normalizedText: string): KeywordHit[] {
  const hits: KeywordHit[] = []

  for (const domain of Object.keys(DOMAIN_KEYWORDS) as KnowledgeDomain[]) {
    for (const keyword of DOMAIN_KEYWORDS[domain]) {
      for (const match of normalizedText.matchAll(keywordPattern(keyword))) {
        if (match.index !== undefined) hits.push({ domain, index: match.index })
      }
    }
  }

  return hits.sort((a, b) => a.index - b.index)
}

/**
 * Una aparicion es complemento -- no peticion propia -- cuando una
 * preposicion subordinante la introduce dentro de la misma clausula y a
 * corta distancia. La comprobacion no conoce ninguna pareja concreta de
 * palabras: es la misma regla gramatical para todos los dominios.
 */
function isSubordinated(normalizedText: string, index: number): boolean {
  const anterior = normalizedText.slice(0, index)
  const clausula = anterior.split(CLAUSE_BOUNDARY).pop() ?? ''
  const palabras = clausula.split(/\s+/).filter((palabra) => palabra.length > 0)

  return palabras.slice(-SUBORDINATION_WINDOW).some((palabra) => SUBORDINATORS.includes(palabra))
}

/**
 * Detecta los dominios que el usuario esta pidiendo realmente.
 *
 * La primera palabra clave de la peticion es su nucleo: fija de que se
 * habla. Toda aparicion posterior introducida por una preposicion
 * subordinante complementa a ese nucleo y no abre un dominio propio --
 * "obra de teatro" pide obras, no organizaciones; "obra para pocos actores"
 * pide obras, no personas; "actores de esta obra" pide personas, no obras.
 *
 * La coordinacion, en cambio, si abre dominio: "obras y castings" son dos
 * peticiones reales, porque "y" no subordina. La deteccion multiple se
 * conserva intacta siempre que la intencion la justifique.
 *
 * El orden de salida es el de declaracion de DOMAIN_KEYWORDS, no el de
 * aparicion en el texto: determinista y estable para todo consumidor.
 *
 * A3.1-alfa: antes de buscar nada se comprueba QUE HACE la peticion. Una
 * pregunta por el significado de un termino no pide ejemplares de el, asi
 * que ninguna palabra suya abre dominio -- "¿que es el teatro del absurdo?"
 * no es una consulta al catalogo de organizaciones. La comprobacion precede
 * a la deteccion lexica y no altera ninguna de sus reglas: nucleo,
 * subordinacion y coordinacion siguen exactamente igual para todo lo demas.
 */
export function detectKnowledgeDomains(normalizedText: string): KnowledgeDomain[] {
  if (isDefinitionalRequest(normalizedText)) return []

  const hits = findHits(normalizedText)
  if (hits.length === 0) return []

  const solicitados = new Set<KnowledgeDomain>()

  hits.forEach((hit, posicion) => {
    const esNucleo = posicion === 0
    if (esNucleo || !isSubordinated(normalizedText, hit.index)) {
      solicitados.add(hit.domain)
    }
  })

  return (Object.keys(DOMAIN_KEYWORDS) as KnowledgeDomain[]).filter((domain) => solicitados.has(domain))
}
