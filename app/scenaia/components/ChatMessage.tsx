import ObrasIsotype from './ObrasIsotype'

/**
 * UX-001B: un turno ya renderizado del hilo. Deliberadamente sin ningún
 * vocabulario técnico (responseType nunca llega a este componente) --
 * solo distingue visualmente quién habla, nunca por qué mecanismo del
 * backend se produjo la respuesta.
 */
export interface ChatMessageProps {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
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
      </div>
    </div>
  )
}
