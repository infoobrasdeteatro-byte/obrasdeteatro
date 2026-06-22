'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { translateAuthError } from '@/lib/auth-errors'

function RecuperarSpinner({ label }: { label: string }) {
  return (
    <div className="auth-spinner-wrap">
      <div className="auth-spinner-card">
        <div className="auth-spinner" />
        <p className="auth-spinner-text">{label}</p>
      </div>
    </div>
  )
}

function RecuperarContent() {
  const searchParams = useSearchParams()
  const isExpiredLink = searchParams.get('expired') === 'true'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isChecking, setIsChecking] = useState(isExpiredLink)

  useEffect(() => {
    if (!isExpiredLink) return
    const t = setTimeout(() => {
      setIsChecking(false)
      setMessage('El enlace de recuperación ha expirado. Solicita uno nuevo.')
      setIsError(true)
    }, 900)
    return () => clearTimeout(t)
  }, [isExpiredLink])

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setIsError(false)

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback/recovery`,
    })

    if (error) {
      setMessage(translateAuthError(error.message))
      setIsError(true)
    } else {
      setMessage('¡Revisa tu email para restablecer tu contraseña!')
    }
    setLoading(false)
  }

  if (isChecking) {
    return <RecuperarSpinner label="Verificando enlace..." />
  }

  return (
    <div className="auth-page">
      <Link href="/" className="auth-logo">
        obras<span>de</span>teatro.com
      </Link>
      <div className="auth-card">
        <h1 className="auth-title">Recuperar contraseña</h1>
        <form onSubmit={handleRecuperar} className="auth-form">
          <input
            type="email"
            placeholder="Tu email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="ds-input"
          />
          <button
            type="submit"
            disabled={loading}
            className="ds-btn-primary"
            style={{ marginTop: '4px' }}
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
        {message && (
          <div className={`auth-message ${isError ? 'auth-message--error' : 'auth-message--success'}`}>
            {!isError && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
            {message}
          </div>
        )}
        <div className="auth-footer">
          <p>
            <Link href="/auth/login">Volver al inicio de sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RecuperarPage() {
  return (
    <Suspense fallback={<RecuperarSpinner label="Cargando..." />}>
      <RecuperarContent />
    </Suspense>
  )
}
