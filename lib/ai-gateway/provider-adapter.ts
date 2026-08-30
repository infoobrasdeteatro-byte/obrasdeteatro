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
}

/**
 * Contrato que debe implementar cada adaptador de proveedor (Directriz 1:
 * arquitectura agnostica de proveedores -- AI Gateway nunca conoce detalles
 * de un SDK concreto, solo invoca esta interfaz). Nunca lanza excepciones
 * sin normalizar: cualquier fallo del proveedor debe transformarse en un
 * `ProviderAdapterError` antes de propagarse (Directriz 5).
 */
export interface ProviderAdapter {
  readonly providerId: string
  execute(prompt: string): Promise<ProviderExecutionOutcome>
}

/**
 * Error normalizado de un adaptador -- forma unica en la que AI Gateway
 * reconoce un fallo de proveedor, independientemente del SDK de origen.
 */
export class ProviderAdapterError extends Error {}
