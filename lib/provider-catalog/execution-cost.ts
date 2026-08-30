import { AI_PROVIDER_CATALOG } from './catalog'
import type { ProviderCatalogEntry, ProviderModelRate } from './types'

/**
 * Consumo real de una ejecucion, tal como lo publica el proveedor. Forma
 * minima e independiente de cualquier SDK: este modulo no conoce OpenAI,
 * Gemini ni ningun otro -- solo tokens, modelo y proveedor.
 */
export interface ExecutionUsage {
  readonly providerId: string
  readonly model: string
  readonly inputTokens: number | null
  readonly outputTokens: number | null
}

/** Coste monetario de una ejecucion, con la moneda en la que se expresa. */
export interface ExecutionCost {
  readonly amount: number
  readonly currency: string
}

/** Tarifa declarada para un modelo concreto, o `null` si el catalogo no la tiene. */
export function findModelRate(
  providerId: string,
  model: string,
  catalog: readonly ProviderCatalogEntry[] = AI_PROVIDER_CATALOG
): ProviderModelRate | null {
  const proveedor = catalog.find((entry) => entry.id === providerId)

  return proveedor?.rates?.find((rate) => rate.model === model) ?? null
}

const TOKENS_POR_UNIDAD_DE_TARIFA = 1_000_000

/**
 * Coste monetario real de una ejecucion (IA-006).
 *
 * Funcion pura: no consulta red, ni persistencia, ni variables de entorno.
 * Recibe lo que el proveedor publico y la tarifa que el catalogo declara, y
 * multiplica. Nada mas.
 *
 * DEVUELVE `null` -- y esto es lo importante -- en cuanto falta cualquier
 * pieza para calcularlo de verdad:
 *
 *   · el catalogo no declara tarifa para ese proveedor/modelo;
 *   · el proveedor no publico el desglose de tokens.
 *
 * `null` significa "no se puede determinar el coste", y jamas debe leerse
 * como "coste cero": son cosas opuestas. Una ejecucion real que costo dinero
 * no puede quedar contabilizada a cero por haber perdido el dato -- por eso
 * quien consume esta funcion aplica el comportamiento seguro ya definido
 * (liquidar con el importe reservado) en vez de dar por buena una cifra
 * inexistente.
 *
 * PRECISION: los precios se declaran por millon de tokens, que es como los
 * publican los proveedores. La division se hace UNA sola vez, al final, y no
 * se redondea: redondear aqui acumularia error en cada ejecucion. Cuando el
 * importe llegue a la contabilidad, PostgreSQL lo almacena en `numeric`, que
 * es exacto; el redondeo, si alguna vez hace falta, corresponde al momento
 * de presentarlo, nunca al de calcularlo.
 */
export function calculateExecutionCost(
  usage: ExecutionUsage,
  catalog: readonly ProviderCatalogEntry[] = AI_PROVIDER_CATALOG
): ExecutionCost | null {
  const rate = findModelRate(usage.providerId, usage.model, catalog)
  if (rate === null) return null

  // Sin desglose no hay coste: entrada y salida valen precios distintos, y
  // repartir el total a ojo seria inventarse la proporcion.
  if (usage.inputTokens === null || usage.outputTokens === null) return null

  const coste =
    (usage.inputTokens * rate.inputPricePerMillionTokens + usage.outputTokens * rate.outputPricePerMillionTokens) /
    TOKENS_POR_UNIDAD_DE_TARIFA

  return { amount: coste, currency: rate.currency }
}
