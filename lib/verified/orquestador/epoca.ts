/**
 * SCENAIA-007 §4.2 (corregido por su adenda) -- la epoca como dimension
 * propia de la obra.
 *
 * El interruptor se lee aqui y en la ruta, y en ningun otro sitio: Knowledge
 * Assets no lee el entorno (invariante de la SCENAIA-004B), asi que el valor
 * viaja como dato hasta el interprete, el Intent Resolver y la validacion del
 * estado. Mismo patron que `paginacion.ts`.
 */

/**
 * Valores que encienden la epoca. Lista CERRADA, mismo criterio que
 * SCENAIA_PAGINACION_ENABLED y SCENAIA_GENERO_SQL_ENABLED: cualquier otra
 * cosa -- vacia, ausente, 'si', '0', un error de escritura -- la deja
 * apagada. Ante la duda, el comportamiento de siempre.
 */
const VALORES_ENCENDIDO = ['1', 'true']

/**
 * Interruptor SCENAIA_EPOCA_ENABLED, apagado por defecto. Se lee en cada
 * peticion, no al cargar el modulo, de modo que puede cambiarse redesplegando
 * la misma version, sin tocar codigo.
 */
export function epocaActivada(): boolean {
  return VALORES_ENCENDIDO.includes((process.env.SCENAIA_EPOCA_ENABLED ?? '').trim().toLowerCase())
}

/** La opcion que se transporta cuando el interruptor esta encendido. */
export interface OpcionEpocaActiva {
  readonly epocaHabilitada: true
}

/**
 * Argumentos que se ANADEN al final de cada llamada de transporte: ninguno
 * con el interruptor apagado -- la llamada queda exactamente como antes --, y
 * `{ epocaHabilitada: true }` con el interruptor encendido.
 */
export function argumentosEpoca(epocaHabilitada: boolean): readonly [] | readonly [OpcionEpocaActiva] {
  return epocaHabilitada ? [{ epocaHabilitada: true }] : []
}
