/**
 * Lee la respuesta del turno, venga como JSON o por fragmentos.
 *
 * Arreglo D, PR 2. La negociacion es por el TIPO DE CONTENIDO que declara
 * el servidor, nunca por una preferencia del cliente ni por una variable
 * propia: el interruptor vive en el servidor, y esta funcion se limita a
 * reconocer lo que llega. Asi los dos formatos conviven sin que la
 * interfaz tenga que saber cual esta activo.
 *
 * NO DECIDE NADA del turno: no interpreta el contenido, no calcula avisos
 * y no toca el estado conversacional. Devuelve la misma carga en los dos
 * casos, y quien la recibe se comporta igual.
 */

const TIPO_NDJSON = 'application/x-ndjson'

/** Un evento del canal por fragmentos. Hoy el servidor solo emite `final`. */
interface EventoDeRespuesta {
  readonly event: string
  readonly data: unknown
}

function esEvento(valor: unknown): valor is EventoDeRespuesta {
  return typeof valor === 'object' && valor !== null && 'event' in valor && 'data' in valor
}

/**
 * Recorre el cuerpo y devuelve la carga del evento `final`.
 *
 * Las lineas incompletas se guardan hasta que llegue su salto: un fragmento
 * de red puede partir un evento por la mitad, y parsear esa mitad daria un
 * error donde solo hay un corte. Cualquier otra linea se ignora -- hoy no
 * existe, y manana seran los fragmentos de texto, que este PR todavia no
 * muestra.
 */
async function leerNdjson(cuerpo: ReadableStream<Uint8Array>): Promise<unknown> {
  const lector = cuerpo.getReader()
  const decodificador = new TextDecoder()
  let pendiente = ''
  let final: unknown = null

  for (;;) {
    const { value, done } = await lector.read()
    if (done) break

    pendiente += decodificador.decode(value, { stream: true })
    const lineas = pendiente.split('\n')
    pendiente = lineas.pop() ?? ''

    for (const linea of lineas) {
      if (linea.trim() === '') continue
      try {
        const evento: unknown = JSON.parse(linea)
        if (esEvento(evento) && evento.event === 'final') final = evento.data
      } catch {
        // Una linea ilegible no puede tumbar el turno entero: se descarta.
        // Si la ilegible era la final, `final` se queda en null y quien
        // llama lo trata como respuesta sin contenido, igual que hoy.
      }
    }
  }

  // Sin evento final no hay turno que mostrar. Se falla aqui, con una causa
  // legible, en vez de devolver una carga vacia que reventaria mas adelante
  // como si el contenido fuera el problema.
  if (final === null) throw new Error('la respuesta de ScenaIA terminó sin evento final')

  return final
}

export async function leerRespuestaDelTurno(res: Response): Promise<unknown> {
  if (!res.headers.get('content-type')?.includes(TIPO_NDJSON)) return res.json()
  if (res.body === null) throw new Error('la respuesta de ScenaIA llegó sin cuerpo')

  return leerNdjson(res.body)
}
