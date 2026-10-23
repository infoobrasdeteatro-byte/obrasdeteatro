'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { responderSolicitudContacto } from './acciones'

/** Aceptar / rechazar una solicitud, o retirar / conceder el acceso después. */
export default function ResponderSolicitud({ id, estado }: { id: string; estado: 'pendiente' | 'aceptada' | 'rechazada' }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const responder = (aceptar: boolean) => startTransition(async () => {
    setError('')
    const r = await responderSolicitudContacto(id, aceptar)
    if (r.ok) router.refresh()
    else setError(r.error ?? 'No se pudo guardar.')
  })

  return (
    <div className="red-acciones">
      {estado !== 'aceptada' && (
        <button type="button" className="ds-btn-primary" disabled={pending} onClick={() => responder(true)}>
          {estado === 'pendiente' ? 'Aceptar y compartir' : 'Compartir mi contacto'}
        </button>
      )}
      {estado === 'pendiente' && (
        <button type="button" className="ds-btn-secondary" disabled={pending} onClick={() => responder(false)}>
          Rechazar
        </button>
      )}
      {estado === 'aceptada' && (
        <button type="button" className="red-enlace" disabled={pending} onClick={() => responder(false)}>
          Retirar acceso
        </button>
      )}
      {error && <span className="red-error">{error}</span>}
    </div>
  )
}
