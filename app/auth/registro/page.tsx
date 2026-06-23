'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { translateAuthError } from '@/lib/auth-errors'

export default function RegistroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre }
      }
    })

    if (error) {
      setMessage(translateAuthError(error.message))
      setIsSuccess(false)
    } else {
      fetch('/api/auth/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre }),
      }).catch(() => {})
      setMessage('¡Revisa tu email para confirmar tu cuenta!')
      setIsSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <Link href="/" className="auth-logo">
        obras<span>de</span>teatro.com
      </Link>
      <div className="auth-card">
        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-tagline">Únete al ecosistema del teatro en español. Siempre gratis.</p>
        <form onSubmit={handleRegistro} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="ds-input"
          />
          <input
            type="text"
            placeholder="Tu nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
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
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>
        {message && (
          <p className={`auth-message ${isSuccess ? 'auth-message--success' : 'auth-message--error'}`}>
            {message}
          </p>
        )}
        <div className="auth-footer">
          <p>
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
