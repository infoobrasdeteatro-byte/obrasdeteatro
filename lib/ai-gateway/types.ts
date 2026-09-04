import type { DecisionContext, OperationKind } from '@/lib/decision-engine'
import type { AuthorizationContext } from '@/lib/credit-manager'

/**
 * Alcanzables en esta version (todas describen por que NO se ejecuto nada):
 *   - NO_AUTORIZADO: AuthorizationStatus distinto de AUTHORIZED.
 *   - NO_REQUERIDO: DecisionContext.needsAI es false (guarda defensiva).
 *   - SIN_PROVEEDOR: sin integracion tecnica real de proveedores (IA-006).
 *
 * Reservados para una futura integracion real, ningun codigo de esta
 * version los produce todavia:
 *   - EJECUTADO: la llamada al proveedor se completo con exito.
 *   - ERROR_COMUNICACION: timeout o fallo de comunicacion con el proveedor.
 * (mismo tratamiento ya validado para ProfessionalContextLevel.FULL en PCE:
 * valor reconocido por el tipo, no alcanzable hoy, documentado como tal.)
 */
export type ExecutionStatus = 'EJECUTADO' | 'ERROR_COMUNICACION' | 'NO_AUTORIZADO' | 'NO_REQUERIDO' | 'SIN_PROVEEDOR'

/**
 * POLITICA DE TECHO DE GENERACION, por operacion (Bloque 1, diferenciada en
 * el Bloque 5D). Fuente unica: ninguna otra cifra de techo existe en el
 * repositorio.
 *
 * Vive aqui -- en el contrato del Gateway, no dentro de un adaptador -- para
 * que sea visible, comprobable y unica. Un valor escondido en la
 * integracion de un proveedor seria una politica de coste disfrazada de
 * detalle tecnico, y dejaria de aplicarse en cuanto se registrase un
 * segundo proveedor.
 *
 * Por que deja de ser un numero unico: la salida se tarifa varias veces mas
 * cara que la entrada y domina el coste maximo de un turno, de modo que un
 * techo uniforme obliga a reservar por la operacion mas cara aunque se
 * ejecute la mas barata. Con cuotas pequenas eso agota el cupo sin haber
 * gastado nada -- medido: el plan gratuito daba 3 turnos de los 5 que
 * promete.
 *
 * TEXT_STANDARD = 512. La salida observada en produccion va de 76 a 280
 * tokens (n=7, telemetria real). 512 es 1,83 veces el maximo observado.
 * NO es una prediccion estadistica -- con esa muestra no la habria --, sino
 * una decision de producto: la respuesta mas larga que ScenaIA puede dar.
 * El techo lo impone el proveedor, no lo estima nadie, asi que bajarlo
 * reduce a la vez la reserva y el peor caso, sin perder proteccion.
 *
 * RESOLVER = 1024. NO se reduce. Su salida esta acotada por construccion
 * -- lineas `termino :: fragmento` sobre un vocabulario cerrado de 27
 * terminos, con anclajes de 6 palabras como maximo --, pero esa cota
 * estructural vale entre 494 y 710 tokens segun la longitud de palabra:
 * cualquier techo menor truncaria el peor caso permitido. Con 27 terminos
 * y anclaje de 6 palabras, 256 solo cubriria 14 de ellos.
 *
 * Anadir una operacion (WEB, WEB_AI, MODEL_PREMIUM) es anadir una entrada
 * aqui. `Record<OperationKind, number>` lo hace obligatorio: una operacion
 * nueva sin techo declarado no compila, de modo que nadie puede heredar en
 * silencio un techo pensado para otra cosa. Ningun adaptador se toca.
 */
export const MAX_OUTPUT_TOKENS_BY_OPERATION: Readonly<Record<OperationKind, number>> = {
  TEXT_STANDARD: 512,
  RESOLVER: 1024,
}

/**
 * Unica via de lectura de la politica. Existe para que nadie se quede con
 * una copia del numero: quien necesite un techo pregunta por la operacion,
 * no por la cifra.
 */
export function maxOutputTokensFor(operation: OperationKind): number {
  return MAX_OUTPUT_TOKENS_BY_OPERATION[operation]
}

/**
 * Aviso que emite el Gateway cuando el proveedor corto la generacion.
 *
 * Se declara como constante, y no como una cadena suelta en el punto de
 * uso, porque es una SEÑAL: viaja por `executionWarnings` hasta Response
 * Composer, que la convierte en `RESPONSE_PARTIAL`. Quien la compruebe
 * debe poder referirse a ella sin copiar su texto -- comparar frases
 * sueltas es exactamente la convencion implicita que PRD-001 prohibe.
 */
export const TRUNCATION_WARNING =
  'respuesta incompleta: el proveedor detuvo la generacion al alcanzar el techo de salida (finish_reason=length)'

export interface AIExecutionResult {
  readonly executionStatus: ExecutionStatus
  readonly generatedContent: string | null
  readonly executionWarnings: string[]
  readonly executionTimestamp: string
}

/**
 * Se produce siempre, en paralelo a AIExecutionResult -- incluso cuando no
 * hay ejecucion real (toda esta version). Los campos tecnicos son `null`
 * cuando no aplican, nunca se omiten ni se sustituyen por un valor
 * inventado. Fuera del flujo funcional (SC-004.7): no lo consume Response
 * Composer, no se muestra al usuario. AI Gateway lo produce y lo devuelve
 * como valor -- no lo entrega activamente a ningun consumidor (IA-007: la
 * responsabilidad de iniciar la liquidacion de Accounting Engine a partir
 * de este objeto no esta asignada a AI Gateway ni a ningun componente).
 */
export interface ExecutionAudit {
  readonly providerIdentifier: string | null
  readonly providerModel: string | null
  readonly executionLatencyMs: number | null
  readonly tokensConsumed: number | null
  /** Desglose publicado por el proveedor (IA-006); `null` si no lo aporta. */
  readonly inputTokens: number | null
  readonly outputTokens: number | null
  /**
   * Coste real de la ejecucion, cuando el propio proveedor lo comunica.
   * Sigue siendo `null` con OpenAI, que no lo devuelve: su coste se deriva
   * de los tokens y de la tarifa del catalogo, y esa tarificacion NO ocurre
   * aqui -- AI Gateway "invoca, nunca selecciona" y no conoce el catalogo
   * (invariante de Direccion, cierre de IA-006).
   *
   * `null` significa "no determinado", jamas "cero".
   */
  readonly realExecutionCost: number | null
  /**
   * Si la generacion se detuvo al alcanzar el techo (Bloque 5C).
   *
   * TRES estados reales, no dos (PRD-001):
   *   true  -- hubo ejecucion y la respuesta quedo cortada.
   *   false -- hubo ejecucion y termino por si sola.
   *   null  -- NO hubo ejecucion (no autorizada, sin proveedor, error de
   *            comunicacion). Preguntar si se trunco no tiene sentido, y
   *            responder `false` afirmaria que una respuesta que no existe
   *            esta completa.
   *
   * Mismo criterio ya congelado para el resto de este audit: un dato
   * ausente jamas se sustituye por un valor.
   */
  readonly truncated: boolean | null
  /**
   * Techo de generacion aplicado por la ejecucion (F5F-2).
   *
   * Llega del `ProviderExecutionOutcome` y NO se recalcula: la politica ya
   * se aplico antes de llamar al proveedor, y volver a consultarla aqui
   * convertiria un hecho observado en una deduccion.
   *
   * `null` cuando no hubo ejecucion, o cuando el adaptador no puede
   * declararlo. Nunca cero.
   */
  readonly maxOutputTokens: number | null
  readonly technicalMetadata: string | null
}

/**
 * Ampliacion controlada del contrato de entrada (Aprobacion de Direccion,
 * IA-OPENAI-002, 2026-07-23). Construido exclusivamente por el Orquestador,
 * reutilizando el `NormalizedRequest` ya existente en su ambito local --
 * ningun objeto intermedio del Nucleo lo transporta ni lo modifica.
 * Completamente agnostico de proveedor: ningun identificador de proveedor,
 * modelo, SDK ni estructura especifica de ningun proveedor concreto.
 */
export interface NormalizedAIRequest {
  readonly userPrompt: string
  /**
   * QUE operacion es esta, no cuanto puede generar. Quien invoca conoce el
   * tipo de trabajo -- traducir vocabulario o redactar una respuesta -- y
   * es lo unico que aporta; el techo lo resuelve el Gateway contra su
   * propia politica.
   *
   * Obligatorio, ni opcional ni anulable: una operacion sin identificar
   * tendria que caer en un techo por defecto, y un techo por defecto es
   * exactamente como una operacion cara acaba reservando como una barata.
   */
  readonly operationKind: OperationKind
}

/**
 * Unico parametro de entrada de `executeAIRequest()` (Aprobacion de
 * Direccion, IA-OPENAI-002). `decisionContext` y `authorizationContext`
 * mantienen exactamente su semantica ya congelada -- esta ampliacion no la
 * modifica, solo agrupa las tres entradas en un unico objeto.
 */
export interface AIExecutionInput {
  readonly decisionContext: DecisionContext
  readonly authorizationContext: AuthorizationContext
  readonly normalizedAIRequest: NormalizedAIRequest
}
