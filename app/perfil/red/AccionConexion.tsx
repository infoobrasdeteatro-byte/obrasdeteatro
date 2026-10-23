'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelarConexion, eliminarConexion, responderConexion } from './acciones'

type Props =
  | { tipo: 'recibida'; id: string; otroId: string; nombre: string }
  | { tipo: 'conectados' | 'enviada'; id?: string; otroId: string; nombre: string }

/** Aceptar / rechazar una solicitud, retirar la mía o eliminar una conexión. */
export default function AccionConexion(p: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const ejecutar = (fn: () => Promise<{ ok: boolean; error?: string }>) => startTransition(async () => {
    setError('')
    const r = await fn()
    if (r.ok) router.refresh()
    else setError(r.error ?? 'No se pudo guardar.')
  })

  return (
    <div className="red-acciones">
      {p.tipo === 'recibida' && (
        <>
          <button type="button" className="ds-btn-primary" disabled={pending} onClick={() => ejecutar(() => responderConexion(p.id, true))}>
            Aceptar conexión
          </button>
          <button type="button" className="ds-btn-secondary" disabled={pending} onClick={() => ejecutar(() => responderConexion(p.id, false))}>
            Rechazar
          </button>
        </>
      )}
      {p.tipo === 'enviada' && (
        <button type="button" className="red-enlace" disabled={pending} onClick={() => ejecutar(() => cancelarConexion(p.otroId))}>
          Retirar solicitud
        </button>
      )}
      {p.tipo === 'conectados' && (
        <button type="button" className="red-enlace" disabled={pending}
          onClick={() => { if (window.confirm(`¿Eliminar la conexión con ${p.nombre}?`)) ejecutar(() => eliminarConexion(p.otroId)) }}>
          Eliminar conexión
        </button>
      )}
      {error && <span className="red-error">{error}</span>}
    </div>
  )
}
