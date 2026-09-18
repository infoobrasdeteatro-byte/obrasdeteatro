import { recordMetric } from '@/lib/telemetria'
import type { TurnFailure } from './types'

/**
 * P1-C — UN TURNO QUE FALLA TIENE QUE DEJAR RASTRO.
 *
 * Hasta ahora no lo dejaba. El `catch` del Orquestador encadenaba la causa
 * y la relanzaba, pero `recordTurnMetrics` vive DESPUES en el camino feliz
 * y nunca llegaba a ejecutarse: un turno roto era invisible salvo por el
 * 500 en los registros de la plataforma, sin `turnId`, sin causa y sin
 * forma de correlacionarlo con su reserva.
 *
 * DOS CANALES, UN SOLO EVENTO. No son dos registros del mismo hecho por
 * descuido: cada canal admite lo que el otro no puede llevar.
 *
 *   - TELEMETRIA (`recordMetric`, mismo mecanismo ya autorizado en SC-005,
 *     misma tabla, mismo modelo de RLS): lo consultable y correlacionable.
 *     Solo vocabulario cerrado y recuentos, porque el limite de privacidad
 *     de esta capa -- ya congelado en `record-turn-metrics.ts` -- prohibe
 *     que salga por aqui ningun texto libre, y el mensaje de una excepcion
 *     puede arrastrar contenido de la peticion.
 *   - REGISTRO TECNICO (`console.error`, mismo canal que ya usa el
 *     incidente contable de P1.2): el mensaje y la traza, que son lo que
 *     hace falta para diagnosticar y lo unico que no puede persistirse.
 *
 * NO CREA PERSISTENCIA NUEVA: ni tabla, ni migracion, ni via. Se apoya
 * entero en lo que ya existia.
 *
 * NO ANADE NINGUNA VIA DE FALLO: `recordMetric` ya captura lo suyo y
 * devuelve un booleano, y aqui no se introduce ninguna otra. La garantia de
 * que observar un error jamas sustituye al error observado la fija ademas
 * quien invoca -- el Orquestador protege esta llamada --, que es donde
 * corresponde decidirlo.
 */

/** Clase de la excepcion: vocabulario acotado, apto para etiqueta. */
function claseDelError(error: unknown): string {
  if (error instanceof Error) return error.name || error.constructor.name

  // Se puede lanzar cualquier cosa. Lo que no es un Error no tiene clase
  // que registrar, y no se inventa una a partir de su contenido.
  return 'desconocido'
}

/** Mensaje tecnico. Solo para el registro tecnico: jamas para una etiqueta. */
function mensajeDelError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function recordTurnFailure(profileId: string, failure: TurnFailure): Promise<boolean> {
  const clase = claseDelError(failure.error)

  console.error('[P1-C] el turno termino por excepcion', {
    turnId: failure.turnId,
    profileId,
    error: clase,
    message: mensajeDelError(failure.error),
    // La traza es diagnostico puro y se queda AQUI: no viaja a telemetria
    // y no sale nunca en una respuesta HTTP.
    stack: failure.error instanceof Error ? failure.error.stack : null,
    ejecucionesDelTurno: failure.executionCount,
    reservationId: failure.reservationId,
    cierreEconomico: failure.closure,
    occurredAt: new Date().toISOString(),
  })

  /*
   * UNA sola metrica, de la familia `scenaia.*` -- hechos del TURNO --, y
   * nunca de `ai_gateway.*`, reservada a ejecuciones reales del proveedor.
   * Registrar aqui una ejecucion inventaria una llamada que no ocurrio.
   *
   * `requestId` es la misma etiqueta que llevan las demas metricas del
   * turno: es lo que permite reconstruirlo entero desde el fallo.
   */
  return recordMetric(profileId, {
    name: 'scenaia.turn.failed',
    value: 1,
    unit: 'count',
    tags: {
      requestId: failure.turnId,
      errorName: clase,
      // Estado del circuito economico, en el vocabulario de P1.2. Separa el
      // turno que fallo y quedo cerrado del que fallo y ademas no pudo
      // cerrarse -- que es el unico con consumo posiblemente sin registrar.
      closure: failure.closure,
      // Cuantas ejecuciones REALES hubo antes del fallo. Cero es lo normal;
      // distinto de cero es lo que obliga a liquidar.
      executions: String(failure.executionCount),
      reservationId: failure.reservationId ?? 'ninguno',
    },
  })
}
