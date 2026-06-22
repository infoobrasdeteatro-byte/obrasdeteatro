'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PLANES } from '@/lib/plans'

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
    <div className="min-h-screen bg-gray-50">
      {/* Navegación */}
      <nav className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight">
            ObrasDeTeatro®
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                Mi panel →
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-gray-600 hover:text-black px-4 py-2 transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/auth/registro"
                  className="text-sm bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Encabezado */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Planes y precios</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Elige el plan que mejor se adapta a tu actividad profesional en el teatro.
          </p>
        </div>

        {/* Banner: pago cancelado */}
        {cancelled && (
          <div className="mb-8 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm text-center">
            Has cancelado el proceso de pago. Tu plan actual no ha cambiado.
          </div>
        )}

        {/* Banner: error */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Tarjetas de planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANES.map((plan) => {
            const isCurrent = currentPlan === plan.id
            const isLoading = loadingPlan === plan.id
            const isPaid = plan.id !== 'gratuito'

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-8 flex flex-col relative ${
                  plan.recomendado
                    ? 'ring-2 ring-black shadow-md'
                    : 'border border-gray-200 shadow-sm'
                }`}
              >
                {/* Badge más popular */}
                {plan.recomendado && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Más popular
                    </span>
                  </div>
                )}

                {/* Encabezado del plan */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-bold">{plan.nombre}</h2>
                    {isCurrent && (
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Activo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-4">{plan.descripcion}</p>
                  <div className="flex items-baseline gap-1">
                    {plan.precio === 0 ? (
                      <span className="text-3xl font-bold">Gratis</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">
                          {plan.precio.toFixed(2).replace('.', ',')} €
                        </span>
                        <span className="text-sm text-gray-400">/mes</span>
                      </>
                    )}
                  </div>
                  {plan.precio > 0 && (
                    <p className="text-xs text-gray-400 mt-1">Facturación mensual · Cancela cuando quieras</p>
                  )}
                </div>

                {/* Características */}
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.caracteristicas.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <svg
                        className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="w-full text-center py-2.5 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-default select-none">
                    Plan actual
                  </div>
                ) : !isAuthenticated ? (
                  <Link
                    href="/auth/registro"
                    className="w-full text-center py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors block"
                  >
                    {isPaid ? 'Crear cuenta' : 'Empezar gratis'}
                  </Link>
                ) : plan.id === 'gratuito' ? (
                  <div className="w-full text-center py-2.5 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-default select-none">
                    Incluido
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isLoading || !!loadingPlan || !legalAccepted}
                    title={!legalAccepted ? 'Acepta los términos para continuar' : undefined}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      plan.recomendado
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    {isLoading
                      ? 'Redirigiendo a Stripe…'
                      : `Activar plan ${plan.nombre}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Aceptación legal — solo para usuarios autenticados */}
        {isAuthenticated && (
          <div className="mt-10 max-w-lg mx-auto bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="text-sm font-semibold text-gray-700 mb-4">
              Antes de activar un plan, acepta los siguientes términos:
            </p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-black shrink-0"
                />
                <span className="text-sm text-gray-600">
                  Acepto los{' '}
                  <a href="/legal/terminos" className="underline hover:text-black" target="_blank" rel="noopener noreferrer">
                    Términos y Condiciones
                  </a>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={e => setAcceptPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-black shrink-0"
                />
                <span className="text-sm text-gray-600">
                  He leído la{' '}
                  <a href="/legal/privacidad" className="underline hover:text-black" target="_blank" rel="noopener noreferrer">
                    Política de Privacidad
                  </a>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptRenewal}
                  onChange={e => setAcceptRenewal(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-black shrink-0"
                />
                <span className="text-sm text-gray-600">
                  Acepto la renovación automática de la suscripción hasta su cancelación
                </span>
              </label>
            </div>
            {!legalAccepted && (
              <p className="text-xs text-amber-700 mt-3">
                Acepta los tres puntos anteriores para habilitar el botón de pago.
              </p>
            )}
          </div>
        )}

        {/* Señales de confianza */}
        <p className="text-center text-gray-400 text-sm mt-8">
          Pago seguro con Stripe · Cancela en cualquier momento · Sin permanencia mínima
        </p>

        {isAuthenticated && (
          <div className="text-center mt-4">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black underline">
              ← Volver al panel de control
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
