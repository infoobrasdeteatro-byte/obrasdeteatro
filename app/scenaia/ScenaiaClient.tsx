'use client'

import { useEffect, useRef, useState } from 'react'
import ChatMessage from './components/ChatMessage'
import ChatWelcome from './components/ChatWelcome'
import ChatInput from './components/ChatInput'
import TypingIndicator from './components/TypingIndicator'
import type { ConversationState } from '@/lib/conversation-state'
import { resolveTurnNotice, resolveAccessDestination } from './turn-notice'
import type { TurnNotice } from './turn-notice'

interface ScenaiaResponse {
  responseType: string
  responseContent: string | null
  responseWarnings: string[]
  /**
   * UX-002: las señales que el Núcleo ya emitía y que hasta ahora no se
   * leían. `denialCode` viaja aquí -- no en la raíz -- porque el Bloque 5
   * lo transportó por los metadatos precisamente para no ensanchar el
   * contrato de respuesta.
   */
  responseMetadata: Record<string, string>
  /**
   * Contexto conversacional vigente (Fase 3). Se importa el tipo REAL del
   * contrato: el cliente no declara una forma paralela ni serializa el
   * estado por su cuenta.
   */
  conversationState: ConversationState | null
}

interface ConversationTurn {
  readonly role: 'user' | 'assistant'
  readonly content: string
  /** Aviso ya traducido que acompaña a este turno, si lo hubo (UX-002). */
  readonly notice?: TurnNotice | null
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
  /**
   * Contexto conversacional que el servidor devolvio en el turno anterior.
   *
   * El cliente ALMACENA, TRANSPORTA y REEMPLAZA. No lo lee, no lo
   * interpreta y no modifica ninguno de sus campos -- ni el dominio, ni las
   * ranuras, ni la version, ni el instante. Su unica responsabilidad es que
   * lo que el servidor emitio en el turno N llegue intacto al turno N+1.
   *
   * No es una segunda memoria: es el mismo objeto del contrato, guardado
   * tal cual. La validez de su contenido la decide siempre la API, que
   * sigue siendo la frontera de validacion; lo que salga de aqui no es
   * confiable por proceder de aqui.
   *
   * Vive en memoria del cliente, como el historial: se pierde al recargar,
   * por el mismo diseno ya declarado y sin persistencia nueva.
   */
  const [conversationState, setConversationState] = useState<ConversationState | null>(null)
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
        body: JSON.stringify({
          message: text,
          history,
          conversationState,
          route: '/scenaia',
          module: 'centro-profesional',
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        /*
         * P1-B. El servidor ya decía POR QUÉ denegaba -- `reason`, contrato
         * P1.3 -- y ese dato se descartaba: quien perdía el acceso a mitad
         * de sesión veía "Acceso no autorizado" y nada más, sin saber qué
         * le faltaba ni a dónde ir.
         *
         * Aquí NO se decide nada: no se comprueba verificación, ni plan, ni
         * cuota, ni se consulta ninguna fuente. Y solo se navega en el caso
         * para el que UX-003 construyó una pantalla: `no_verificado`.
         * CUALQUIER otro motivo -- `no_autenticado`, `plan_no_reconocido`,
         * o uno que el contrato aún no declare -- conserva exactamente el
         * comportamiento anterior a P1-ERRORES: el aviso, sin moverse de la
         * conversación. Llevárselo de aquí perdería lo escrito, y eso no lo
         * ha autorizado nadie.
         *
         * Navegación completa, no `router.push`: el destino resuelve el
         * acceso otra vez en el servidor, que sigue siendo la fuente de
         * verdad, y una entrada servida desde la caché de router podría
         * contradecirlo.
         */
        const destino = resolveAccessDestination(body.reason)

        if (destino !== null) {
          window.location.assign(destino)
          return
        }

        setError(body.error ?? `Error ${res.status}`)
        return
      }

      const data: ScenaiaResponse = await res.json()
      /*
       * UX-002. La decisión de QUÉ se advierte vive en `resolveTurnNotice`,
       * que solo traduce el estado ya clasificado por el backend. Aquí no
       * se calculan créditos, no se consultan planes y no se detecta
       * truncamiento: se muestra lo que el Núcleo ya determinó.
       */
      const notice = resolveTurnNotice(data)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.responseContent ?? '(sin contenido)', notice },
      ])
      // REEMPLAZO, nunca fusion: el estado vigente es siempre el ultimo que
      // el servidor emitio. Combinarlo con el anterior seria decidir aqui
      // que sigue vigente, y esa decision no es del cliente.
      setConversationState(data.conversationState ?? null)
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
              <ChatMessage key={i} role={turn.role} content={turn.content} notice={turn.notice ?? null} />
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
