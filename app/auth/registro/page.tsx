'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { translateAuthError } from '@/lib/auth-errors'

export default function RegistroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre }
      }
    })

    if (error) {
      setMessage(translateAuthError(error.message))
    } else {
      fetch('/api/auth/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre }),
      }).catch(() => {})
      setMessage('¡Revisa tu email para confirmar tu cuenta!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center mb-6">Crear cuenta</h1>
        <form onSubmit={handleRegistro} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border p-3 rounded placeholder:text-gray-500"
          />
          <input
            type="text"
            placeholder="Tu nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            className="w-full border p-3 rounded placeholder:text-gray-500"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border p-3 rounded placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded font-medium"
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>
        {message && (
          <p className="mt-4 text-center text-sm font-medium">{message}</p>
        )}
        <p className="mt-4 text-center text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}