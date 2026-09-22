import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { streamingActivado, lineaDeEvento, respuestaNdjson } from '../ndjson'

const VALOR_ORIGINAL = process.env.SCENAIA_STREAMING

beforeEach(() => {
  delete process.env.SCENAIA_STREAMING
})

afterEach(() => {
  if (VALOR_ORIGINAL === undefined) delete process.env.SCENAIA_STREAMING
  else process.env.SCENAIA_STREAMING = VALOR_ORIGINAL
})

describe('streamingActivado — el interruptor', () => {
  it('APAGADO por defecto: sin variable, no se activa', () => {
    expect(streamingActivado()).toBe(false)
  })

  it('solo lo encienden los valores declarados', () => {
    for (const valor of ['1', 'true', 'TRUE', ' true ']) {
      process.env.SCENAIA_STREAMING = valor
      expect(streamingActivado(), valor).toBe(true)
    }
  })

  it('ante la duda, apagado: cualquier otro valor deja el comportamiento de siempre', () => {
    for (const valor of ['', '   ', '0', 'false', 'si', 'yes', 'on', 'ndjson']) {
      process.env.SCENAIA_STREAMING = valor
      expect(streamingActivado(), valor).toBe(false)
    }
  })

  it('se lee en cada llamada: cambiarla surte efecto sin recargar el modulo', () => {
    expect(streamingActivado()).toBe(false)
    process.env.SCENAIA_STREAMING = '1'
    expect(streamingActivado()).toBe(true)
    process.env.SCENAIA_STREAMING = '0'
    expect(streamingActivado()).toBe(false)
  })
})

describe('lineaDeEvento — un evento por linea', () => {
  it('termina SIEMPRE en salto de linea: es el separador del formato', () => {
    const linea = lineaDeEvento('final', { a: 1 })

    expect(linea.endsWith('\n')).toBe(true)
    expect(linea.trim().includes('\n')).toBe(false)
  })

  it('envuelve la carga sin tocarla', () => {
    const carga = { responseType: 'RESPONSE_SUCCESS', responseContent: 'hola', conversationState: { conversationId: 'c1' } }

    expect(JSON.parse(lineaDeEvento('final', carga))).toEqual({ event: 'final', data: carga })
  })
})

describe('respuestaNdjson — el canal', () => {
  const CARGA = { responseType: 'RESPONSE_SUCCESS', responseContent: 'hola' }

  it('declara el tipo de contenido por fragmentos y prohibe acumularla', async () => {
    const res = respuestaNdjson(CARGA)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/x-ndjson; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    // Sin esto, un intermediario puede juntar los fragmentos y entregarlos
    // de golpe, que es justo lo que este canal existe para evitar.
    expect(res.headers.get('x-accel-buffering')).toBe('no')
  })

  it('emite UN solo evento, el final, con la carga intacta', async () => {
    const texto = await respuestaNdjson(CARGA).text()
    const lineas = texto.split('\n').filter((linea) => linea !== '')

    expect(lineas).toHaveLength(1)
    expect(JSON.parse(lineas[0])).toEqual({ event: 'final', data: CARGA })
  })
})
