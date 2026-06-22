'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { translateAuthError } from '@/lib/auth-errors'

function RecuperarSpinner({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">{label}</p>
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
  // isExpiredLink leído síncronamente → isChecking empieza en true si hay enlace expirado
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center mb-6">Recuperar contraseña</h1>
        <form onSubmit={handleRecuperar} className="space-y-4">
          <input
            type="email"
            placeholder="Tu email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border p-3 rounded placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded font-medium"
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
        {message && (
          <div className={`mt-4 flex items-center justify-center gap-2 text-sm ${isError ? 'text-red-500' : 'text-green-700'}`}>
            {!isError && (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <p className="text-center">{message}</p>
          </div>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/auth/login" className="underline">Volver al login</Link>
        </p>
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
