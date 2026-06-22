'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { translateAuthError } from '@/lib/auth-errors'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionValid(!!user)
    })
  }, [])

  useEffect(() => {
    if (!success) return
    if (countdown === 0) {
      router.push('/dashboard')
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [success, countdown, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(translateAuthError(err.message))
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Contraseña actualizada</h1>
          <p className="text-gray-500 mb-6">Tu contraseña ha sido cambiada correctamente.</p>
          <p className="text-sm text-gray-400 mb-4">Redirigiendo al dashboard en {countdown}...</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-black text-white p-3 rounded font-medium"
          >
            Ir al dashboard ahora
          </button>
        </div>
      </div>
    )
  }

  if (sessionValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Enlace expirado o inválido</h1>
          <p className="text-gray-500 mb-6 text-sm">
            El enlace de recuperación ya fue utilizado o ha caducado.
          </p>
          <Link
            href="/auth/recuperar"
            className="inline-block w-full bg-black text-white p-3 rounded font-medium text-center"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    )
  }

  if (sessionValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow text-center">
          <p className="text-gray-400 text-sm">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center mb-6">Nueva contraseña</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border p-3 rounded"
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={6}
            className="w-full border p-3 rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded font-medium"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
        {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}
