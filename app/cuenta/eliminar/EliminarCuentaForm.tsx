'use client'

import { useState } from 'react'
import PrepararExtincionPanel from './PrepararExtincionPanel'

/**
 * AEC-003B Fase 2: transición reversible (solicitar/cancelar).
 * AEC-003B Fase 4: cuando ya existe una solicitud, se añade el panel de
 * reautenticación y consentimiento informado -- ver PrepararExtincionPanel.
 */
interface Props {
  extincionSolicitadaAt: string | null
}

export default function EliminarCuentaForm({ extincionSolicitadaAt }: Props) {
  const [solicitada, setSolicitada] = useState(extincionSolicitadaAt)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const solicitar = async () => {
    setLoading(true)
    setMessage('')
    const res = await fetch('/api/cuenta/eliminar/solicitar', { method: 'POST' })
    if (res.ok) {
      setSolicitada(new Date().toISOString())
    } else {
      setMessage('No se pudo registrar la solicitud. Inténtalo de nuevo.')
    }
    setLoading(false)
  }

  const cancelar = async () => {
    setLoading(true)
    setMessage('')
    const res = await fetch('/api/cuenta/eliminar/cancelar', { method: 'POST' })
    if (res.ok) {
      setSolicitada(null)
    } else {
      setMessage('No se pudo cancelar la solicitud. Inténtalo de nuevo.')
    }
    setLoading(false)
  }

  if (solicitada) {
    const fecha = new Date(solicitada).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    return (
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', maxWidth: '420px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: '14px' }}>
          Solicitaste la eliminación de tu cuenta el {fecha}. Tu cuenta sigue activa y funcionando con normalidad.
        </p>
        <button onClick={cancelar} disabled={loading} className="ds-btn-primary">
          {loading ? 'Cancelando...' : 'Cancelar solicitud'}
        </button>
        {message && <p className="auth-message auth-message--error" style={{ marginTop: '12px' }}>{message}</p>}
        <PrepararExtincionPanel />
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', maxWidth: '420px' }}>
      <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '14px' }}>
        Puedes solicitar la eliminación de tu cuenta. Podrás cancelar esta solicitud en cualquier momento mientras el proceso no haya finalizado.
      </p>
      <button onClick={solicitar} disabled={loading} className="ds-btn-primary">
        {loading ? 'Enviando...' : 'Solicitar eliminación de cuenta'}
      </button>
      {message && <p className="auth-message auth-message--error" style={{ marginTop: '12px' }}>{message}</p>}
    </div>
  )
}
