'use client'

import { useState } from 'react'

interface ScenaiaResponse {
  responseType: string
  responseContent: string | null
  responseWarnings: string[]
}

const RESPONSE_TYPE_LABEL: Record<string, string> = {
  RESPONSE_SUCCESS: 'Respuesta generada por IA',
  RESPONSE_PARTIAL: 'Respuesta parcial',
  RESPONSE_DIRECT: 'Respuesta directa',
  RESPONSE_DENIED: 'Solicitud denegada',
  RESPONSE_ERROR: 'Error controlado',
}

export default function ScenaiaClient() {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [response, setResponse] = useState<ScenaiaResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || pending) return

    setPending(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('/api/scenaia-verified', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, route: '/scenaia', module: 'centro-profesional' }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Error ${res.status}`)
        return
      }

      setResponse(await res.json())
    } catch {
      setError('No se pudo contactar con ScenaIA. Inténtalo de nuevo.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '640px' }}>
      <form onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu petición para ScenaIA…"
          disabled={pending}
          rows={4}
          style={{
            width: '100%',
            padding: '12px',
            fontFamily: 'var(--sans)',
            fontSize: '14px',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            resize: 'vertical',
            marginBottom: '12px',
          }}
        />
        <button
          type="submit"
          disabled={pending || !message.trim()}
          style={{
            padding: '9px 20px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--black)',
            background: 'var(--black)',
            color: 'var(--white)',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: 'var(--sans)',
            cursor: pending || !message.trim() ? 'not-allowed' : 'pointer',
            opacity: pending || !message.trim() ? 0.5 : 1,
          }}
        >
          {pending ? 'Enviando…' : 'Enviar'}
        </button>
      </form>

      {error && (
        <p style={{ marginTop: '16px', fontSize: '13px', color: '#b91c1c', fontFamily: 'var(--sans)' }}>
          {error}
        </p>
      )}

      {response && (
        <div style={{ marginTop: '16px', padding: '14px', background: 'var(--subtle)', borderRadius: 'var(--radius)' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5b21b6', fontFamily: 'var(--mono)', marginBottom: '6px' }}>
            {RESPONSE_TYPE_LABEL[response.responseType] ?? response.responseType}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text)', fontFamily: 'var(--sans)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {response.responseContent ?? '(sin contenido)'}
          </p>
        </div>
      )}
    </div>
  )
}
