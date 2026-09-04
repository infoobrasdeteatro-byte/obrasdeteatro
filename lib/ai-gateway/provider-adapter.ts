/**
 * Resultado normalizado de una ejecucion real de proveedor -- forma interna
 * de ScenaIA, nunca la estructura propia del SDK de ningun proveedor
 * (Directriz 6, Anexo a la Autorizacion de Implementacion IA-OPENAI-001).
 */
export interface ProviderExecutionOutcome {
  readonly content: string
  readonly model: string
  readonly latencyMs: number
  readonly tokensConsumed: number | null
  /**
   * Desglose de consumo, cuando el proveedor lo publica (IA-006).
   *
   * No es un adorno del total: entrada y salida se tarifan a precios
   * distintos -- la salida suele costar varias veces mas que la entrada --,
   * de modo que sin este desglose el coste real no puede calcularse, solo
   * aproximarse. `null` significa "el proveedor no lo aporta", nunca cero:
   * un dato ausente jamas se sustituye por un valor.
   */
  readonly inputTokens: number | null
  readonly outputTokens: number | null
  /**
   * El proveedor detuvo la generacion al alcanzar el techo, en vez de
   * terminar de decir lo que tenia que decir (Bloque 5C).
   *
   * Aqui es `boolean` y no admite ausencia: este contrato solo se
   * construye cuando ha habido una ejecucion real, y de una ejecucion real
   * siempre se sabe como termino. Es el unico dato del resultado que no
   * describe cuanto costo, sino si la respuesta esta COMPLETA -- y hasta
   * ahora se perdia entero: el techo se aplicaba, pero nadie se enteraba
   * de cuando mordia.
   */
  readonly truncated: boolean
  /**
   * Techo de generacion que ESTA ejecucion aplico realmente (F5F-2).
   *
   * Lo declara el adaptador, no quien invoca: es la unica forma de que la
   * telemetria registre un HECHO de ejecucion en vez de repetir una
   * inferencia. Reconstruirlo despues leyendo otra vez la politica diria
   * lo que el sistema pretendia hacer, nunca lo que hizo -- y esa
   * distincion es justamente la que faltaba cuando el Bloque 5E no pudo
   * demostrar los techos con datos reales.
   *
   * Se interpreta junto a `outputTokens`: el par (techo, salida) da el
   * margen que quedaba, y sin el `truncated` es un booleano sin escala.
   *
   * `number | null`: `null` significa que el adaptador no puede
   * declararlo, jamas que no hubiera techo. Un techo desconocido no es
   * cero.
   */
  readonly maxOutputTokens: number | null
}

/**
 * Contrato que debe implementar cada adaptador de proveedor (Directriz 1:
 * arquitectura agnostica de proveedores -- AI Gateway nunca conoce detalles
 * de un SDK concreto, solo invoca esta interfaz). Nunca lanza excepciones
 * sin normalizar: cualquier fallo del proveedor debe transformarse en un
 * `ProviderAdapterError` antes de propagarse (Directriz 5).
 */
/**
 * Lo que un adaptador recibe para ejecutar. Antes recibia una cadena
 * suelta; ahora recibe una peticion con forma propia.
 *
 * El motivo no es de estilo: mientras el contrato fuese `string`, no habia
 * ningun sitio por el que hacer llegar un limite de generacion, y la
 * longitud de la respuesta quedaba enteramente en manos del proveedor.
 * Como la salida se tarifa varias veces mas cara que la entrada, eso era
 * un multiplicador de coste sin techo: una sola peticion podia costar lo
 * que decenas de turnos normales.
 */
export interface ProviderExecutionRequest {
  readonly prompt: string
  /**
   * Techo de generacion, en tokens. Lo decide y lo entrega quien invoca:
   * ningun adaptador puede elegirlo, ampliarlo ni ignorarlo, y ninguno
   * puede traer un valor propio por defecto. Un adaptador que no lo
   * aplique deja de cumplir este contrato.
   */
  readonly maxOutputTokens: number
}

export interface ProviderAdapter {
  readonly providerId: string
  execute(request: ProviderExecutionRequest): Promise<ProviderExecutionOutcome>
}

/**
 * Error normalizado de un adaptador -- forma unica en la que AI Gateway
 * reconoce un fallo de proveedor, independientemente del SDK de origen.
 */
export class ProviderAdapterError extends Error {}
