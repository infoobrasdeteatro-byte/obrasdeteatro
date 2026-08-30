import { describe, it, expect } from 'vitest'
import { interpretWorkQuery, resolveWorkOccupancy } from '@/lib/knowledge-assets'
import {
  emptyConversationState,
  nextConversationState,
  parseConversationState,
  workOccupancyOf,
} from '../index'

const CONVERSACION = 'conv-1'

function turno(previo = emptyConversationState(CONVERSACION), version = 0) {
  return { previo, version }
}

/* ------------------------------------------------------------------ A ---- */

describe('A · estado vacio', () => {
  it('una conversacion que empieza no tiene dominio ni ninguna ranura ocupada', () => {
    const estado = emptyConversationState(CONVERSACION)

    expect(estado.activeDomain).toBeNull()
    expect(estado.occupancyByDomain).toEqual([])
  })

  it('el estado vacio es un estado REAL, no la ausencia de estado', () => {
    // Se representa explicitamente en vez de por un `null` global: quien lo
    // recibe no tiene que interpretar que significa que no haya nada.
    expect(emptyConversationState(CONVERSACION).conversationId).toBe(CONVERSACION)
  })

  it('sin ranuras ocupadas no devuelve criterio de ningun dominio', () => {
    expect(workOccupancyOf(emptyConversationState(CONVERSACION), 'Obras')).toEqual({})
  })
})

/* ------------------------------------------------------------------ C ---- */

describe('C · criterios heredados', () => {
  it('un concepto vigente sobrevive aunque su palabra ya no aparezca en el texto', () => {
    // Es exactamente el turno 5 que se perdio en produccion: el texto
    // disponible ya no contiene "comedia" en ninguna parte.
    const previa = resolveWorkOccupancy('que obras de comedia tienes')
    const ahora = resolveWorkOccupancy('y alguna mas larga', previa)

    expect(previa).toEqual({ genero: 'COMEDIA' })
    expect(ahora.genero).toBe('COMEDIA')
  })

  it('el criterio heredado llega hasta el criterio de busqueda real', () => {
    const previa = resolveWorkOccupancy('que obras de comedia tienes')

    expect(interpretWorkQuery('y alguna mas larga', [], previa)).toEqual({
      genre: 'comedia',
      minDurationMinutes: 90,
    })
  })

  it('SIN herencia, el mismo turno pierde el genero: es la diferencia que introduce la Fase 3', () => {
    expect(interpretWorkQuery('y alguna mas larga')).toEqual({ minDurationMinutes: 90 })
  })

  it('una dimension que el turno no menciona permanece intacta (MANTENER)', () => {
    const previa = { genero: 'COMEDIA', duracion: 'CORTA' } as const

    expect(resolveWorkOccupancy('y de que tratan', previa)).toEqual(previa)
  })
})

/* ------------------------------------------------------------------ D ---- */

describe('D · sustitucion de criterio', () => {
  it('OBLIGATORIO: comedia -> mas corta -> mas larga deja Obras + comedia + larga', () => {
    const t1 = resolveWorkOccupancy('que obras de comedia tienes')
    const t2 = resolveWorkOccupancy('y alguna mas corta', t1)
    const t3 = resolveWorkOccupancy('y alguna mas larga', t2)

    expect(t1).toEqual({ genero: 'COMEDIA' })
    expect(t2).toEqual({ genero: 'COMEDIA', duracion: 'CORTA' })
    expect(t3).toEqual({ genero: 'COMEDIA', duracion: 'LARGA' })
  })

  it('y jamas corta + larga a la vez, en ninguna de las dos formas', () => {
    const t2 = resolveWorkOccupancy('y alguna mas corta', { genero: 'COMEDIA' })
    const t3 = resolveWorkOccupancy('y alguna mas larga', t2)
    const criteria = interpretWorkQuery('y alguna mas larga', [], t2)

    // Una ranura, un ocupante: no hay sitio donde escribir el segundo.
    expect(Object.keys(t3).filter((slot) => slot === 'duracion')).toHaveLength(1)
    expect(criteria.maxDurationMinutes).toBeUndefined()
    expect(criteria.minDurationMinutes).toBe(90)
  })

  it('la sustitucion es simetrica: larga -> corta deja corta', () => {
    const previa = resolveWorkOccupancy('obras largas')

    expect(resolveWorkOccupancy('mejor algo mas breve', previa).duracion).toBe('CORTA')
  })

  it('sustituir una dimension no toca las demas', () => {
    const previa = { genero: 'COMEDIA', duracion: 'CORTA', edad: 'INFANTIL' } as const
    const ahora = resolveWorkOccupancy('y alguna mas larga', previa)

    expect(ahora).toEqual({ genero: 'COMEDIA', duracion: 'LARGA', edad: 'INFANTIL' })
  })
})

/* ------------------------------------------------------------------ E ---- */

describe('E · cambio de dominio', () => {
  it('al activarse otro dominio, los criterios de Obras dejan de ser aplicables', () => {
    const conObras = nextConversationState(emptyConversationState(CONVERSACION), {
      activeDomain: 'Obras',
      workOccupancy: { genero: 'COMEDIA' },
      previousVersion: 0,
      occurredAt: 'T1',
    })

    // El dominio cambia; preguntar por Organizaciones no devuelve nada de Obras.
    expect(workOccupancyOf(conObras, 'Organizaciones')).toEqual({})
    expect(workOccupancyOf(conObras, 'Personas')).toEqual({})
  })

  it('la contaminacion cruzada no se prohibe: no se puede expresar', () => {
    const estado = nextConversationState(emptyConversationState(CONVERSACION), {
      activeDomain: 'Organizaciones',
      workOccupancy: {},
      previousVersion: 0,
      occurredAt: 'T1',
    })

    // No existe ningun sitio donde escribir un criterio de Obras que una
    // busqueda de Organizaciones pueda leer.
    expect(estado.occupancyByDomain.every((entrada) => entrada.domain === 'Obras')).toBe(true)
    expect(workOccupancyOf(estado, 'Organizaciones')).toEqual({})
  })

  it('cambiar de dominio no destruye lo que quedo vigente en el anterior', () => {
    const conObras = nextConversationState(emptyConversationState(CONVERSACION), {
      activeDomain: 'Obras',
      workOccupancy: { genero: 'COMEDIA' },
      previousVersion: 0,
      occurredAt: 'T1',
    })
    const cambiado = nextConversationState(conObras, {
      activeDomain: 'Organizaciones',
      workOccupancy: conObras.occupancyByDomain[0].slots,
      previousVersion: 1,
      occurredAt: 'T2',
    })

    expect(cambiado.activeDomain).toBe('Organizaciones')
    // Inaplicable mientras Organizaciones este activo, recuperable si se vuelve.
    expect(workOccupancyOf(cambiado, 'Obras')).toEqual({ genero: 'COMEDIA' })
  })
})

/* ------------------------------------------------------------------ F ---- */

describe('F · estado invalido — validacion total o descarte total', () => {
  const VALIDO = {
    conversationId: 'abc-123',
    activeDomain: 'Obras',
    occupancyByDomain: [{ domain: 'Obras', slots: { genero: 'COMEDIA' } }],
  }

  it('acepta un estado bien formado', () => {
    expect(parseConversationState(VALIDO)).toEqual(VALIDO)
  })

  it('descarta el estado ENTERO si una sola parte no cumple, nunca lo repara', () => {
    const corrupto = { ...VALIDO, occupancyByDomain: [{ domain: 'Obras', slots: { genero: 'INVENTADO' } }] }

    // El dominio era valido y el conversationId tambien: aun asi se descarta
    // todo. Un criterio fantasma es peor que ningun criterio.
    expect(parseConversationState(corrupto)).toBeNull()
  })

  it('rechaza un dominio que no existe', () => {
    expect(parseConversationState({ ...VALIDO, activeDomain: 'Espacios' })).toBeNull()
  })

  it('rechaza una ranura que no existe', () => {
    expect(
      parseConversationState({ ...VALIDO, occupancyByDomain: [{ domain: 'Obras', slots: { color: 'COMEDIA' } }] })
    ).toBeNull()
  })

  it('rechaza un dominio sin modelo de ranuras', () => {
    expect(
      parseConversationState({ ...VALIDO, occupancyByDomain: [{ domain: 'Personas', slots: {} }] })
    ).toBeNull()
  })

  it('rechaza un conversationId con forma de texto libre', () => {
    expect(parseConversationState({ ...VALIDO, conversationId: 'hola que tal' })).toBeNull()
    expect(parseConversationState({ ...VALIDO, conversationId: '' })).toBeNull()
    expect(parseConversationState({ ...VALIDO, conversationId: 'x'.repeat(65) })).toBeNull()
  })

  it('nunca lanza, sea cual sea la entrada', () => {
    for (const basura of [null, undefined, 42, 'texto', [], true, { conversationId: 1 }]) {
      expect(() => parseConversationState(basura)).not.toThrow()
      expect(parseConversationState(basura)).toBeNull()
    }
  })

  it('un dominio repetido no tiene lectura unica: se descarta', () => {
    expect(
      parseConversationState({
        ...VALIDO,
        occupancyByDomain: [
          { domain: 'Obras', slots: { genero: 'COMEDIA' } },
          { domain: 'Obras', slots: { genero: 'MUSICAL' } },
        ],
      })
    ).toBeNull()
  })

  it('activeDomain null es valido: es el estado real de una conversacion sin dominio', () => {
    expect(parseConversationState({ ...VALIDO, activeDomain: null })).not.toBeNull()
  })
})

/* ------------------------------------------------------------------ H ---- */

describe('H · stateVersion — versionado logico, jamas un cerrojo', () => {
  it('la version la fija el servidor a partir del turno, no del cliente', () => {
    const estado = nextConversationState(emptyConversationState(CONVERSACION), {
      activeDomain: 'Obras',
      workOccupancy: {},
      previousVersion: 4,
      occurredAt: 'T',
    })

    expect(estado.stateVersion).toBe(5)
  })

  it('la version entrante NO se acepta: el contrato de entrada ni siquiera la admite', () => {
    const entrante = parseConversationState({
      conversationId: 'abc',
      activeDomain: null,
      occupancyByDomain: [],
      stateVersion: 9999,
      updatedAt: '2001-01-01',
    })

    expect(entrante).not.toBeNull()
    expect(entrante).not.toHaveProperty('stateVersion')
    expect(entrante).not.toHaveProperty('updatedAt')
  })

  it('DOS PETICIONES SIMULTANEAS producen la misma version: la carrera NO esta resuelta', () => {
    const previo = emptyConversationState(CONVERSACION)
    const a = nextConversationState(previo, { activeDomain: 'Obras', workOccupancy: {}, previousVersion: 7, occurredAt: 'A' })
    const b = nextConversationState(previo, { activeDomain: 'Personas', workOccupancy: {}, previousVersion: 7, occurredAt: 'B' })

    // Sin autoridad en servidor no hay forma de saber cual llego primero ni
    // de rechazar la obsoleta. Queda documentado como comportamiento
    // aceptado, no como un mecanismo de exclusion mutua.
    expect(a.stateVersion).toBe(8)
    expect(b.stateVersion).toBe(8)
    expect(a.activeDomain).not.toBe(b.activeDomain)
  })

  it('el instante procede de quien ejecuta, nunca del cliente', () => {
    const estado = nextConversationState(emptyConversationState(CONVERSACION), {
      activeDomain: null,
      workOccupancy: {},
      previousVersion: 0,
      occurredAt: '2026-08-30T00:00:00.000Z',
    })

    expect(estado.updatedAt).toBe('2026-08-30T00:00:00.000Z')
  })
})

/* ------------------------------------------------------------------ I ---- */

describe('I · conceptos canonicos — el estado nunca transporta valores resueltos', () => {
  it('las ranuras contienen CONCEPTOS, no umbrales', () => {
    const ocupacion = resolveWorkOccupancy('obras de comedia cortas')

    expect(ocupacion).toEqual({ genero: 'COMEDIA', duracion: 'CORTA' })
    // 60 y 90 pertenecen al motor de reglas y no salen de el.
    expect(JSON.stringify(ocupacion)).not.toContain('60')
    expect(JSON.stringify(ocupacion)).not.toContain('90')
  })

  it('un cliente no puede inyectar un umbral: no existe campo donde escribirlo', () => {
    expect(
      parseConversationState({
        conversationId: 'abc',
        activeDomain: 'Obras',
        occupancyByDomain: [{ domain: 'Obras', slots: { duracion: 999999 } }],
      })
    ).toBeNull()

    expect(
      parseConversationState({
        conversationId: 'abc',
        activeDomain: 'Obras',
        occupancyByDomain: [{ domain: 'Obras', slots: { maxDurationMinutes: 'CORTA' } }],
      })
    ).toBeNull()
  })

  it('un estado manipulado solo puede expresar lo que su autor ya podria haber escrito', () => {
    const manipulado = parseConversationState({
      conversationId: 'abc',
      activeDomain: 'Obras',
      occupancyByDomain: [{ domain: 'Obras', slots: { genero: 'MUSICAL' } }],
    })

    // Equivale exactamente a haber pedido musicales. No hay privilegio nuevo.
    expect(interpretWorkQuery('dame algo', [], workOccupancyOf(manipulado, 'Obras'))).toEqual({ genre: 'musical' })
  })

  it('el autor y la ubicacion NO viajan en el estado: nada que revalidar', () => {
    const conAutor = resolveWorkOccupancy('obras de lope de vega cortas')

    // `autor` no es una ranura -- se resuelve contra el catalogo real en cada
    // turno, nunca se hereda, y por tanto un cliente no puede inyectarlo.
    expect(Object.keys(conAutor)).not.toContain('autor')
    expect(Object.keys(conAutor)).not.toContain('ubicacion')
  })
})

/* ---------------------------------------------------------------- extra ---- */

describe('pureza y aislamiento', () => {
  it('nextConversationState no muta el estado anterior', () => {
    const previo = emptyConversationState(CONVERSACION)
    const copia = JSON.stringify(previo)

    nextConversationState(previo, { activeDomain: 'Obras', workOccupancy: { genero: 'COMEDIA' }, previousVersion: 0, occurredAt: 'T' })

    expect(JSON.stringify(previo)).toBe(copia)
  })

  it('conserva el conversationId de la conversacion, sin regenerarlo', () => {
    const { previo } = turno()
    const siguiente = nextConversationState(previo, { activeDomain: null, workOccupancy: {}, previousVersion: 0, occurredAt: 'T' })

    expect(siguiente.conversationId).toBe(CONVERSACION)
  })

  it('es determinista: misma entrada, misma salida', () => {
    const entrada = { activeDomain: 'Obras' as const, workOccupancy: { genero: 'COMEDIA' as const }, previousVersion: 1, occurredAt: 'T' }

    expect(nextConversationState(emptyConversationState(CONVERSACION), entrada)).toEqual(
      nextConversationState(emptyConversationState(CONVERSACION), entrada)
    )
  })
})
