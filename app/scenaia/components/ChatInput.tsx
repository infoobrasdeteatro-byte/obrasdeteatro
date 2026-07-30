'use client'

import { useRef } from 'react'

export interface ChatInputProps {
  readonly value: string
  readonly pending: boolean
  readonly onChange: (value: string) => void
  readonly onSubmit: () => void
}

const MAX_TEXTAREA_HEIGHT_PX = 140

/**
 * UX-001B: cuadro de escritura ligero, fijo en la parte inferior --
 * sustituye al textarea de 4 filas anterior. Autoexpandible dentro de un
 * límite (140px, ver CSS) y Enter para enviar / Shift+Enter para salto de
 * línea, mismo patrón ya asumido por cualquier cliente de chat moderno.
 */
export default function ChatInput({ value, pending, onChange, onSubmit }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !pending) onSubmit()
    }
  }

  return (
    <form
      className="scenaia-input-bar"
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim() && !pending) onSubmit()
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          autoGrow()
        }}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje…"
        disabled={pending}
        rows={1}
        aria-label="Mensaje para ScenaIA"
      />
      <button
        type="submit"
        className="scenaia-send-btn"
        disabled={pending || !value.trim()}
        aria-label="Enviar mensaje"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </form>
  )
}
