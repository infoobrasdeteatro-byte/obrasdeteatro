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
                    disabled={isLoading || !!loadingPlan}
                    className="w-full py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Redirigiendo a Stripe…' : 'Suscribirse'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Señales de confianza */}
        <p className="text-center text-gray-400 text-sm mt-12">
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
