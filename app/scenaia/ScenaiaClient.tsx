'use client'

import { useEffect, useRef, useState } from 'react'
import ChatMessage from './components/ChatMessage'
import ChatWelcome from './components/ChatWelcome'
import ChatInput from './components/ChatInput'
import TypingIndicator from './components/TypingIndicator'

interface ScenaiaResponse {
  responseType: string
  responseContent: string | null
  responseWarnings: string[]
}

interface ConversationTurn {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

/**
 * UX-001B (Sprint aprobado): rediseño exclusivamente de presentación sobre
 * la base conversacional ya construida en UX-001A -- ni el fetch a
 * `/api/scenaia-verified`, ni la forma del historial enviado (`role`/
 * `content`), ni ningún componente de backend cambian aquí. El único
 * cambio de fondo respecto a UX-001A es que `responseType` deja de
 * almacenarse junto al mensaje: ya no se muestra en ningún punto de la
 * interfaz (vocabulario interno, nunca de cara al usuario).
 *
 * Historial exclusivamente en memoria del cliente -- `useState`, sin
 * `localStorage`/`sessionStorage`, sin persistencia. Se pierde al
 * recargar la página, por diseño (sin cambios respecto a UX-001A).
 */
export default function ScenaiaClient() {
  const [messages, setMessages] = useState<ConversationTurn[]>([])
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  async function handleSubmit() {
    const text = message.trim()
    if (!text || pending) return

    // Historial ya cerrado hasta este momento -- nunca incluye el turno que se esta enviando ahora.
    const history = messages

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setMessage('')
    setPending(true)
    setError(null)

    try {
      const res = await fetch('/api/scenaia-verified', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, history, route: '/scenaia', module: 'centro-profesional' }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Error ${res.status}`)
        return
      }

      const data: ScenaiaResponse = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.responseContent ?? '(sin contenido)' }])
    } catch {
      setError('No se pudo contactar con ScenaIA. Inténtalo de nuevo.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="scenaia-shell">
      <div className="scenaia-thread">
        {messages.length === 0 && !pending ? (
          <ChatWelcome />
        ) : (
          <>
            {messages.map((turn, i) => (
              <ChatMessage key={i} role={turn.role} content={turn.content} />
            ))}
            {pending && <TypingIndicator />}
          </>
        )}
        <div ref={threadEndRef} />
      </div>

      {error && <p className="scenaia-error-banner">{error}</p>}

      <ChatInput value={message} pending={pending} onChange={setMessage} onSubmit={handleSubmit} />
    </div>
  )
}
