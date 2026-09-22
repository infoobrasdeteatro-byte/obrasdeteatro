/**
 * TRANSPORTE de la respuesta de ScenaIA. No decide nada del turno: recibe
 * la carga ya construida y elige como enviarla.
 *
 * Arreglo D, PR 2: el canal por fragmentos existe, pero todavia no hay
 * fragmentos. Con el interruptor encendido se envia UN solo evento, el
 * final, con exactamente la misma carga que el JSON de siempre. Lo que se
 * valida aqui es el canal -- cabeceras, lectura en el cliente, despliegue
 * --, no un comportamiento nuevo.
 *
 * Apagado, no se ejecuta nada de este modulo: la ruta responde como
 * siempre.
 */

/**
 * Valores que encienden el streaming. Lista CERRADA: cualquier otra cosa
 * -- vacia, ausente, 'si', '0', un error de escritura -- lo deja apagado.
 * Ante la duda, el comportamiento de siempre.
 */
const VALORES_ENCENDIDO = ['1', 'true']

/**
 * Se lee en CADA peticion, nunca al cargar el modulo: asi el interruptor
 * puede cambiarse redesplegando la misma version, sin tocar codigo.
 */
export function streamingActivado(): boolean {
  return VALORES_ENCENDIDO.includes((process.env.SCENAIA_STREAMING ?? '').trim().toLowerCase())
}

/** Eventos que el canal puede emitir. Hoy solo existe el final. */
export type EventoDeRespuesta = 'final'

export function lineaDeEvento(evento: EventoDeRespuesta, datos: unknown): string {
  // NDJSON: un evento por linea. El salto de linea es el separador, de modo
  // que ningun evento puede escribirse sin el.
  return `${JSON.stringify({ event: evento, data: datos })}\n`
}

/**
 * Respuesta por fragmentos con un unico evento.
 *
 * `X-Accel-Buffering: no` y `Cache-Control: no-store` impiden que un
 * intermediario acumule la respuesta y la entregue de golpe, que es
 * exactamente lo que este canal existe para evitar.
 */
export function respuestaNdjson(datosDelEventoFinal: unknown): Response {
  const cuerpo = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(lineaDeEvento('final', datosDelEventoFinal)))
      controller.close()
    },
  })

  return new Response(cuerpo, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
