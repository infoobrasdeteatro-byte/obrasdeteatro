import { calculateExecutionCost, AI_PROVIDER_CATALOG } from '@/lib/provider-catalog'
import type { ExecutionCost, ProviderCatalogEntry } from '@/lib/provider-catalog'

/**
 * UNIDAD ECONOMICA INTERNA DE SCENAIA (Decision de Direccion, IA-006.2).
 *
 *     1 credito ScenaIA = X unidades monetarias de capacidad de IA
 *
 * Es una unidad de CAPACIDAD ECONOMICA, no un contador de peticiones ni de
 * tokens. Esa eleccion tiene una consecuencia buscada: cambiar de proveedor
 * o de modelo altera el coste real de una ejecucion, pero NO altera el
 * significado de un credito. El plan del usuario expresa capacidad; quien
 * la sirve es indiferente.
 *
 * Lo que esta unidad NO es -- y no puede llegar a ser por descuido:
 *
 *   · 1 pregunta = 1 credito   -- ligaria el plan al numero de mensajes y
 *                                 no a lo que realmente cuestan;
 *   · 1 token = 1 credito      -- ligaria el plan al proveedor, que es
 *                                 justo lo que la arquitectura evita.
 *
 * CUATRO MAGNITUDES DISTINTAS, que este modulo mantiene separadas:
 *
 *   1. COSTE REAL DEL PROVEEDOR   moneda · lo que cuesta la ejecucion
 *   2. CREDITO SCENAIA            unidad interna · capacidad normalizada
 *   3. PRESUPUESTO DEL PLAN       creditos disponibles en el periodo
 *   4. PRECIO COMERCIAL           lo que el usuario paga por su plan
 *
 * La 4 nunca se convierte directamente en la 1: lo que alguien paga por su
 * suscripcion no es credito de proveedor. La conversion que este modulo
 * implementa es exclusivamente 1 -> 2.
 */

/**
 * Valor monetario de un credito ScenaIA. **Configuracion pendiente.**
 *
 * `null` significa que Direccion todavia no ha fijado X. No es un valor por
 * defecto ni un marcador temporal: mientras siga en `null`, ninguna
 * ejecucion puede expresarse en creditos, y el circuito economico aplica el
 * comportamiento seguro ya definido (liquidar con el importe reservado).
 *
 * Fijarlo aqui "provisionalmente" seria decidir de facto cuanta capacidad
 * cabe en cada plan -- una decision comercial disfrazada de constante
 * tecnica. Ya ocurrio una vez en este proyecto: Direccion rechazo una
 * heuristica de coste (`baja->1, media->2, alta->3`) precisamente por estar
 * "correctamente etiquetada como provisional" y no respaldada por ningun
 * documento (acta de cierre de Decision Engine). No se repite.
 *
 * Se determinara a partir de tarifas reales, coste real de ejecucion,
 * margen, capacidad de los planes y comportamiento de consultas reales.
 */
export const CREDIT_VALUE: CreditValue | null = null

/**
 * Valor de un credito, con la moneda en la que se expresa. La moneda es
 * parte del valor: un credito de 0,001 EUR y uno de 0,001 USD no son el
 * mismo credito.
 */
export interface CreditValue {
  readonly amountPerCredit: number
  readonly currency: string
}

/**
 * Convierte el coste real de una ejecucion en creditos ScenaIA.
 *
 *     creditos = coste_monetario / valor_del_credito
 *
 * Devuelve `null` -- y nunca cero -- cuando la conversion no puede hacerse:
 *
 *   · el valor del credito no esta definido todavia (X pendiente);
 *   · la moneda del coste no coincide con la del credito, porque convertir
 *     entre monedas exigiria un tipo de cambio que nadie ha autorizado;
 *   · el valor del credito no es positivo, lo que no seria una unidad.
 *
 * `null` significa "no convertible", jamas "gratis". Quien la consume
 * distingue ambas cosas.
 *
 * PRECISION: una unica division, sin redondeo. Redondear aqui trasladaria
 * un error a cada liquidacion y, acumulado sobre miles de ejecuciones,
 * desviaria el presupuesto. El importe se almacena despues en `numeric`,
 * que es exacto; si alguna vez hace falta redondear, corresponde al momento
 * de presentar la cifra, nunca al de calcularla.
 */
export function toCredits(cost: ExecutionCost, creditValue: CreditValue | null = CREDIT_VALUE): number | null {
  if (creditValue === null) return null
  if (creditValue.amountPerCredit <= 0) return null
  if (creditValue.currency !== cost.currency) return null

  return cost.amount / creditValue.amountPerCredit
}

/**
 * Declara si la unidad economica esta operativa. Existe para que quien
 * dependa de ella no tenga que interpretar un `null` por su cuenta.
 */
export function isEconomicUnitDefined(creditValue: CreditValue | null = CREDIT_VALUE): boolean {
  return creditValue !== null && creditValue.amountPerCredit > 0
}

/**
 * Importe con el que cerrar una reserva, siempre en la UNIDAD ECONOMICA
 * INTERNA -- la misma en la que se reservo y en la que se expresa el
 * presupuesto del plan. Liquidar aqui una cifra monetaria descuadraria el
 * presupuesto: comparar un limite de 30 creditos contra 0,0003 EUR no
 * significa nada.
 *
 * Vive en Accounting Engine porque convertir coste en unidad economica es
 * exactamente su dominio. Ni el Orquestador ni AI Gateway consultan el
 * catalogo de tarifas: el primero coordina y el segundo "invoca, nunca
 * selecciona" (invariante de Direccion, cierre de IA-006).
 *
 * Recorre la cadena completa -- tokens -> coste monetario -> creditos --
 * solo cuando existen sus dos parametros:
 *
 *   · la TARIFA del modelo, contenido del catalogo oficial (Direccion);
 *   · el VALOR DEL CREDITO, X de IA-006.2 (pendiente).
 *
 * Si falta cualquiera de los dos, devuelve el importe ya reservado: el
 * comportamiento seguro que la arquitectura ya tenia definido, no un
 * fallback nuevo. Nunca devuelve cero, que fingiria que una ejecucion real
 * salio gratis.
 */
export function resolveSettlementCost(
  audit: ExecutionAuditForSettlement,
  reservedCost: number,
  creditValue: CreditValue | null = CREDIT_VALUE,
  catalog: readonly ProviderCatalogEntry[] = AI_PROVIDER_CATALOG
): number {
  if (audit.providerIdentifier === null || audit.providerModel === null) return reservedCost

  const cost = calculateExecutionCost(
    {
      providerId: audit.providerIdentifier,
      model: audit.providerModel,
      inputTokens: audit.inputTokens,
      outputTokens: audit.outputTokens,
    },
    catalog
  )
  if (cost === null) return reservedCost

  return toCredits(cost, creditValue) ?? reservedCost
}

/**
 * Lo que Accounting Engine necesita de una ejecucion para tarificarla.
 * Forma minima y propia: no importa el contrato de AI Gateway, de modo que
 * la contabilidad no queda atada a la forma del audit.
 */
export interface ExecutionAuditForSettlement {
  readonly providerIdentifier: string | null
  readonly providerModel: string | null
  readonly inputTokens: number | null
  readonly outputTokens: number | null
}
