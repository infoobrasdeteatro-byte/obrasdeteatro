'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { translateAuthError } from '@/lib/auth-errors'

/**
 * AEC-003 Fase 4 (DA-002): cambio de correo desde una cuenta autenticada.
 * Supabase es la única fuente de verdad de `email` -- el nuevo correo no se
 * escribe en `profiles` desde aquí; lo hace el trigger de base de datos tras
 * la confirmación real, evitando una segunda fuente de verdad.
 */
interface Props {
  emailActual: string
}

export default function CorreoForm({ emailActual }: Props) {
  const searchParams = useSearchParams()
  const confirmado = searchParams.get('confirmado') === 'true'
  const expirado = searchParams.get('expirado') === 'true'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (email.trim().toLowerCase() === emailActual.toLowerCase()) {
      setMessage('Ese ya es tu correo actual.')
      setIsSuccess(false)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: `${window.location.origin}/auth/callback/email-change` }
    )

    if (error) {
      setMessage(translateAuthError(error.message))
      setIsSuccess(false)
    } else {
      setEmail('')
      setMessage('Revisa tu correo para confirmar el cambio. Puede que necesites confirmar tanto desde tu correo actual como desde el nuevo.')
      setIsSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '420px' }}>
      {confirmado && (
        <p className="auth-message auth-message--success" style={{ marginBottom: '16px' }}>
          Correo confirmado correctamente.
        </p>
      )}
      {expirado && (
        <p className="auth-message auth-message--error" style={{ marginBottom: '16px' }}>
          El enlace de confirmación ha expirado o no es válido. Inténtalo de nuevo.
        </p>
      )}

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '14px' }}>
          Correo actual: <strong style={{ color: 'var(--black)' }}>{emailActual}</strong>
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            placeholder="Nuevo correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="ds-input"
          />
          <button type="submit" disabled={loading} className="ds-btn-primary" style={{ alignSelf: 'flex-start' }}>
            {loading ? 'Enviando...' : 'Cambiar correo'}
          </button>
          {message && (
            <p className={`auth-message ${isSuccess ? 'auth-message--success' : 'auth-message--error'}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
