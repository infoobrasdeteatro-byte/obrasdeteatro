'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { translateAuthError } from '@/lib/auth-errors'
import { PASSWORD_POLICY, PASSWORD_HINT } from '@/lib/auth/password-policy'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

const ERROR_MESSAGES: Record<string, string> = {
  email_exists: 'Ya existe una cuenta con este correo electrónico.',
  weak_password: PASSWORD_HINT,
  turnstile_failed: 'No se pudo verificar que no eres un robot. Inténtalo de nuevo.',
  invalid_input: 'Revisa los datos del formulario e inténtalo de nuevo.',
}

export default function RegistroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [website, setWebsite] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileScriptReady, setTurnstileScriptReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const turnstileContainer = useRef<HTMLDivElement>(null)
  const turnstileWidgetId = useRef<string | null>(null)

  useEffect(() => {
    if (!turnstileScriptReady || !turnstileContainer.current || !window.turnstile) return
    if (turnstileWidgetId.current) return

    turnstileWidgetId.current = window.turnstile.render(turnstileContainer.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(''),
      'error-callback': () => setTurnstileToken(''),
    })
  }, [turnstileScriptReady])

  const resetTurnstile = () => {
    setTurnstileToken('')
    if (window.turnstile && turnstileWidgetId.current) {
      window.turnstile.reset(turnstileWidgetId.current)
    }
  }

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // SEC-001 Fase 2: campo honeypot. Un humano nunca lo rellena; si llega
    // relleno, se simula el mismo éxito sin llamar al endpoint de registro.
    if (website.trim() !== '') {
      setMessage('¡Revisa tu email para confirmar tu cuenta!')
      setIsSuccess(true)
      setLoading(false)
      return
    }

    if (!PASSWORD_POLICY.test(password)) {
      setMessage(PASSWORD_HINT)
      setIsSuccess(false)
      setLoading(false)
      return
    }

    if (!turnstileToken) {
      setMessage('Confirma que no eres un robot antes de continuar.')
      setIsSuccess(false)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nombre, website, turnstileToken }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setMessage(
          ERROR_MESSAGES[data.code] ?? translateAuthError(data.message ?? '')
        )
        setIsSuccess(false)
        resetTurnstile()
      } else {
        // AEC-001: el correo de bienvenida ya no se dispara aquí -- se envía
        // desde app/auth/callback/route.ts, tras la confirmación real del email.
        setMessage('¡Revisa tu email para confirmar tu cuenta!')
        setIsSuccess(true)
      }
    } catch {
      setMessage('No se pudo completar el registro. Inténtalo de nuevo.')
      setIsSuccess(false)
      resetTurnstile()
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setTurnstileScriptReady(true)}
      />
      <Link href="/" className="auth-logo">
        obras<span>de</span>teatro.com
      </Link>
      <div className="auth-card">
        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-tagline">Únete al ecosistema del teatro en español. Siempre gratis.</p>
        <form onSubmit={handleRegistro} className="auth-form">
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="website">No rellenar este campo</label>
            <input
              type="text"
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={e => setWebsite(e.target.value)}
            />
          </div>
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
            minLength={8}
            aria-describedby="password-hint"
            className="ds-input"
          />
          <p id="password-hint" className="auth-tagline" style={{ margin: '-6px 0 0', textAlign: 'left', fontSize: '11px' }}>
            {PASSWORD_HINT}
          </p>
          <div ref={turnstileContainer} />
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
