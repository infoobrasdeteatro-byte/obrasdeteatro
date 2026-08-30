import type { KnowledgeDomain, WorkSlotOccupancy } from '@/lib/knowledge-assets'
import type { ConversationState, DomainOccupancy, IncomingConversationState } from './types'

/**
 * Estado inicial de una conversacion que todavia no tiene contexto: sin
 * dominio activo y sin ninguna ranura ocupada. No es un estado degradado
 * ni un marcador temporal -- es el estado real de una conversacion que
 * acaba de empezar, y se representa explicitamente en lugar de por
 * ausencia de estado (PRD-001).
 */
export function emptyConversationState(conversationId: string): IncomingConversationState {
  return { conversationId, activeDomain: null, occupancyByDomain: [] }
}

/**
 * Ranuras vigentes de Obras, o vacio si el estado no las tiene.
 *
 * Solo devuelve la ocupacion del dominio que se pide: es el punto exacto
 * en el que la contaminacion cruzada se vuelve imposible, porque no hay
 * forma de obtener criterios de un dominio pasando el nombre de otro.
 */
export function workOccupancyOf(state: IncomingConversationState | null, domain: KnowledgeDomain): WorkSlotOccupancy {
  if (state === null || domain !== 'Obras') return {}

  return state.occupancyByDomain.find((entrada) => entrada.domain === 'Obras')?.slots ?? {}
}

/**
 * Estado resultante de un turno.
 *
 * `stateVersion` y `updatedAt` los fija SIEMPRE el servidor: la version
 * avanza desde la del turno anterior, y el instante procede del reloj de
 * quien ejecuta, nunca del cliente. Un cliente que enviara una version
 * artificial no consigue nada, porque su valor no se lee.
 *
 * CAMBIO DE DOMINIO: la ocupacion del dominio que deja de estar activo no
 * se destruye, se conserva bajo su propio dominio. Queda inaplicable
 * mientras otro dominio este activo -- `workOccupancyOf` solo la devuelve
 * si se pregunta por Obras -- y disponible si la conversacion vuelve a el.
 *
 * Funcion pura: no muta el estado anterior, no consulta reloj externo
 * salvo el instante que se le pasa, y devuelve siempre un objeto nuevo.
 */
export function nextConversationState(
  previous: IncomingConversationState,
  turn: {
    readonly activeDomain: KnowledgeDomain | null
    readonly workOccupancy: WorkSlotOccupancy
    readonly previousVersion: number
    readonly occurredAt: string
  }
): ConversationState {
  const otrosDominios = previous.occupancyByDomain.filter((entrada) => entrada.domain !== 'Obras')
  const obras: DomainOccupancy[] =
    Object.keys(turn.workOccupancy).length > 0 ? [{ domain: 'Obras', slots: turn.workOccupancy }] : []

  return {
    conversationId: previous.conversationId,
    activeDomain: turn.activeDomain,
    occupancyByDomain: [...otrosDominios, ...obras],
    stateVersion: turn.previousVersion + 1,
    updatedAt: turn.occurredAt,
  }
}
