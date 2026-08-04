'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { translateAuthError } from '@/lib/auth-errors'
import { PASSWORD_POLICY, PASSWORD_HINT } from '@/lib/auth/password-policy'

/**
 * AEC-003 Fase 2 (DA-003): cambio de contraseña desde una sesión ya
 * autenticada. Misma operación que app/auth/update-password (updateUser),
 * misma política que el registro (AEC-001) -- fuente única en
 * lib/auth/password-policy.ts.
 */
export default function SeguridadForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!PASSWORD_POLICY.test(password)) {
      setMessage(PASSWORD_HINT)
      setIsSuccess(false)
      return
    }
    if (password !== confirm) {
      setMessage('Las contraseñas no coinciden.')
      setIsSuccess(false)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(translateAuthError(error.message))
      setIsSuccess(false)
    } else {
      setPassword('')
      setConfirm('')
      setMessage('Contraseña actualizada correctamente.')
      setIsSuccess(true)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px' }}>
      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        minLength={8}
        aria-describedby="seguridad-password-hint"
        className="ds-input"
      />
      <p id="seguridad-password-hint" style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--sans)', margin: 0 }}>
        {PASSWORD_HINT}
      </p>
      <input
        type="password"
        placeholder="Confirmar nueva contraseña"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        required
        minLength={8}
        className="ds-input"
      />
      <button type="submit" disabled={loading} className="ds-btn-primary" style={{ alignSelf: 'flex-start' }}>
        {loading ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
      {message && (
        <p className={`auth-message ${isSuccess ? 'auth-message--success' : 'auth-message--error'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
