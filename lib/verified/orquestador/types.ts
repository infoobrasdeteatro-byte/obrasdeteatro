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
}
