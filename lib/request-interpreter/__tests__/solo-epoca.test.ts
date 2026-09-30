import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { normalizeRequest } from '../interpreter'
import { normalizeText } from '../normalize-text'
import {
  detectPlainListingRequest,
  detectSoloEpocaRequest,
  detectSoloGeneroRequest,
  SOLO_EPOCA_TERMINOS,
  SOLO_GENERO_TERMINOS,
  SOLO_GENERO_VERBOS,
  SOLO_GENERO_ARTICULOS,
} from '../plain-listing-rules'
import { interpretWorkQuery } from '@/lib/knowledge-assets/interpret-work-query'
import { listWorkKnowledge } from '@/lib/knowledge-assets/works-knowledge'
import { EPOCA_CONCEPT_TERMS } from '@/lib/intent-resolver/vocabulary'
import { buildKnowledgeContext } from '@/lib/scenaia-knowledge-model'
import { isPlainListing } from '@/lib/decision-engine/plain-listing'

// Solo se simula la persistencia: el intérprete de obras, el recuperador y el
// Knowledge Model son los REALES, para reproducir el caso de las 11 obras.
vi.mock('@/lib/repository-layer', () => ({
  listPublishedWorkAuthors: vi.fn(async () => ['Lope de Vega', 'Calderon de la Barca']),
  listOrganizationLocations: vi.fn(async () => []),
  listPersonLocations: vi.fn(async () => []),
}))
vi.mock('@/lib/knowledge-assets/works-knowledge', () => ({ listWorkKnowledge: vi.fn() }))
vi.mock('@/lib/knowledge-assets/organizations-knowledge', () => ({ listOrganizationKnowledge: vi.fn(async () => []) }))
vi.mock('@/lib/knowledge-assets/persons-knowledge', () => ({ listPersonKnowledge: vi.fn(async () => []) }))

/**
 * SCENAIA-004D (§4 y §7): la forma de solo criterio admite también un término
 * de época, pero SOLO con el interruptor de época encendido, que llega como
 * dato. Apagado, el comportamiento es exactamente el anterior.
 */

const ON = { epocaHabilitada: true } as const
const OFF = { epocaHabilitada: false } as const
type Dominio = 'Obras' | 'Personas' | null

/** La hora de interpretación es lo único que cambia de una llamada a otra. */
const sinHora = (r: ReturnType<typeof normalizeRequest>) => ({ ...r, timestamp: '' })

const turno = (texto: string, opciones?: { epocaHabilitada: boolean }, historial: string[] = [], dominioPrevio: Dominio = null) =>
  normalizeRequest(texto, 'turno-004d', historial, dominioPrevio, opciones)

/**
 * El catálogo de producción al redactar la Adenda (§3.1): 11 obras publicadas,
 * 10 con época Siglo de Oro y Barroco. La simulación aplica el filtro de
 * épocas como Repository Layer: sin criterio, las 11.
 */
const CATALOGO = [
  ...Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, title: `Obra áurea ${i}`, epocas: ['siglo_de_oro', 'barroco'] })),
  { id: 'w10', title: 'Obra sin época', epocas: [] as string[] },
]

beforeEach(() => {
  vi.mocked(listWorkKnowledge)
    .mockReset()
    .mockImplementation((async (criterios: { epocas?: readonly string[] } = {}) =>
      CATALOGO.filter((obra) => criterios.epocas === undefined || obra.epocas.some((e) => criterios.epocas!.includes(e))).map(
        (data) => ({ domain: 'Obras', data, provenance: {}, functions: [] })
      )) as never)
})

/** Interpretación y conocimiento reales, como en el primer paso del Orquestador. */
async function cadena(texto: string, opciones?: { epocaHabilitada: boolean }, historial: string[] = [], dominioPrevio: Dominio = null) {
  const peticion = turno(texto, opciones, historial, dominioPrevio)
  const conocimiento = opciones?.epocaHabilitada
    ? await buildKnowledgeContext(peticion, {}, undefined, ON)
    : await buildKnowledgeContext(peticion, {})
  return { peticion, conocimiento, listado: isPlainListing(peticion, conocimiento) }
}

/** Términos de época que el §9 de la Adenda deja fuera de la lista, de forma expresa. */
const EXCLUIDOS = [
  'realismo', 'naturalismo', 'naturalista', 'naturalistas',
  'renacimiento',
  'griego', 'griega', 'griegos', 'griegas',
  'aureo',
  'vanguardista', 'vanguardistas',
  'postguerra',
]

/**
 * Sinónimos de época del intérprete de obras real, leídos de su fuente: los de
 * EPOCA_TERMS (SCENAIA-007) y los de CONTEMPORANEO, que ya ocupaba la ranura
 * de época ("contemporáneo", "actual", "moderna").
 */
function sinonimosDeEpocaDelInterprete(): string[] {
  const fuente = readFileSync(join(__dirname, '..', '..', 'knowledge-assets', 'interpret-work-query.ts'), 'utf-8')
  const bloque = fuente.match(/const EPOCA_TERMS[^=]*= \{([\s\S]*?)\n\}/)
  const contemporaneo = fuente.match(/\n {2}CONTEMPORANEO: \[([^\]]*)\]/)
  if (!bloque) throw new Error('no se encuentra EPOCA_TERMS en el intérprete de obras')
  if (!contemporaneo) throw new Error('no se encuentran los sinónimos de CONTEMPORANEO en el intérprete de obras')
  return [...`${bloque[1]} ${contemporaneo[1]}`.matchAll(/'([a-z ]+)'/g)].map((m) => m[1])
}

describe('sincronía con el intérprete de obras real, en modo encendido, en los dos sentidos (§7.1)', () => {
  it('la lista ya está sin acentos y sin duplicados', () => {
    for (const termino of SOLO_EPOCA_TERMINOS) expect(normalizeText(termino), termino).toBe(termino)
    expect(new Set(SOLO_EPOCA_TERMINOS).size).toBe(SOLO_EPOCA_TERMINOS.length)
  })

  it('A) cada término de la lista produce, encendido, un criterio de época y nada más', () => {
    for (const termino of SOLO_EPOCA_TERMINOS) {
      const criterio = interpretWorkQuery(termino, [], {}, ON)
      expect(criterio.epocas?.length, termino).toBeGreaterThan(0)
      for (const campo of Object.keys(criterio)) expect(['epocas', 'epocaYearFrom'], `${termino}: ${campo}`).toContain(campo)
    }
  })

  it('A) ningún término de la lista es de género ni está en la lista de géneros (listas separadas)', () => {
    for (const termino of SOLO_EPOCA_TERMINOS) {
      expect(SOLO_GENERO_TERMINOS, termino).not.toContain(termino)
      expect(interpretWorkQuery(termino, [], {}, ON).genre, termino).toBeUndefined()
    }
  })

  it('B) cada sinónimo de época del intérprete está en la lista o entre los excluidos expresamente, y solo en uno', () => {
    const sinonimos = sinonimosDeEpocaDelInterprete()
    expect(sinonimos.length).toBeGreaterThan(30)
    for (const sinonimo of sinonimos) {
      const enLista = SOLO_EPOCA_TERMINOS.includes(sinonimo)
      const excluido = EXCLUIDOS.includes(sinonimo)
      expect(enLista !== excluido, `${sinonimo}: en la lista ${enLista}, excluido ${excluido}`).toBe(true)
    }
    // Los excluidos son términos reales del intérprete, no una lista de relleno.
    for (const excluido of EXCLUIDOS) {
      expect(sinonimos, excluido).toContain(excluido)
      expect(interpretWorkQuery(excluido, [], {}, ON).epocas?.length, excluido).toBeGreaterThan(0)
    }
  })

  it('B) todos los sinónimos de CONTEMPORANEO del intérprete están en la lista, sin excepción', () => {
    const contemporaneo = sinonimosDeEpocaDelInterprete().filter((s) =>
      interpretWorkQuery(s, [], {}, ON).epocas?.includes('contemporaneo')
    )
    expect(contemporaneo).toEqual(expect.arrayContaining(['contemporaneo', 'actual', 'moderna']))
    for (const sinonimo of contemporaneo) {
      expect(SOLO_EPOCA_TERMINOS, sinonimo).toContain(sinonimo)
      expect(EXCLUIDOS, sinonimo).not.toContain(sinonimo)
    }
  })

  it('B) cada concepto de época del intérprete tiene al menos un término en las listas, salvo realismo/naturalismo', () => {
    // Un término canónico por concepto (sincronizado con el intérprete por las
    // pruebas del Intent Resolver), más contemporáneo; clásico está en la de géneros.
    const claves = new Set([...EPOCA_CONCEPT_TERMS, 'contemporaneo'].flatMap((t) => interpretWorkQuery(t, [], {}, ON).epocas ?? []))
    expect(claves.size).toBe(12)
    const cubiertas = new Set(SOLO_EPOCA_TERMINOS.flatMap((t) => interpretWorkQuery(t, [], {}, ON).epocas ?? []))
    for (const clave of claves) {
      if (clave === 'realismo_naturalismo') expect(cubiertas, clave).not.toContain(clave)
      else expect(cubiertas, `sin término en la lista: ${clave}`).toContain(clave)
    }
    expect(SOLO_GENERO_TERMINOS).toContain('clasico')
    expect(interpretWorkQuery('clasico', [], {}, ON).epocas?.length).toBeGreaterThan(0)
  })

  it('apagado, el intérprete no da criterio de época para ningún término (§3.3: por eso la forma exige el interruptor)', () => {
    for (const termino of SOLO_EPOCA_TERMINOS) expect(interpretWorkQuery(termino).epocas, termino).toBeUndefined()
  })
})

describe('interruptor apagado: ningún término de época es listado puro ni fija Obras (§4.4 y §7.3)', () => {
  it.each([
    ['ausente', undefined],
    ['false', OFF],
  ] as const)('opción %s: en todas las combinaciones de verbo y artículo', (_nombre, opciones) => {
    let casos = 0
    for (const verbo of ['', ...SOLO_GENERO_VERBOS]) {
      for (const articulo of ['', ...SOLO_GENERO_ARTICULOS]) {
        for (const termino of SOLO_EPOCA_TERMINOS) {
          const texto = [verbo, articulo, termino].filter(Boolean).join(' ')
          expect(detectSoloEpocaRequest(texto, opciones), texto).toBe(false)
          expect(detectPlainListingRequest(texto, opciones), texto).toBe(false)
          const r = turno(texto, opciones)
          expect(r.requestsPlainListing, texto).toBe(false)
          expect(r.requestedKnowledgeDomains, texto).toEqual([])
          casos++
        }
      }
    }
    expect(casos).toBe(8 * 9 * SOLO_EPOCA_TERMINOS.length)
  })

  it('apagado, el resultado es idéntico al de no pasar la opción, con y sin historial', () => {
    const historiales: [string[], Dominio][] = [[[], null], [['dame la lista de obras'], 'Obras'], [['busco actores en Madrid'], 'Personas']]
    for (const termino of SOLO_EPOCA_TERMINOS) {
      for (const [historial, previo] of historiales) {
        const sin = sinHora(normalizeRequest(termino, 'id', historial, previo))
        expect(sinHora(normalizeRequest(termino, 'id', historial, previo, OFF)), termino).toEqual(sin)
      }
    }
  })

  it('caso de las 11 obras, sin historial: "barroco" apagado no abre Obras ni lista el catálogo', async () => {
    const { peticion, conocimiento, listado } = await cadena('barroco')
    expect(peticion.requestedKnowledgeDomains).toEqual([])
    expect(conocimiento.knowledgeEntities).toHaveLength(0)
    expect(listado).toBe(false)
  })

  it('caso de las 11 obras, con historial de Obras: "barroco" apagado recupera las 11 sin filtro y NO es listado puro', async () => {
    const { peticion, conocimiento, listado } = await cadena('barroco', undefined, ['dame la lista de obras'], 'Obras')
    // Exactamente el riesgo del §3.3: el catálogo entero, sin criterio de época...
    expect(vi.mocked(listWorkKnowledge).mock.calls[0][0]).toEqual({})
    expect(conocimiento.knowledgeEntities).toHaveLength(11)
    // ...que no se entrega como listado puro: el turno se comporta como hoy.
    expect(peticion.requestsPlainListing).toBe(false)
    expect(listado).toBe(false)
  })

  it('el mismo caso encendido: "barroco" filtra por época y sí es listado puro, con las 10 barrocas', async () => {
    const { conocimiento, listado } = await cadena('barroco', ON)
    expect(vi.mocked(listWorkKnowledge).mock.calls[0][0]).toEqual({ epocas: ['barroco'] })
    expect(conocimiento.knowledgeEntities).toHaveLength(10)
    expect(listado).toBe(true)
  })
})

describe('casos que CAMBIAN, con el interruptor encendido (§7.4)', () => {
  const CASOS = ['barroco', 'el barroco', 'dame barroco', 'siglo de oro', 'el siglo de oro', 'isabelino', 'contemporáneo']
  const HISTORIALES: [string, string[], Dominio][] = [
    ['sin historial', [], null],
    ['con historial de Obras', ['dame la lista de obras'], 'Obras'],
    ['con historial de otra cosa (Personas)', ['busco actores en Madrid'], 'Personas'],
  ]

  describe.each(HISTORIALES)('%s', (_nombre, historial, previo) => {
    it.each(CASOS)('"%s" → dominio Obras, listado puro, petición reconocida', (texto) => {
      const r = turno(texto, ON, historial, previo)
      expect(r.requestedKnowledgeDomains).toEqual(['Obras'])
      expect(r.requestsPlainListing).toBe(true)
      expect(r.requestType).toBe('RECONOCIDA')
    })

    it.each(CASOS)('"%s" apagado → como hoy: nada de listado puro', (texto) => {
      expect(turno(texto, OFF, historial, previo).requestsPlainListing).toBe(false)
    })
  })

  it('con el catálogo real simulado: los barrocos y los del Siglo de Oro son listado puro con 10 obras', async () => {
    for (const texto of ['barroco', 'el barroco', 'dame barroco', 'siglo de oro', 'el siglo de oro']) {
      const { conocimiento, listado } = await cadena(texto, ON)
      expect(conocimiento.knowledgeEntities, texto).toHaveLength(10)
      expect(listado, texto).toBe(true)
    }
  })

  it('una época sin obras en el catálogo ("isabelino", "contemporáneo") cumple la forma pero no es listado puro (condición e)', async () => {
    for (const texto of ['isabelino', 'contemporáneo']) {
      const { peticion, conocimiento, listado } = await cadena(texto, ON)
      expect(peticion.requestsPlainListing, texto).toBe(true)
      expect(conocimiento.knowledgeEntities, texto).toHaveLength(0)
      expect(listado, texto).toBe(false)
    }
  })
})

describe('casos que NO cambian (§7.5)', () => {
  it.each([
    ['teatro barroco', ['Organizaciones']],
    ['comedias barrocas', []],
    ['recomiéndame barroco', []],
    ['del siglo de oro', []],
    ['obras barrocas', ['Obras']],
  ])('"%s": ni encendido ni apagado es listado puro; dominio como hoy', (texto, dominios) => {
    for (const opciones of [ON, OFF, undefined]) {
      const r = turno(texto, opciones)
      expect(detectSoloEpocaRequest(r.normalizedIntent, opciones), texto).toBe(false)
      expect(r.requestsPlainListing, texto).toBe(false)
      expect(r.requestedKnowledgeDomains, texto).toEqual(dominios)
    }
  })

  it('encendido o no, el resultado de esos casos es idéntico al de no pasar la opción', () => {
    for (const texto of ['teatro barroco', 'comedias barrocas', 'recomiéndame barroco', 'del siglo de oro', 'obras barrocas']) {
      expect(sinHora(normalizeRequest(texto, 'id', [], null, ON)), texto).toEqual(sinHora(normalizeRequest(texto, 'id')))
    }
  })
})

describe('límites de la forma, con el interruptor encendido (§7.6)', () => {
  const NO = [
    ['dos épocas', 'barroco isabelino'],
    ['dos épocas con verbo y conjunción', 'dame barroco y medieval'],
    ['época y género juntos', 'comedia barroca'],
    ['género y época juntos', 'barroco comedias'],
    ['compuesto incompleto', 'siglo de'],
    ['compuesto incompleto (2)', 'el siglo'],
    ['compuesto incompleto (3)', 'de oro'],
    ['compuesto con palabra de más', 'siglo de oro español'],
    ['palabra añadida detrás', 'barroco español'],
    ['palabra añadida delante', 'teatro isabelino'],
    ['verbo fuera de la lista', 'necesito barroco'],
    ['verbo fuera de la lista (2)', 'muestra el barroco'],
    ['artículo fuera de la lista', 'dame ese barroco'],
    ['"del" no es artículo', 'dame del siglo de oro'],
    ['"lo" no es artículo', 'lo barroco'],
    ['orden invertido', 'el dame barroco'],
    ['dos artículos', 'el la barroco'],
    ['término excluido por la Adenda', 'renacimiento'],
    ['término excluido por la Adenda (2)', 'postguerra'],
    ['término excluido por la Adenda (3)', 'griego'],
    ['verbo y artículo sin término', 'dame el'],
    ['texto vacío', ''],
  ]

  it.each(NO)('%s: "%s" no cumple la forma', (_nombre, texto) => {
    const normalizado = normalizeText(texto)
    expect(detectSoloEpocaRequest(normalizado, ON)).toBe(false)
    expect(detectSoloGeneroRequest(normalizado)).toBe(false)
    expect(turno(texto, ON).requestsPlainListing).toBe(false)
  })

  it('cada verbo, cada artículo y cada término de época cumplen la forma, encendido, en todas sus combinaciones', () => {
    for (const verbo of ['', ...SOLO_GENERO_VERBOS]) {
      for (const articulo of ['', ...SOLO_GENERO_ARTICULOS]) {
        for (const termino of SOLO_EPOCA_TERMINOS) {
          const texto = [verbo, articulo, termino].filter(Boolean).join(' ')
          expect(detectSoloEpocaRequest(texto, ON), texto).toBe(true)
          expect(detectPlainListingRequest(texto, ON), texto).toBe(true)
        }
      }
    }
  })

  it('los signos separan dentro de la forma igual que en la de género', () => {
    for (const texto of ['¿barroco?', 'El siglo de oro.', '¡dame el barroco!', 'siglo, de oro']) {
      expect(turno(texto, ON).requestsPlainListing, texto).toBe(true)
    }
  })

  it('una época de la lista no cumple la forma de género, ni un género la de época', () => {
    for (const termino of SOLO_EPOCA_TERMINOS) expect(detectSoloGeneroRequest(termino), termino).toBe(false)
    for (const termino of SOLO_GENERO_TERMINOS) expect(detectSoloEpocaRequest(termino, ON), termino).toBe(false)
  })
})

describe('artículos en singular en la forma de género (§4.3)', () => {
  it.each(['la comedia', 'el musical', 'dame la comedia', 'quiero el musical', 'el clásico', 'la clásica'])(
    '"%s" cumple la forma de solo género, con la época encendida o no',
    (texto) => {
      for (const opciones of [ON, OFF, undefined]) {
        const r = turno(texto, opciones)
        expect(r.requestedKnowledgeDomains, texto).toEqual(['Obras'])
        expect(r.requestsPlainListing, texto).toBe(true)
      }
    }
  )

  it('"la comedia del arte" no la cumple: la palabra añadida la desactiva (§6.4)', () => {
    expect(detectSoloGeneroRequest(normalizeText('la comedia del arte'))).toBe(false)
  })

  it('la lista de artículos es exactamente la del §4.3, y la de verbos la de la 004C', () => {
    expect([...SOLO_GENERO_ARTICULOS].sort()).toEqual(['algunas', 'algunos', 'el', 'la', 'las', 'los', 'unas', 'unos'])
    expect(SOLO_GENERO_VERBOS).toEqual(['dame', 'quiero', 'busco', 'tienes', 'hay', 'muestrame', 'ensename'])
  })
})

describe('invariantes de contrato (solo lo que reabre SCENAIA-004D)', () => {
  const RAIZ = join(__dirname, '..', '..', '..')
  const fuente = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf-8')
  const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
  const DIR = join(RAIZ, 'lib', 'request-interpreter')
  const ficheros = readdirSync(DIR).filter((f) => f.endsWith('.ts'))

  it('SOLO_EPOCA_TERMINOS se declara solo en plain-listing-rules.ts', () => {
    for (const f of ficheros.filter((f) => f !== 'plain-listing-rules.ts')) {
      expect(sinComentarios(fuente(`lib/request-interpreter/${f}`)), f).not.toMatch(/SOLO_EPOCA_TERMINOS\s*[:=]/)
    }
  })

  it('interpreter.ts no contiene ningún término de época: solo reenvía la opción a la detección', () => {
    const interprete = sinComentarios(fuente('lib/request-interpreter/interpreter.ts'))
    for (const termino of SOLO_EPOCA_TERMINOS) expect(interprete, termino).not.toContain(termino)
    expect(interprete).toMatch(/detectSoloEpocaRequest\(normalizedIntent, opciones\)/)
    expect(interprete).toMatch(/detectPlainListingRequest\(normalizedIntent, opciones\)/)
  })

  it('la opción es un tipo propio: el Request Interpreter no importa OpcionesEpoca ni lee el interruptor', () => {
    for (const f of ficheros) {
      const codigo = sinComentarios(fuente(`lib/request-interpreter/${f}`))
      expect(codigo, f).not.toMatch(/OpcionesEpoca|OpcionesVocabulario|process\.env|epocaActivada|SCENAIA_EPOCA_ENABLED/)
    }
    expect(fuente('lib/request-interpreter/plain-listing-rules.ts')).toMatch(
      /export interface OpcionesSoloCriterio \{\s*readonly epocaHabilitada: boolean\s*\}/
    )
    expect(sinComentarios(fuente('lib/request-interpreter/plain-listing-rules.ts'))).not.toMatch(/\bimport\b/)
  })

  it('normalizeRequest: requestId sigue segundo y obligatorio; la opción es el último parámetro, opcional', () => {
    expect(fuente('lib/request-interpreter/interpreter.ts')).toMatch(
      /export function normalizeRequest\(\s*originalRequest: string,\s*requestId: string,\s*previousUserRequests: readonly string\[\] = \[\],\s*previousDomain: KnowledgeDomain \| null = null,\s*opciones\?: OpcionesSoloCriterio\s*\)/
    )
  })

  it('el Orquestador pasa la opción solo a la primera interpretación, con el mismo transporte que al resto', () => {
    const flujo = fuente('lib/verified/orquestador/coordinate-flow.ts')
    expect(flujo).toMatch(/normalizeRequest\(originalRequest, turnId, previousUserRequests, dominioPrevio, \.\.\.epoca\)/)
    expect(flujo).toMatch(/normalizeRequest\(\s*composeAugmentedRequest\(originalRequest, resolvedTerms, \.\.\.epoca\),\s*turnId,\s*previousUserRequests\s*\)/)
    expect(flujo.match(/normalizeRequest\(/g)).toHaveLength(2)
  })
})
