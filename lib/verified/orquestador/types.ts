import type { ConversationState } from '@/lib/conversation-state'
import type { ResponseContext } from '@/lib/response-composer'

export type { SessionInput } from '@/lib/professional-context-engine'
export type { ConversationTurn } from '@/lib/prompt-composer'

/**
 * Resultado completo de un turno: lo que se responde y lo que queda
 * vigente para el siguiente.
 *
 * Son dos cosas distintas y viajan por separado. `ResponseContext` no gana
 * ningun campo: el estado conversacional no es parte de la respuesta, y
 * meterlo en `responseMetadata` -- un `Record<string, string>` -- seria
 * transportarlo por una convencion implicita, exactamente lo que PRD-001
 * proscribe. Response Composer queda intacto.
 */
export interface TurnOutcome {
  readonly responseContext: ResponseContext
  readonly conversationState: ConversationState
  /**
   * SCENAIA-004B §4.7 -- pagina del listado puro entregada en este turno.
   * Viaja al lado de la respuesta, como el estado, y NUNCA dentro de
   * `ResponseContext` (PRD-001). Ausente -- ni siquiera `null` -- cuando el
   * interruptor esta apagado o el turno no pidio pagina: asi la respuesta
   * de esos turnos es la de siempre, byte a byte.
   */
  readonly listingPage?: ListingPage
}

/**
 * SCENAIA-004B §4.7 -- lo que la interfaz necesita para el pie y el boton.
 * `from` y `to` son posiciones de 1 en adelante; una pagina vacia tiene
 * `to < from` (cero obras). `nextOffset` es el desplazamiento de la pagina
 * siguiente, o `null` cuando no hay mas obras.
 */
export interface ListingPage {
  readonly from: number
  readonly to: number
  readonly total: number | null
  readonly nextOffset: number | null
}

/** SCENAIA-004B §4.2 -- continuacion ya validada por la ruta. */
export interface ListingContinuation {
  readonly offset: number
}
