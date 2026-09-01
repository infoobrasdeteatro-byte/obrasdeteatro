import type { OperationEstimate } from './operation'

/**
 * Reserva de ultimo recurso, en creditos.
 *
 * Es lo que se aparta cuando el coste especifico NO puede calcularse --
 * sin tarifa declarada, sin valor de credito, sin proveedor --, y es la
 * estrategia original de IA-004: coste fijo y uniforme. Deja de ser la
 * regla y pasa a ser la excepcion.
 *
 * No desaparece porque sigue habiendo un caso real en el que es la unica
 * respuesta honesta: reservar cero cuando no se sabe cuanto costara seria
 * peor que reservar de mas.
 */
const ESTIMATED_COST_UNIT = 1

/**
 * Coste MAXIMO PLAUSIBLE del turno, en creditos (Bloque 4).
 *
 * Suma las operaciones que el turno puede llegar a ejecutar -- no las que
 * seguramente ejecutara. Un turno que quiza invoque al resolutor debe
 * apartar tambien esa llamada: hasta ahora no lo hacia, y se observo en
 * produccion un turno con DOS ejecuciones de proveedor cobrado como una
 * sola.
 *
 * Si cualquiera de las operaciones no puede estimarse, se cae entero a la
 * reserva de ultimo recurso: sumar las que si se conocen y dar por gratis
 * las demas produciria una reserva insuficiente, que es exactamente lo que
 * este bloque existe para impedir.
 */
export function estimateCost(needsAI: boolean, estimates: readonly OperationEstimate[] = []): number | null {
  if (!needsAI) return null
  if (estimates.length === 0) return ESTIMATED_COST_UNIT

  let total = 0
  for (const estimate of estimates) {
    if (estimate.estimatedCredits === null) return ESTIMATED_COST_UNIT
    total += estimate.estimatedCredits
  }

  // Una reserva de cero no es una reserva: la operacion atomica la rechaza
  // y, sobre todo, afirmaria que ejecutar no cuesta nada.
  return total > 0 ? total : ESTIMATED_COST_UNIT
}
