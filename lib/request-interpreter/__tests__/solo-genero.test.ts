import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { normalizeRequest } from '../interpreter'
import { normalizeText } from '../normalize-text'
import {
  detectPlainListingRequest,
  detectSoloGeneroRequest,
  SOLO_GENERO_TERMINOS,
  SOLO_GENERO_VERBOS,
  SOLO_GENERO_ARTICULOS,
} from '../plain-listing-rules'
import { interpretWorkQuery } from '@/lib/knowledge-assets/interpret-work-query'
import { RESOLVABLE_TERMS } from '@/lib/intent-resolver/vocabulary'
import { isPlainListing } from '@/lib/decision-engine/plain-listing'
import type { KnowledgeContext } from '@/lib/scenaia-knowledge-model'

/**
 * SCENAIA-004C (§4.1 a §4.4 y §7): peticion de solo criterio de genero.
 * El texto entero es un verbo de peticion opcional, un articulo opcional y
 * exactamente un termino de genero; entonces cuenta como listado puro y, si
 * no abre ningun dominio por si mismo, el dominio es Obras.
 */

const turno = (texto: string, historial: string[] = [], dominioPrevio: 'Obras' | 'Personas' | null = null) =>
  normalizeRequest(texto, 'turno-004c', historial, dominioPrevio)

/** Conocimiento minimo con una obra: condiciones (c), (d) y (e) del §4.1 cumplidas. */
const CONOCIMIENTO_CON_OBRA = {
  knowledgeDomains: ['Obras'],
  knowledgeEntities: [{ domain: 'Obras', data: { title: 'La dama boba' } }],
  knowledgeLimitations: [],
} as unknown as KnowledgeContext

describe('casos que CAMBIAN: listado puro con dominio Obras (§4.1 y §4.2)', () => {
  const CASOS = ['comedias', 'comedia', 'dame comedias', 'quiero comedias', 'las comedias', 'clásicos', '¿comedias?', 'Dame las comedias.']

  it.each(CASOS)('sin historial: "%s" → dominio Obras, listado puro, petición reconocida', (texto) => {
    const r = turno(texto)
    expect(r.requestedKnowledgeDomains).toEqual(['Obras'])
    expect(r.requestsPlainListing).toBe(true)
    expect(r.requestType).toBe('RECONOCIDA')
  })

  it.each(CASOS)('con historial de otra cosa (Personas): "%s" → sigue siendo Obras, no hereda el dominio anterior', (texto) => {
    const r = turno(texto, ['busco actores en Madrid'], 'Personas')
    expect(r.requestedKnowledgeDomains).toEqual(['Obras'])
    expect(r.requestsPlainListing).toBe(true)
  })

  it.each(CASOS)('con historial de obras: "%s" → Obras y listado puro (la continuidad de criterios no cambia)', (texto) => {
    const r = turno(texto, ['dame la lista de obras'], 'Obras')
    expect(r.requestedKnowledgeDomains).toEqual(['Obras'])
    expect(r.requestsPlainListing).toBe(true)
    expect(r.retrievalQuery).toBe(normalizeText(`dame la lista de obras. ${texto}`))
  })

  it('el Decision Engine, sin cambios, ya lo trata como listado puro cuando hay obras', () => {
    for (const texto of CASOS) expect(isPlainListing(turno(texto), CONOCIMIENTO_CON_OBRA), texto).toBe(true)
  })
})

describe('casos que NO cambian', () => {
  it('"recomiéndame comedias" y "¿qué comedias me recomiendas?": razonar veta la forma; sin dominio, como hoy', () => {
    for (const texto of ['recomiéndame comedias', '¿qué comedias me recomiendas?']) {
      const r = turno(texto)
      expect(detectSoloGeneroRequest(r.normalizedIntent), texto).toBe(false)
      expect(r.requestsPlainListing, texto).toBe(false)
      expect(r.requestedKnowledgeDomains, texto).toEqual([])
    }
  })

  it('"comedias cortas": dos criterios, no es la forma; sin dominio, como hoy', () => {
    const r = turno('comedias cortas')
    expect(r.requestsPlainListing).toBe(false)
    expect(r.requestedKnowledgeDomains).toEqual([])
  })

  it('"comedias de Lope": palabra añadida, no es la forma; sin dominio, como hoy', () => {
    const r = turno('comedias de Lope')
    expect(r.requestsPlainListing).toBe(false)
    expect(r.requestedKnowledgeDomains).toEqual([])
  })

  it('"teatro clásico": sigue en Organizaciones y no es listado puro', () => {
    const r = turno('teatro clásico')
    expect(r.requestsPlainListing).toBe(false)
    expect(r.requestedKnowledgeDomains).toEqual(['Organizaciones'])
  })

  it('los listados explícitos de siempre no cambian', () => {
    expect(turno('dame la lista de obras de comedia').requestsPlainListing).toBe(true)
    expect(turno('dame la lista de obras de comedia').requestedKnowledgeDomains).toEqual(['Obras'])
    expect(turno('obras de comedia').requestsPlainListing).toBe(false)
  })

  it('con historial, una petición que no es la forma sigue heredando como hoy', () => {
    expect(turno('comedias cortas', ['busco actores en Madrid'], 'Personas').requestedKnowledgeDomains).toEqual(['Personas'])
  })
})

describe('límites de la forma (§4.1)', () => {
  const NO = [
    ['dos géneros', 'comedias musicales'],
    ['dos géneros con verbo', 'dame comedias y musicales'],
    ['verbo sin término', 'dame'],
    ['artículo sin término', 'las'],
    ['verbo y artículo sin término', 'quiero las'],
    ['término con una palabra añadida', 'comedias divertidas'],
    ['palabra añadida delante', 'obras comedias'],
    ['verbo fuera de la lista', 'necesito comedias'],
    ['verbo fuera de la lista (2)', 'muestra comedias'],
    ['artículo fuera de la lista', 'dame esas comedias'],
    ['artículo fuera de la lista (2)', 'unas pocas comedias'],
    ['orden invertido', 'las dame comedias'],
    ['dos verbos', 'dame quiero comedias'],
    ['género que no está en la lista', 'dramas'],
    ['época (fuera de esta adenda)', 'barroco'],
    ['texto vacío', ''],
  ]

  it.each(NO)('%s: "%s" no cumple la forma', (_nombre, texto) => {
    expect(detectSoloGeneroRequest(normalizeText(texto))).toBe(false)
  })

  it('cada verbo, cada artículo y cada término de las listas cerradas cumplen la forma en todas sus combinaciones', () => {
    for (const verbo of ['', ...SOLO_GENERO_VERBOS]) {
      for (const articulo of ['', ...SOLO_GENERO_ARTICULOS]) {
        for (const termino of SOLO_GENERO_TERMINOS) {
          const texto = [verbo, articulo, termino].filter(Boolean).join(' ')
          expect(detectSoloGeneroRequest(texto), texto).toBe(true)
          expect(detectPlainListingRequest(texto), texto).toBe(true)
        }
      }
    }
  })
})

describe('sincronía del vocabulario con el intérprete de obras, en los dos sentidos (§7.1)', () => {
  it('A) cada término de la lista produce un criterio de género real en el intérprete de obras', () => {
    for (const termino of SOLO_GENERO_TERMINOS) {
      const criterio = interpretWorkQuery(termino)
      expect(criterio.genre, termino).toBeDefined()
      // Nada más que el género: un término no puede colar otro criterio.
      expect(Object.keys(criterio), termino).toEqual(['genre'])
    }
  })

  it('A) con la época encendida, cada término sigue produciendo un criterio (clásico pasa a época, SCENAIA-007)', () => {
    for (const termino of SOLO_GENERO_TERMINOS) {
      expect(Object.keys(interpretWorkQuery(termino, [], {}, { epocaHabilitada: true })).length, termino).toBeGreaterThan(0)
    }
  })

  it('B) cada género que el intérprete de obras sabe interpretar tiene al menos un término en la lista', () => {
    // Géneros que el intérprete produce, leídos del vocabulario emitible del
    // Intent Resolver, que a su vez está sincronizado con el intérprete.
    const generosDelInterprete = new Set(
      RESOLVABLE_TERMS.map((t) => interpretWorkQuery(t).genre).filter((g): g is string => g !== undefined)
    )
    expect(generosDelInterprete.size).toBeGreaterThan(0)
    const cubiertos = new Set(SOLO_GENERO_TERMINOS.map((t) => interpretWorkQuery(t).genre))
    for (const genero of generosDelInterprete) expect(cubiertos, `sin término en la lista: ${genero}`).toContain(genero)
    // Y los tres canónicos de hoy, escritos a mano.
    for (const genero of ['comedia', 'musical', 'clasico']) expect(cubiertos, genero).toContain(genero)
  })
})

describe('invariantes de contrato (solo lo que reabre SCENAIA-004C)', () => {
  const RAIZ = join(__dirname, '..', '..', '..')
  const fuente = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf-8')
  const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')

  it('las palabras clave de dominio no cambian: Obras sigue siendo obra, guion, texto teatral, dramaturgia y repertorio', () => {
    expect(fuente('lib/request-interpreter/domain-rules.ts')).toMatch(
      /Obras: \['obra', 'guion', 'texto teatral', 'dramaturgia', 'repertorio'\],/
    )
  })

  it('la detección vive solo en plain-listing-rules.ts: interpreter.ts no contiene ningún término de género', () => {
    const interprete = sinComentarios(fuente('lib/request-interpreter/interpreter.ts'))
    expect(interprete).not.toMatch(/comedia|musical|clasic/)
    expect(interprete).toMatch(/detectSoloGeneroRequest\(normalizedIntent\)/)
  })

  it('el vocabulario de la forma no se declara en ningún otro fichero del Request Interpreter', () => {
    const dir = join(RAIZ, 'lib', 'request-interpreter')
    const otros = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'plain-listing-rules.ts')
    for (const f of otros) expect(sinComentarios(fuente(`lib/request-interpreter/${f}`)), f).not.toMatch(/SOLO_GENERO_(VERBOS|ARTICULOS|TERMINOS)\s*[:=]/)
  })
})
