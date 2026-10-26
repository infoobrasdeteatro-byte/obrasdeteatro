'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import BrandIcon from '@/components/brand/BrandIcon'
import { translateAuthError } from '@/lib/auth-errors'
import { PASSWORD_POLICY, PASSWORD_HINT } from '@/lib/auth/password-policy'
import { safeNextPath } from '@/lib/auth/next-param'
import { GRUPOS_PROFESIONES, PROFESIONES, TIPOS_ORGANIZACION } from '@/lib/perfiles/profesiones'

// Al registrarse, el plan es Gratuito: hasta 3 profesiones (como en el perfil).
const MAX_PROFESIONES_REGISTRO = 3
type Registro = 'profesional' | 'organizacion' | 'publico'

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
  const [registro, setRegistro] = useState<Registro | ''>('')
  const [tipoOrganizacion, setTipoOrganizacion] = useState('')
  const [profesiones, setProfesiones] = useState<string[]>([])
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileScriptReady, setTurnstileScriptReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  // Ruta de vuelta tras confirmar el email (p. ej. /precios), ya validada.
  const [next, setNext] = useState<string | null>(null)

  // Llega desde el enlace personal de un/a Embajador/a de Escena (/r/<código>).
  const [invitado, setInvitado] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setNext(safeNextPath(p.get('next')))
    setInvitado(p.get('invitado') === '1')
  }, [])

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

    if (!registro) {
      setMessage('Indica si te registras como profesional, como organización o como público.')
      setIsSuccess(false)
      setLoading(false)
      return
    }
    if (registro === 'profesional' && profesiones.length === 0) {
      setMessage('Selecciona al menos una profesión.')
      setIsSuccess(false)
      setLoading(false)
      return
    }
    if (registro === 'organizacion' && !tipoOrganizacion) {
      setMessage('Selecciona el tipo de organización.')
      setIsSuccess(false)
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
        body: JSON.stringify({
          email, password, nombre, website, turnstileToken, next,
          tipoPerfil: registro === 'organizacion' ? tipoOrganizacion : registro,
          profesiones: registro === 'profesional' ? profesiones : [],
        }),
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
        <BrandIcon />
        obras<span>de</span>teatro.com
      </Link>
      <div className="auth-card">
        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-tagline">Únete al ecosistema del teatro en español. Siempre gratis.</p>
        {invitado && (
          <p className="ds-alert-success" style={{ display: 'block', marginBottom: '14px', fontSize: '13px', lineHeight: 1.5 }}>
            Vienes invitado/a por un/a Embajador/a de Escena: al confirmar tu cuenta tendrás <strong>un mes de Premium gratis</strong>, sin tarjeta.
          </p>
        )}
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
          <fieldset className="reg-tipo">
            <legend className="reg-legend">¿Te registras como profesional o como organización?</legend>
            {([
              { value: 'profesional', label: 'Profesional', ayuda: 'Trabajo en las artes escénicas' },
              { value: 'organizacion', label: 'Organización', ayuda: 'Compañía, sala, festival, escuela…' },
              { value: 'publico', label: 'Público', ayuda: 'Sigo la actividad teatral' },
            ] as const).map(op => (
              <label key={op.value} className={`reg-opcion${registro === op.value ? ' reg-opcion--activa' : ''}`}>
                <input
                  type="radio"
                  name="registro"
                  value={op.value}
                  checked={registro === op.value}
                  onChange={() => setRegistro(op.value)}
                />
                <span className="reg-opcion-label">{op.label}</span>
                <span className="reg-opcion-ayuda">{op.ayuda}</span>
              </label>
            ))}
          </fieldset>

          {registro === 'organizacion' && (
            <select
              value={tipoOrganizacion}
              onChange={e => setTipoOrganizacion(e.target.value)}
              required
              className="ds-input"
              aria-label="Tipo de organización"
            >
              <option value="">Tipo de organización…</option>
              {TIPOS_ORGANIZACION.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          )}

          {registro === 'profesional' && (
            <fieldset className="reg-profesiones">
              <legend className="reg-legend">¿Cuál es tu perfil profesional en las artes escénicas?</legend>
              <p className="reg-ayuda">
                Puedes seleccionar hasta {MAX_PROFESIONES_REGISTRO}. La primera será la principal; podrás cambiarla en tu perfil.
              </p>
              <div className="reg-chips-caja">
                {GRUPOS_PROFESIONES.map(grupo => (
                  <div key={grupo} className="reg-grupo">
                    <p className="reg-grupo-titulo">{grupo}</p>
                    <div className="reg-chips">
                      {PROFESIONES.filter(p => p.grupo === grupo).map(p => {
                        const activa = profesiones.includes(p.id)
                        const lleno = !activa && profesiones.length >= MAX_PROFESIONES_REGISTRO
                        return (
                          <button
                            key={p.id}
                            type="button"
                            aria-pressed={activa}
                            disabled={lleno}
                            onClick={() => setProfesiones(prev => activa ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                            className={`reg-chip${activa ? ' reg-chip--activa' : ''}`}
                          >
                            {activa && profesiones[0] === p.id ? '★ ' : ''}{p.nombre}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          )}

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
