'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PLANES, TABLA_COMPARATIVA } from '@/lib/plans'
import type { CellValue } from '@/lib/plans'
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
  const [exploringOther, setExploringOther] = useState(false)
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

  const renderCell = (val: CellValue, highlighted: boolean) => {
    if (val === true)  return <span className={`precios-compare-check${highlighted ? ' precios-compare-check--inv' : ''}`} aria-label="incluido">✓</span>
    if (val === false) return <span className="precios-compare-dash" aria-label="no incluido">—</span>
    return <span className={`precios-compare-value${highlighted ? ' precios-compare-value--inv' : ''}`}>{val}</span>
  }

  return (
    <div style={{ background: 'var(--off)', minHeight: '100vh' }}>
      {isAuthenticated ? <NavAutenticado /> : <TopNav />}

      <main style={{ maxWidth: '1060px', margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* Encabezado */}
        <div className="precios-header">
          <p className="precios-eyebrow">Membresías profesionales</p>
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
        <div className="precios-plan-grid" onMouseLeave={() => setExploringOther(false)}>
          {PLANES.map((plan) => {
            const isCurrent = currentPlan === plan.id
            const isLoading = loadingPlan === plan.id
            const isPaid = plan.id !== 'gratuito'

            return (
              <div
                key={plan.id}
                className={`precios-card${plan.recomendado ? ' precios-card--highlighted' : ''}${plan.recomendado && exploringOther ? ' precios-card--dimmed' : ''}`}
                onMouseEnter={() => setExploringOther(!plan.recomendado)}
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

                <p className="precios-card-tagline">{plan.tagline}</p>

                {/* Bloques de funcionalidades */}
                <div className="precios-bloques">
                  {plan.bloques.map((bloque) => (
                    <div key={bloque.titulo} className="precios-bloque">
                      <div className={`precios-bloque-titulo${bloque.proximamente ? ' precios-bloque-titulo--soon' : ''}`}>
                        <span>{bloque.titulo}</span>
                        {bloque.proximamente && <span className="precios-soon-badge">próx.</span>}
                      </div>
                      <ul className="precios-bloque-items">
                        {bloque.items.map((item) => (
                          <li key={item} className="precios-bloque-item">
                            <svg className="precios-bloque-check" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

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

        {/* Tabla comparativa */}
        <section className="precios-compare">
          <h2 className="precios-compare-titulo">Comparativa completa</h2>
          <div className="precios-compare-wrapper">
            <table className="precios-compare-table">
              <thead>
                <tr>
                  <th scope="col" className="precios-compare-th precios-compare-th--feature">Funcionalidad</th>
                  {PLANES.map((p) => (
                    <th scope="col" key={p.id} className={`precios-compare-th${p.recomendado ? ' precios-compare-th--highlighted' : ''}`}>
                      <span className="precios-compare-plan-name">{p.nombre}</span>
                      <span className="precios-compare-plan-price">
                        {p.precio === 0 ? 'Gratis' : `${p.precio.toFixed(2).replace('.', ',')} €/mes`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLA_COMPARATIVA.flatMap((section) => [
                  <tr key={`s-${section.titulo}`}>
                    <td colSpan={5} className="precios-compare-section-label">
                      {section.titulo}
                      {section.proximamente && <span className="precios-compare-soon"> · próx.</span>}
                    </td>
                  </tr>,
                  ...section.filas.map((fila) => (
                    <tr key={`${section.titulo}-${fila.label}`} className="precios-compare-row">
                      <td className="precios-compare-label">{fila.label}</td>
                      {fila.values.map((val, i) => (
                        <td
                          key={i}
                          className={`precios-compare-cell${PLANES[i]?.recomendado ? ' precios-compare-cell--highlighted' : ''}`}
                        >
                          {renderCell(val, !!PLANES[i]?.recomendado)}
                        </td>
                      ))}
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </section>

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
