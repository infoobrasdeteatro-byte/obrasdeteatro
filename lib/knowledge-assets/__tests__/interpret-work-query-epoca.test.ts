import { describe, it, expect } from 'vitest'
import {
  interpretWorkQuery,
  hasUnresolvedAuthor,
  resolveWorkOccupancy,
  isWorkConcept,
  isWorkConceptInSlot,
} from '../interpret-work-query'
import type { WorkConcept, WorkSlot } from '../interpret-work-query'

/**
 * SCENAIA-007 PR 3 (§4.4 y §7.2 del acta): la época como dimensión propia en
 * el intérprete, detrás de SCENAIA_EPOCA_ENABLED. El interruptor llega como
 * dato ({ epocaHabilitada }); el intérprete no lee el entorno.
 *
 * Las consultas llegan ya normalizadas (minúsculas, sin acentos), como las
 * entrega normalizeText() del Request Interpreter.
 */
const ON = { epocaHabilitada: true } as const
const OFF = { epocaHabilitada: false } as const
const CLASICO = ['grecolatino', 'renacimiento', 'siglo_de_oro', 'barroco', 'isabelino', 'neoclasico']

describe('interpretWorkQuery — época con el interruptor ENCENDIDO (tabla del §7.3)', () => {
  it('"obras de teatro clasico" → {epocas: [6 claves]}', () => {
    expect(interpretWorkQuery('obras de teatro clasico', [], {}, ON)).toEqual({ epocas: CLASICO })
  })

  it('"comedias clasicas" → {genre: comedia, epocas: [6 claves]}: género y época ya no compiten', () => {
    expect(interpretWorkQuery('comedias clasicas', [], {}, ON)).toEqual({ genre: 'comedia', epocas: CLASICO })
  })

  it('"obras del siglo de oro" → {epocas: [siglo_de_oro]}, sin marcar autor no resuelto', () => {
    const q = 'obras del siglo de oro'
    const criteria = interpretWorkQuery(q, [], {}, ON)
    expect(criteria).toEqual({ epocas: ['siglo_de_oro'] })
    expect(hasUnresolvedAuthor(q, criteria, ON)).toBe(false)
  })

  it('"teatro barroco" → {epocas: [barroco]}', () => {
    expect(interpretWorkQuery('teatro barroco', [], {}, ON)).toEqual({ epocas: ['barroco'] })
  })

  it('"neoclasico" → solo NEOCLASICO: la subcadena "clasico" no dispara CLASICO', () => {
    expect(interpretWorkQuery('neoclasico', [], {}, ON)).toEqual({ epocas: ['neoclasico'] })
    expect(resolveWorkOccupancy('neoclasico', {}, ON)).toEqual({ epoca: 'NEOCLASICO' })
    // Comprobación explícita en todas sus formas y en medio de una frase.
    for (const q of ['teatro neoclasico', 'obras neoclasicas', 'una comedia neoclasica', 'autores neoclasicos']) {
      const criteria = interpretWorkQuery(q, [], {}, ON)
      expect(criteria.epocas, q).toEqual(['neoclasico'])
      expect(criteria.epocas, q).not.toEqual(CLASICO)
      expect(criteria.genre, q).not.toBe('clasico')
    }
  })

  it('"comedia romantica" → sin época: "romántica" no dispara ROMANTICISMO', () => {
    expect(interpretWorkQuery('comedia romantica', [], {}, ON)).toEqual({ genre: 'comedia' })
    expect(resolveWorkOccupancy('comedia romantica', {}, ON)).toEqual({ genero: 'COMEDIA' })
  })

  it('"teatro contemporaneo" → {epocas: [contemporaneo], epocaYearFrom: 1950}', () => {
    expect(interpretWorkQuery('teatro contemporaneo', [], {}, ON)).toEqual({ epocas: ['contemporaneo'], epocaYearFrom: 1950 })
  })
})

describe('interpretWorkQuery — época ENCENDIDA, resto de casos', () => {
  const SINONIMOS: Record<string, string[]> = {
    grecolatino: ['grecolatino', 'grecolatina', 'grecolatinos', 'grecolatinas', 'griego', 'griega', 'griegos', 'griegas'],
    medieval: ['medieval', 'medievales'],
    renacimiento: ['renacimiento', 'renacentista', 'renacentistas'],
    siglo_de_oro: ['siglo de oro', 'siglos de oro', 'aureo'],
    barroco: ['barroco', 'barroca', 'barrocos', 'barrocas'],
    isabelino: ['isabelino', 'isabelina', 'isabelinos', 'isabelinas'],
    neoclasico: ['neoclasico', 'neoclasica', 'neoclasicos', 'neoclasicas'],
    romanticismo: ['romanticismo'],
    realismo_naturalismo: ['realismo', 'naturalismo', 'naturalista', 'naturalistas'],
    vanguardias: ['vanguardia', 'vanguardias', 'vanguardista', 'vanguardistas'],
    posguerra: ['posguerra', 'postguerra'],
  }

  it('cada sinónimo de la tabla del §4.4 produce exactamente su clave de works.epocas', () => {
    for (const [clave, sinonimos] of Object.entries(SINONIMOS)) {
      for (const s of sinonimos) {
        expect(interpretWorkQuery(`obras ${s}`, [], {}, ON), s).toEqual({ epocas: [clave] })
      }
    }
  })

  it('los sinónimos excluidos a propósito no producen época: romántico/a, realista, romano', () => {
    for (const q of ['obras romanticas', 'un drama romantico', 'teatro realista', 'el teatro romano de merida']) {
      expect(interpretWorkQuery(q, [], {}, ON).epocas, q).toBeUndefined()
    }
  })

  it('solo por palabra completa: "actualmente" no es "actual", "griegolandia" no es "griego"', () => {
    expect(interpretWorkQuery('obras que actualmente tienes', [], {}, ON).epocas).toBeUndefined()
    expect(interpretWorkQuery('obras de griegolandia', [], {}, ON).epocas).toBeUndefined()
  })

  it('dos épocas en la misma frase: queda la última mencionada (una sola ranura)', () => {
    expect(interpretWorkQuery('clasicos del siglo de oro', [], {}, ON)).toEqual({ epocas: ['siglo_de_oro'] })
    expect(interpretWorkQuery('barroco o renacentista', [], {}, ON)).toEqual({ epocas: ['renacimiento'] })
  })

  it('la época se acumula con las demás dimensiones', () => {
    expect(interpretWorkQuery('comedias barrocas cortas para pocos actores', [], {}, ON)).toEqual({
      genre: 'comedia',
      epocas: ['barroco'],
      maxDurationMinutes: 60,
      maxCastSize: 4,
    })
  })

  it('continuidad: la época heredada se mantiene si el turno no la menciona y se sustituye si menciona otra', () => {
    expect(interpretWorkQuery('y comedias?', [], { epoca: 'CLASICO' }, ON)).toEqual({ genre: 'comedia', epocas: CLASICO })
    expect(resolveWorkOccupancy('y del barroco?', { epoca: 'SIGLO_DE_ORO', genero: 'COMEDIA' }, ON)).toEqual({
      epoca: 'BARROCO',
      genero: 'COMEDIA',
    })
  })

  it('autoría: "del barroco" o "de los siglos" no son un autor; un autor desconocido sigue declarándose', () => {
    expect(hasUnresolvedAuthor('obras del barroco', interpretWorkQuery('obras del barroco', [], {}, ON), ON)).toBe(false)
    expect(hasUnresolvedAuthor('obras del siglo xvii', interpretWorkQuery('obras del siglo xvii', [], {}, ON), ON)).toBe(false)
    expect(hasUnresolvedAuthor('obras de shakespeare', interpretWorkQuery('obras de shakespeare', [], {}, ON), ON)).toBe(true)
  })
})

describe('interpretWorkQuery — interruptor APAGADO: comportamiento anterior intacto', () => {
  const CONSULTAS = [
    'obras de teatro clasico', 'comedias clasicas', 'obras del siglo de oro', 'teatro barroco', 'neoclasico',
    'comedia romantica', 'teatro contemporaneo', 'obras medievales', 'teatro isabelino', 'tragedia griega',
    'obras de la posguerra', 'comedias cortas', 'obras para pocos actores', 'obras del siglo xx',
    'clasicos del siglo de oro', 'obras que actualmente tienes',
  ]

  it('sin opción y con {epocaHabilitada: false} el resultado es el mismo en todas las funciones', () => {
    for (const q of CONSULTAS) {
      expect(interpretWorkQuery(q, [], {}, OFF), q).toEqual(interpretWorkQuery(q))
      expect(resolveWorkOccupancy(q, {}, OFF), q).toEqual(resolveWorkOccupancy(q))
      const c = interpretWorkQuery(q)
      expect(hasUnresolvedAuthor(q, c, OFF), q).toBe(hasUnresolvedAuthor(q, c))
    }
  })

  it('valores de antes, escritos a mano: clásico es género, contemporáneo es año, las épocas nuevas no existen', () => {
    expect(interpretWorkQuery('obras de teatro clasico')).toEqual({ genre: 'clasico' })
    expect(interpretWorkQuery('comedias clasicas')).toEqual({ genre: 'clasico' })
    expect(interpretWorkQuery('teatro contemporaneo')).toEqual({ yearFrom: 1950 })
    expect(interpretWorkQuery('teatro barroco')).toEqual({})
    expect(interpretWorkQuery('obras del siglo de oro')).toEqual({})
    expect(hasUnresolvedAuthor('obras del siglo de oro', {})).toBe(true)
    // La subcadena sigue funcionando como antes con el interruptor apagado.
    expect(interpretWorkQuery('neoclasico')).toEqual({ genre: 'clasico' })
  })

  it('ninguna salida lleva epocas ni epocaYearFrom', () => {
    for (const q of CONSULTAS) {
      const c = interpretWorkQuery(q)
      expect('epocas' in c, q).toBe(false)
      expect('epocaYearFrom' in c, q).toBe(false)
    }
  })
})

describe('isWorkConceptInSlot — ranura según el interruptor (§6.4)', () => {
  it('CLASICO: género con el interruptor apagado, época con el interruptor encendido', () => {
    expect(isWorkConceptInSlot('genero', 'CLASICO')).toBe(true)
    expect(isWorkConceptInSlot('genero', 'CLASICO', OFF)).toBe(true)
    expect(isWorkConceptInSlot('epoca', 'CLASICO', OFF)).toBe(false)
    expect(isWorkConceptInSlot('epoca', 'CLASICO', ON)).toBe(true)
    expect(isWorkConceptInSlot('genero', 'CLASICO', ON)).toBe(false)
  })

  it('las épocas nuevas solo existen con el interruptor encendido, y solo en la ranura epoca', () => {
    const nuevas: WorkConcept[] = ['GRECOLATINO', 'MEDIEVAL', 'RENACIMIENTO', 'SIGLO_DE_ORO', 'BARROCO', 'ISABELINO', 'NEOCLASICO', 'ROMANTICISMO', 'REALISMO_NATURALISMO', 'VANGUARDIAS', 'POSGUERRA']
    const ranuras: WorkSlot[] = ['genero', 'duracion', 'edad', 'epoca', 'reparto']
    for (const c of nuevas) {
      expect(isWorkConcept(c), c).toBe(true)
      for (const r of ranuras) {
        expect(isWorkConceptInSlot(r, c, OFF), `${r}/${c} apagado`).toBe(false)
        expect(isWorkConceptInSlot(r, c, ON), `${r}/${c} encendido`).toBe(r === 'epoca')
      }
    }
  })

  it('el resto de conceptos conserva su ranura en los dos modos', () => {
    const fijos: [WorkSlot, WorkConcept][] = [
      ['genero', 'COMEDIA'], ['genero', 'MUSICAL'], ['duracion', 'CORTA'], ['duracion', 'LARGA'],
      ['edad', 'INFANTIL'], ['epoca', 'CONTEMPORANEO'], ['reparto', 'POCOS_ACTORES'],
    ]
    for (const [r, c] of fijos) {
      expect(isWorkConceptInSlot(r, c, OFF), c).toBe(true)
      expect(isWorkConceptInSlot(r, c, ON), c).toBe(true)
      expect(isWorkConceptInSlot(r === 'genero' ? 'epoca' : 'genero', c, ON), c).toBe(false)
    }
  })
})
