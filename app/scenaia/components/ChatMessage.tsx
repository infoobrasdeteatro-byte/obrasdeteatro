import ObrasIsotype from './ObrasIsotype'
import ListingFooter from './ListingFooter'
import type { PaginaDelListado } from '../listado'

/**
 * UX-001B: un turno ya renderizado del hilo. Deliberadamente sin ningún
 * vocabulario técnico (responseType nunca llega a este componente) --
 * solo distingue visualmente quién habla, nunca por qué mecanismo del
 * backend se produjo la respuesta.
 *
 * UX-002: puede acompañarse de un AVISO ya resuelto y ya traducido a
 * lenguaje del usuario. Sigue sin llegar aquí ningún vocabulario interno:
 * este componente recibe un texto y una naturaleza, nunca un `denialCode`
 * ni un `responseType`.
 *
 * SCENAIA-004B §4.8: una respuesta de listado lleva ademas su pie
 * (`ListingFooter`). Sin `listingPage`, el marcado es exactamente el de
 * siempre.
 */
export interface ChatMessageProps {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly notice?: { readonly kind: 'cuota' | 'incompleta' | 'error'; readonly text: string } | null
  readonly listingPage?: PaginaDelListado | null
  /** Solo en la ultima respuesta del chat: sin el, el pie no ofrece "Ver mas". */
  readonly onVerMas?: (() => void) | null
  readonly verMasBloqueado?: boolean
}

export default function ChatMessage({
  role,
  content,
  notice = null,
  listingPage = null,
  onVerMas = null,
  verMasBloqueado = false,
}: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`scenaia-msg ${isUser ? 'scenaia-msg--user' : 'scenaia-msg--assistant'}`}>
      {!isUser && (
        <div className="scenaia-avatar">
          <ObrasIsotype />
        </div>
      )}
      <div className="scenaia-bubble-col">
        {!isUser && <p className="scenaia-name-tag">ScenaIA</p>}
        <div className={`scenaia-bubble ${isUser ? 'scenaia-bubble--user' : 'scenaia-bubble--assistant'}`}>
          {content}
        </div>
        {notice && (
          /*
           * `role="status"` y `aria-live` para que un lector de pantalla lo
           * anuncie sin robar el foco. El icono textual acompaña al color:
           * la diferencia entre "cuota agotada" y "error" no puede depender
           * únicamente de un tono.
           */
          <p className={`scenaia-notice scenaia-notice--${notice.kind}`} role="status" aria-live="polite">
            <span className="scenaia-notice-mark" aria-hidden="true">
              {notice.kind === 'incompleta' ? '…' : '!'}
            </span>
            {notice.text}
          </p>
        )}
        {!isUser && listingPage && (
          <ListingFooter pagina={listingPage} onVerMas={onVerMas} bloqueado={verMasBloqueado} />
        )}
      </div>
    </div>
  )
}
