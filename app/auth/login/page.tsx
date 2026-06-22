'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { translateAuthError } from '@/lib/auth-errors'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'auth_error') {
      setMessage('El enlace ha expirado o no es válido. Solicita uno nuevo.')
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(translateAuthError(error.message))
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <Link href="/" className="auth-logo">
        obras<span>de</span>teatro.com
      </Link>
      <div className="auth-card">
        <h1 className="auth-title">Iniciar sesión</h1>
        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="ds-input"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="ds-input"
          />
          <button
            type="submit"
            disabled={loading}
            className="ds-btn-primary"
            style={{ marginTop: '4px' }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
        {message && (
          <p className="auth-message auth-message--error">{message}</p>
        )}
        <div className="auth-footer">
          <p>
            ¿No tienes cuenta?{' '}
            <Link href="/auth/registro">Regístrate gratis</Link>
          </p>
          <p style={{ marginTop: '6px' }}>
            <Link href="/auth/recuperar">¿Olvidaste tu contraseña?</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
