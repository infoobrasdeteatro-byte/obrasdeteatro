'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { translateAuthError } from '@/lib/auth-errors'

/**
 * AEC-003 Fase 3 (DA-004): revocación segura sin depender de infraestructura
 * propia -- signOut({ scope: 'others' }) es una capacidad nativa de Supabase
 * Auth que cierra cualquier otra sesión activa sin afectar a la actual.
 */
export default function SesionesPanel() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleCerrarOtras = async () => {
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signOut({ scope: 'others' })

    if (error) {
      setMessage(translateAuthError(error.message))
      setIsSuccess(false)
    } else {
      setMessage('Se han cerrado todas las demás sesiones. Esta sesión sigue activa.')
      setIsSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '420px' }}>
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '16px', color: 'var(--black)', marginBottom: '6px' }}>
          Cerrar todas las demás sesiones
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', lineHeight: 1.6, marginBottom: '14px' }}>
          Si crees que alguien más tiene acceso a tu cuenta, puedes cerrar cualquier otra sesión iniciada en otros dispositivos o navegadores. Esta sesión, la que estás usando ahora, no se verá afectada.
        </p>
        <button onClick={handleCerrarOtras} disabled={loading} className="ds-btn-primary">
          {loading ? 'Cerrando otras sesiones...' : 'Cerrar todas las demás sesiones'}
        </button>
        {message && (
          <p className={`auth-message ${isSuccess ? 'auth-message--success' : 'auth-message--error'}`} style={{ marginTop: '12px' }}>
            {message}
          </p>
        )}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
        Para cerrar únicamente la sesión actual, usa &ldquo;Cerrar sesión&rdquo; en el menú.
      </p>
    </div>
  )
}
