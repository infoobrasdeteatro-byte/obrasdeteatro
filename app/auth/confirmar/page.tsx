'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BrandIcon from '@/components/brand/BrandIcon'

/**
 * Pedir un enlace de confirmación nuevo. El del registro caduca; sin esta
 * página, una cuenta sin confirmar no tenía forma de activarse.
 */
export default function ConfirmarCorreoPage() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('email')
    if (e) setEmail(e)
  }, [])

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setEnviando(true); setError('')
    try {
      const r = await fetch('/api/auth/reenviar-confirmacion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      })
      const d = await r.json().catch(() => ({}))
      if (d.ok) setEnviado(true)
      else setError(d.message ?? 'No se pudo enviar. Inténtalo de nuevo.')
    } catch {
      setError('No se pudo enviar. Comprueba tu conexión e inténtalo de nuevo.')
    }
    setEnviando(false)
  }

  return (
    <div className="auth-page">
      <Link href="/" className="auth-logo">
        <BrandIcon />
        obras<span>de</span>teatro.com
      </Link>
      <div className="auth-card">
        <h1 className="auth-title">Confirma tu correo</h1>
        {enviado ? (
          <>
            <p className="auth-tagline">
              Si hay una cuenta pendiente de confirmar con <strong>{email}</strong>, te hemos enviado un enlace nuevo.
              Ábrelo y tu cuenta quedará activa.
            </p>
            <p className="auth-tagline">Si no lo ves en unos minutos, revisa la carpeta de spam o correo no deseado.</p>
            <button type="button" className="ds-btn-secondary" style={{ marginTop: '8px' }} onClick={() => setEnviado(false)}>
              Usar otro correo
            </button>
          </>
        ) : (
          <>
            <p className="auth-tagline">
              Escribe el correo con el que te registraste y te enviaremos al momento un enlace nuevo para activar tu cuenta.
            </p>
            <form onSubmit={enviar} className="auth-form">
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="ds-input" autoComplete="email" />
              <button type="submit" disabled={enviando} className="ds-btn-primary" style={{ marginTop: '4px' }}>
                {enviando ? 'Enviando…' : 'Enviarme un enlace nuevo'}
              </button>
            </form>
            {error && <p className="auth-message auth-message--error">{error}</p>}
          </>
        )}
        <div className="auth-footer">
          <p><Link href="/auth/login">Volver a iniciar sesión</Link></p>
        </div>
      </div>
    </div>
  )
}
