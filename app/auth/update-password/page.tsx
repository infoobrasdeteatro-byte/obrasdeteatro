'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { translateAuthError } from '@/lib/auth-errors'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionValid(!!user)
    })
  }, [])

  useEffect(() => {
    if (!success) return
    if (countdown === 0) {
      router.push('/dashboard')
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [success, countdown, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(translateAuthError(err.message))
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="auth-spinner-wrap">
        <div className="auth-spinner-card">
          <div className="auth-result-icon auth-result-icon--success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '22px', color: 'var(--black)', marginBottom: '8px', letterSpacing: '-0.3px' }}>
            Contraseña actualizada
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px', lineHeight: 1.5 }}>
            Tu contraseña ha sido cambiada correctamente.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
            Redirigiendo al dashboard en {countdown}...
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="ds-btn-primary"
          >
            Ir al dashboard ahora
          </button>
        </div>
      </div>
    )
  }

  if (sessionValid === false) {
    return (
      <div className="auth-spinner-wrap">
        <div className="auth-spinner-card">
          <div className="auth-result-icon auth-result-icon--error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--black)', marginBottom: '8px', letterSpacing: '-0.3px' }}>
            Enlace expirado o inválido
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px', lineHeight: 1.5 }}>
            El enlace de recuperación ya fue utilizado o ha caducado.
          </p>
          <Link href="/auth/recuperar" className="ds-btn-primary">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    )
  }

  if (sessionValid === null) {
    return (
      <div className="auth-spinner-wrap">
        <div className="auth-spinner-card">
          <div className="auth-spinner" />
          <p className="auth-spinner-text">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <Link href="/" className="auth-logo">
        obras<span>de</span>teatro.com
      </Link>
      <div className="auth-card">
        <h1 className="auth-title">Nueva contraseña</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="ds-input"
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={6}
            className="ds-input"
          />
          <button
            type="submit"
            disabled={loading}
            className="ds-btn-primary"
            style={{ marginTop: '4px' }}
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
        {error && (
          <p className="auth-message auth-message--error">{error}</p>
        )}
      </div>
    </div>
  )
}
