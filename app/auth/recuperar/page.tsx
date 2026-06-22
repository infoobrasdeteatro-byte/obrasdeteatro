'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { translateAuthError } from '@/lib/auth-errors'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('expired') === 'true') {
      setMessage('El enlace de recuperación ha expirado. Solicita uno nuevo.')
      setIsError(true)
    }
  }, [])

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
      setIsError(false)
    }
    setLoading(false)
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
            className="w-full border p-3 rounded"
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
          <p className={`mt-4 text-center text-sm ${isError ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </p>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/auth/login" className="underline">Volver al login</Link>
        </p>
      </div>
    </div>
  )
}