'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PLANES } from '@/lib/plans'
import TopNav from '@/components/design-system/TopNav'
import NavAutenticado from '@/components/NavAutenticado'

interface Props {
  userId: string | null
  userEmail: string | null
  currentPlan: string | null
  cancelled: boolean
}

export default function PreciosClient({ userId, userEmail, currentPlan, cancelled }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptRenewal, setAcceptRenewal] = useState(false)
  const legalAccepted = acceptTerms && acceptPrivacy && acceptRenewal

  const handleSubscribe = async (planId: string) => {
    if (!userId || !userEmail) return

    setLoadingPlan(planId)
    setError(null)

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, userId, email: userEmail }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Error al iniciar el pago')
      }

      const { url } = await res.json() as { url: string }
      if (url) {
        window.location.href = url
        return
      }
      throw new Error('No se recibió URL de pago')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Inténtalo de nuevo.')
      setLoadingPlan(null)
    }
  }

  const isAuthenticated = !!userId

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      {isAuthenticated ? <NavAutenticado /> : <TopNav />}

      <main style={{ maxWidth: '1060px', margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* Encabezado */}
        <div className="precios-header">
          <h1 className="precios-headline">Planes y precios</h1>
          <p className="precios-sub">
            Elige el plan que mejor se adapta a tu actividad profesional en el teatro.
          </p>
        </div>

        {/* Banner: pago cancelado */}
        {cancelled && (
          <div className="ds-status-banner ds-status-banner--draft" style={{ maxWidth: '520px', margin: '0 auto 32px' }}>
            <p className="ds-status-title">Has cancelado el proceso de pago. Tu plan actual no ha cambiado.</p>
          </div>
        )}

        {/* Banner: error */}
        {error && (
          <div className="ds-alert-error" style={{ maxWidth: '520px', margin: '0 auto 32px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Tarjetas de planes */}
        <div className="precios-plan-grid">
          {PLANES.map((plan) => {
            const isCurrent = currentPlan === plan.id
            const isLoading = loadingPlan === plan.id
            const isPaid = plan.id !== 'gratuito'

            return (
              <div
                key={plan.id}
                className={`precios-card${plan.recomendado ? ' precios-card--highlighted' : ''}`}
              >
                {plan.recomendado && (
                  <span className="precios-badge">Más popular</span>
                )}

                <div className="precios-card-label">{plan.nombre}</div>

                <div className="precios-card-price">
                  {plan.precio === 0 ? 'Gratis' : `${plan.precio.toFixed(2).replace('.', ',')} €`}
                </div>
                {plan.precio > 0 && (
                  <>
                    <div className="precios-card-period">/mes</div>
                    <div className="precios-card-billing">Facturación mensual · Cancela cuando quieras</div>
                  </>
                )}
                {plan.precio === 0 && <div className="precios-card-period">Para siempre</div>}

                <ul className="precios-card-features">
                  {plan.caracteristicas.map(feat => (
                    <li key={feat} className="precios-card-feature">
                      <svg className="precios-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="precios-card-current">Plan actual</div>
                ) : !isAuthenticated ? (
                  <Link
                    href="/auth/registro"
                    className="precios-card-btn precios-card-btn--dark"
                  >
                    {isPaid ? 'Crear cuenta' : 'Empezar gratis'}
                  </Link>
                ) : plan.id === 'gratuito' ? (
                  <div className="precios-card-current">Incluido</div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isLoading || !!loadingPlan || !legalAccepted}
                    title={!legalAccepted ? 'Acepta los términos para continuar' : undefined}
                    className={`precios-card-btn ${plan.recomendado ? 'precios-card-btn--red' : 'precios-card-btn--dark'}`}
                  >
                    {isLoading ? 'Redirigiendo a Stripe…' : `Activar plan ${plan.nombre}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Aceptación legal — solo para usuarios autenticados */}
        {isAuthenticated && (
          <div className="precios-legal-box">
            <p className="precios-legal-title">
              Antes de activar un plan, acepta los siguientes términos:
            </p>
            <label className="precios-legal-item">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
              />
              <span>
                Acepto los{' '}
                <a href="/legal/terminos" style={{ textDecoration: 'underline', color: 'var(--text)' }} target="_blank" rel="noopener noreferrer">
                  Términos y Condiciones
                </a>
              </span>
            </label>
            <label className="precios-legal-item">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={e => setAcceptPrivacy(e.target.checked)}
              />
              <span>
                He leído la{' '}
                <a href="/legal/privacidad" style={{ textDecoration: 'underline', color: 'var(--text)' }} target="_blank" rel="noopener noreferrer">
                  Política de Privacidad
                </a>
              </span>
            </label>
            <label className="precios-legal-item">
              <input
                type="checkbox"
                checked={acceptRenewal}
                onChange={e => setAcceptRenewal(e.target.checked)}
              />
              <span>Acepto la renovación automática de la suscripción hasta su cancelación</span>
            </label>
            {!legalAccepted && (
              <p className="precios-legal-warning">
                Acepta los tres puntos anteriores para habilitar el botón de pago.
              </p>
            )}
          </div>
        )}

        {/* Señales de confianza */}
        <p className="precios-trust">
          Pago seguro con Stripe · Cancela en cualquier momento · Sin permanencia mínima
        </p>

        {isAuthenticated && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link href="/dashboard" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'underline' }}>
              ← Volver al panel de control
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
