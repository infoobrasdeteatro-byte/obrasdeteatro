import { describe, it, expect } from 'vitest'
import { leerRespuestaDelTurno } from '../leer-respuesta'

const CARGA = {
  responseType: 'RESPONSE_SUCCESS',
  responseContent: 'Estas son las obras del catalogo.',
  responseWarnings: [],
  responseMetadata: {},
  conversationState: { conversationId: 'c1', activeDomain: 'Obras', occupancyByDomain: [], stateVersion: 1, updatedAt: 'T' },
}

/** Respuesta por fragmentos, troceada tal como llegaria por la red. */
function respuestaNdjson(trozos: readonly string[]): Response {
  const cuerpo = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const trozo of trozos) controller.enqueue(new TextEncoder().encode(trozo))
      controller.close()
    },
  })

  return new Response(cuerpo, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8' } })
}

function eventoFinal(datos: unknown = CARGA): string {
  return `${JSON.stringify({ event: 'final', data: datos })}\n`
}

describe('leerRespuestaDelTurno — negocia por el tipo de contenido', () => {
  it('JSON de siempre: devuelve la carga tal cual', async () => {
    const res = new Response(JSON.stringify(CARGA), { headers: { 'content-type': 'application/json' } })

    expect(await leerRespuestaDelTurno(res)).toEqual(CARGA)
  })

  it('por fragmentos: devuelve la carga del evento final, identica a la del JSON', async () => {
    expect(await leerRespuestaDelTurno(respuestaNdjson([eventoFinal()]))).toEqual(CARGA)
  })

  it('un evento partido entre dos trozos de red se reensambla, no se descarta', async () => {
    const linea = eventoFinal()
    const mitad = Math.floor(linea.length / 2)

    expect(await leerRespuestaDelTurno(respuestaNdjson([linea.slice(0, mitad), linea.slice(mitad)]))).toEqual(CARGA)
  })

  it('una linea ilegible no tumba el turno: se descarta y el final sigue llegando', async () => {
    const res = respuestaNdjson(['{esto no es json}\n', '\n', eventoFinal()])

    expect(await leerRespuestaDelTurno(res)).toEqual(CARGA)
  })

  it('los eventos que no son el final se ignoran (todavia no existen)', async () => {
    const res = respuestaNdjson([`${JSON.stringify({ event: 'chunk', data: 'Estas ' })}\n`, eventoFinal()])

    expect(await leerRespuestaDelTurno(res)).toEqual(CARGA)
  })

  it('sin evento final falla con una causa legible, en vez de devolver una carga vacia', async () => {
    const res = respuestaNdjson([`${JSON.stringify({ event: 'chunk', data: 'a medias' })}\n`])

    await expect(leerRespuestaDelTurno(res)).rejects.toThrow(/sin evento final|evento final/)
  })
})
