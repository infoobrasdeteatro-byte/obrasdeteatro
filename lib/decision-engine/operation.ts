import { AI_PROVIDER_CATALOG } from '@/lib/provider-catalog'
import type { ProviderCatalogEntry, ProviderModelRate } from '@/lib/provider-catalog'

/**
 * OPERACIONES ECONOMICAS (Bloque 4).
 *
 * Un turno no es una unidad de coste: es una secuencia de operaciones que
 * cuestan cosas muy distintas. Hasta ahora todas reservaban lo mismo -- un
 * credito fijo -- y por eso el sistema no podia distinguir un turno de
 * texto de una llamada al resolutor, ni podra distinguir manana una
 * busqueda web de un turno normal si no aprende a hacerlo hoy.
 *
 * Solo se declaran las operaciones que EXISTEN. Anadir aqui web, modelo
 * superior o herramientas externas antes de que el sistema pueda
 * ejecutarlas representaria estados que ningun dominio respalda todavia
 * (Principio de Madurez de la Abstraccion, ADR SCENAIA-002C.1); y un
 * catalogo de operaciones ficticias induciria a estimar costes que nadie
 * va a incurrir.
 */
export type OperationKind = 'TEXT_STANDARD' | 'RESOLVER'

/**
 * Forma minima del valor del credito. Se declara aqui en lugar de
 * importarla de Accounting Engine porque el invariante de este componente
 * prohibe esa dependencia -- y con razon: Decision Engine no debe conocer
 * la contabilidad. Mismo criterio, y mismo precedente, que
 * `ExecutionAuditForSettlement` en Accounting Engine, que declara su propia
 * forma para no atarse al contrato de AI Gateway.
 */
export interface CreditUnit {
  readonly amountPerCredit: number
  readonly currency: string
}

/** Lo que se sabe de una operacion ANTES de ejecutarla. */
export interface OperationInput {
  readonly kind: OperationKind
  /** Longitud real del texto que se enviara. */
  readonly promptCharacters: number
  /** Techo de generacion autorizado (Bloque 1). Lo aporta quien invoca. */
  readonly maxOutputTokens: number
}

/**
 * Coste MAXIMO PLAUSIBLE de una operacion. No es una prediccion: es la cota
 * superior que hay que apartar antes de ejecutar. Sobrestimar es seguro --
 * el sobrante vuelve al liquidar --; subestimar no lo es, porque el gasto
 * ya habria ocurrido cuando se descubriera.
 */
export interface OperationEstimate {
  readonly kind: OperationKind
  readonly estimatedInputTokens: number
  readonly estimatedOutputTokens: number
  readonly estimatedProviderCostUsd: number | null
  readonly estimatedCredits: number | null
}

/**
 * Caracteres por token, a la baja deliberadamente.
 *
 * El castellano ronda los 4 caracteres por token; dividir entre 3 produce
 * un recuento MAYOR que el real. Es intencionado: sin un tokenizador -- que
 * seria una dependencia nueva -- la unica forma honesta de acotar por
 * arriba es contar de mas. La diferencia se devuelve integra al liquidar
 * con el consumo real.
 */
const CARACTERES_POR_TOKEN = 3

/**
 * Tarifa mas cara declarada para un proveedor.
 *
 * El modelo concreto lo resuelve el adaptador en tiempo de ejecucion --
 * puede venir de configuracion -- y este componente no puede conocerlo sin
 * romper su frontera. Estimar contra la tarifa mas cara del proveedor es
 * exactamente "coste maximo plausible": con un solo modelo declarado
 * coincide con el real, y con varios protege del peor caso en lugar de
 * apostar por el mas barato.
 */
function tarifaMasCara(providerId: string, catalog: readonly ProviderCatalogEntry[]): ProviderModelRate | null {
  const tarifas = catalog.find((entry) => entry.id === providerId)?.rates ?? []
  if (tarifas.length === 0) return null

  return tarifas.reduce((masCara, tarifa) =>
    tarifa.inputPricePerMillionTokens + tarifa.outputPricePerMillionTokens >
    masCara.inputPricePerMillionTokens + masCara.outputPricePerMillionTokens
      ? tarifa
      : masCara
  )
}

const TOKENS_POR_UNIDAD_DE_TARIFA = 1_000_000

/**
 * Estima el coste maximo de una operacion.
 *
 *   entrada = caracteres del prompt / CARACTERES_POR_TOKEN   (cota superior)
 *   salida  = techo autorizado, nunca una prediccion
 *   coste   = (entrada x precio_entrada + salida x precio_salida) / 1.000.000
 *   creditos = coste / X
 *
 * La salida se estima SIEMPRE al techo autorizado, no a lo que se espera
 * que el modelo genere. Estimar la salida esperada dejaria sin cubrir
 * precisamente el caso que el techo existe para acotar.
 *
 * Devuelve `null` en coste y creditos -- nunca cero -- cuando falta la
 * tarifa o el valor del credito: no poder calcular un coste no es que la
 * operacion sea gratis. Quien recibe el estimate decide entonces que hacer,
 * igual que ya ocurre en la liquidacion.
 *
 * Funcion pura y sincrona: sin I/O, sin red, sin reloj.
 */
export function estimateOperation(
  operation: OperationInput,
  providerId: string | null,
  creditValue: CreditUnit | null,
  catalog: readonly ProviderCatalogEntry[] = AI_PROVIDER_CATALOG
): OperationEstimate {
  const estimatedInputTokens = Math.ceil(Math.max(operation.promptCharacters, 0) / CARACTERES_POR_TOKEN)
  const estimatedOutputTokens = Math.max(operation.maxOutputTokens, 0)

  const rate = providerId === null ? null : tarifaMasCara(providerId, catalog)
  if (rate === null) {
    return { kind: operation.kind, estimatedInputTokens, estimatedOutputTokens, estimatedProviderCostUsd: null, estimatedCredits: null }
  }

  const estimatedProviderCostUsd =
    (estimatedInputTokens * rate.inputPricePerMillionTokens + estimatedOutputTokens * rate.outputPricePerMillionTokens) /
    TOKENS_POR_UNIDAD_DE_TARIFA

  // Misma regla que la liquidacion: sin valor de credito, o con monedas
  // distintas, no hay conversion posible. Convertir a ojo seria inventarse
  // un tipo de cambio que nadie ha autorizado.
  const estimatedCredits =
    creditValue === null || creditValue.amountPerCredit <= 0 || creditValue.currency !== rate.currency
      ? null
      : estimatedProviderCostUsd / creditValue.amountPerCredit

  return { kind: operation.kind, estimatedInputTokens, estimatedOutputTokens, estimatedProviderCostUsd, estimatedCredits }
}
