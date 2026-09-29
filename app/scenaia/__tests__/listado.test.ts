import { describe, it, expect } from 'vitest'
import {
  conMiles,
  textoDelPie,
  hayMasObras,
  esUltimaRespuesta,
  historialEnviable,
  cuerpoDelTurno,
} from '../listado'
import type { PaginaDelListado, TurnoDelChat } from '../listado'

/** SCENAIA-004B §4.8 y §4.9 -- lógica de la paginación en el chat. */

const pag = (from: number, to: number, total: number | null, nextOffset: number | null): PaginaDelListado => ({ from, to, total, nextOffset })

describe('textoDelPie', () => {
  it('con total numérico: "Mostrando 1-10 de N"', () => {
    expect(textoDelPie(pag(1, 10, 11, 10))).toBe('Mostrando 1-10 de 11')
  })

  it('una sola obra en la página: "Mostrando 11 de 11"', () => {
    expect(textoDelPie(pag(11, 11, 11, null))).toBe('Mostrando 11 de 11')
  })

  it('con total null: "Mostrando 1-10", sin cifra total', () => {
    expect(textoDelPie(pag(1, 10, null, 10))).toBe('Mostrando 1-10')
    expect(textoDelPie(pag(21, 27, null, null))).toBe('Mostrando 21-27')
    expect(textoDelPie(pag(1, 10, null, 10))).not.toMatch(/ de /)
  })

  it('una sola obra con total null: "Mostrando 21"', () => {
    expect(textoDelPie(pag(21, 21, null, null))).toBe('Mostrando 21')
  })

  it('página vacía (to < from): "No hay más obras en este listado"', () => {
    expect(textoDelPie(pag(21, 20, 11, null))).toBe('No hay más obras en este listado')
    expect(textoDelPie(pag(21, 20, null, null))).toBe('No hay más obras en este listado')
  })

  it('primera página vacía con total 0: "Ninguna obra coincide con esta búsqueda"', () => {
    expect(textoDelPie(pag(1, 0, 0, null))).toBe('Ninguna obra coincide con esta búsqueda')
  })

  it('primera página vacía con total null: el mismo texto (se decide por from, no por total)', () => {
    expect(textoDelPie(pag(1, 0, null, null))).toBe('Ninguna obra coincide con esta búsqueda')
  })

  it('cualquier página siguiente vacía, incluida la segunda (from 2), conserva "No hay más obras en este listado"', () => {
    expect(textoDelPie(pag(2, 1, 1, null))).toBe('No hay más obras en este listado')
    expect(textoDelPie(pag(50_001, 50_000, 11, null))).toBe('No hay más obras en este listado')
  })

  it('con separador de miles', () => {
    expect(textoDelPie(pag(1, 10, 5000, 10))).toBe('Mostrando 1-10 de 5.000')
    expect(textoDelPie(pag(4991, 5000, 5000, null))).toBe('Mostrando 4.991-5.000 de 5.000')
    expect(textoDelPie(pag(49991, 50000, 1234567, 50000))).toBe('Mostrando 49.991-50.000 de 1.234.567')
    expect(conMiles(999)).toBe('999')
    expect(conMiles(1000)).toBe('1.000')
  })
})

describe('hayMasObras', () => {
  it('solo si el servidor ofrece página siguiente y esta no está vacía', () => {
    expect(hayMasObras(pag(1, 10, 11, 10))).toBe(true)
    expect(hayMasObras(pag(11, 11, 11, null))).toBe(false)
    expect(hayMasObras(pag(21, 20, 11, null))).toBe(false)
    // Defensivo: una página vacía nunca ofrece "Ver más", aunque llegara un nextOffset.
    expect(hayMasObras(pag(21, 20, 11, 30))).toBe(false)
  })
})

describe('esUltimaRespuesta', () => {
  const turnos: TurnoDelChat[] = [
    { role: 'user', content: 'dame la lista de obras' },
    { role: 'assistant', content: 'página 1' },
    { role: 'user', content: 'otra pregunta' },
    { role: 'assistant', content: 'respuesta' },
  ]

  it('solo la última respuesta del chat', () => {
    expect(esUltimaRespuesta(3, turnos)).toBe(true)
    expect(esUltimaRespuesta(1, turnos)).toBe(false)
  })

  it('nunca un mensaje del usuario, aunque sea el último', () => {
    expect(esUltimaRespuesta(2, turnos.slice(0, 3))).toBe(false)
  })
})

describe('historialEnviable', () => {
  it('sin listados, sale idéntico al de siempre (mismas claves, mismo JSON)', () => {
    const turnos: TurnoDelChat[] = [
      { role: 'user', content: 'hola' },
      { role: 'assistant', content: 'buenas', notice: null },
      { role: 'assistant', content: 'otra', notice: { kind: 'error', text: 'x' } },
    ]

    expect(JSON.stringify(historialEnviable(turnos))).toBe(JSON.stringify(turnos))
  })

  it('las páginas de continuación no se envían, y los campos de la interfaz se quitan', () => {
    const turnos: TurnoDelChat[] = [
      { role: 'user', content: 'dame la lista de obras' },
      { role: 'assistant', content: 'página 1', notice: null, listingPage: pag(1, 10, 25, 10), listingRequest: 'dame la lista de obras' },
      { role: 'assistant', content: 'página 2', notice: null, listingPage: pag(11, 20, 25, 20), listingRequest: 'dame la lista de obras', esContinuacion: true },
      { role: 'assistant', content: 'página 3', notice: null, listingPage: pag(21, 25, 25, null), listingRequest: 'dame la lista de obras', esContinuacion: true },
    ]

    expect(historialEnviable(turnos)).toEqual([
      { role: 'user', content: 'dame la lista de obras' },
      { role: 'assistant', content: 'página 1', notice: null },
    ])
  })
})

describe('cuerpoDelTurno', () => {
  it('sin continuación, el cuerpo es byte a byte el de siempre', () => {
    const historial = [{ role: 'user', content: 'hola' }]
    const estado = { conversationId: 'c1' }

    expect(JSON.stringify(cuerpoDelTurno('¿y comedias?', historial, estado))).toBe(
      JSON.stringify({ message: '¿y comedias?', history: historial, conversationState: estado, route: '/scenaia', module: 'centro-profesional' })
    )
    expect(JSON.stringify(cuerpoDelTurno('hola', [], null, null))).not.toMatch(/continuation/)
  })

  it('con continuación: el mismo mensaje del listado y el offset que envió el servidor', () => {
    const cuerpo = cuerpoDelTurno('dame la lista de obras', [], null, { offset: 20 })

    expect(cuerpo.message).toBe('dame la lista de obras')
    expect(cuerpo).toMatchObject({ continuation: { offset: 20 } })
  })
})

describe('recorrido del cliente con "Ver más" (mismas funciones que usa ScenaiaClient)', () => {
  it('la continuación reenvía el mismo mensaje con nextOffset, sin mensaje del usuario ni páginas en el historial', () => {
    const LISTADO = 'dame la lista de obras'
    // Turno 1: el usuario pide el listado y llega la página 1.
    let turnos: TurnoDelChat[] = [
      { role: 'user', content: LISTADO },
      { role: 'assistant', content: 'página 1', notice: null, listingPage: pag(1, 10, 25, 10), listingRequest: LISTADO },
    ]

    // "Ver más" sobre la última respuesta: mismo texto, offset del servidor.
    const ultima = turnos[turnos.length - 1]
    expect(esUltimaRespuesta(turnos.length - 1, turnos)).toBe(true)
    const cuerpo1 = cuerpoDelTurno(ultima.listingRequest!, historialEnviable(turnos), null, { offset: ultima.listingPage!.nextOffset! })
    expect(cuerpo1).toMatchObject({ message: LISTADO, continuation: { offset: 10 } })
    expect(cuerpo1.history).toEqual([{ role: 'user', content: LISTADO }, { role: 'assistant', content: 'página 1', notice: null }])

    // Llega la página 2: se añade SOLO la respuesta, marcada como continuación.
    turnos = [...turnos, { role: 'assistant', content: 'página 2', notice: null, listingPage: pag(11, 20, 25, 20), listingRequest: LISTADO, esContinuacion: true }]
    expect(turnos.filter((t) => t.role === 'user')).toHaveLength(1)

    // Segundo "Ver más": sigue siendo el mismo mensaje, con el nuevo offset.
    const cuerpo2 = cuerpoDelTurno(turnos[2].listingRequest!, historialEnviable(turnos), null, { offset: turnos[2].listingPage!.nextOffset! })
    expect(cuerpo2).toMatchObject({ message: LISTADO, continuation: { offset: 20 } })
    expect(JSON.stringify(cuerpo2.history)).not.toMatch(/página 2|listingPage|esContinuacion|listingRequest/)

    // Una pregunta nueva después: el historial tampoco lleva la página 2.
    turnos = [...turnos, { role: 'user', content: '¿y comedias?' }]
    const cuerpo3 = cuerpoDelTurno('¿y comedias?', historialEnviable(turnos.slice(0, -1)), null)
    expect(cuerpo3.history).toHaveLength(2)
    expect('continuation' in cuerpo3).toBe(false)
  })
})
