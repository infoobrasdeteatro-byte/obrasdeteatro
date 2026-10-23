'use client'

import { useState, useTransition } from 'react'
import { resolverVerificacion } from './acciones'

export default function ResolverVerificacion({ id }: { id: string }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [hecho, setHecho] = useState<string | null>(null)
  const [enCurso, start] = useTransition()

  const resolver = (aprobar: boolean) => {
    setError('')
    if (!aprobar && !motivo.trim()) { setError('Escribe el motivo del rechazo (se envía al usuario).'); return }
    start(async () => {
      const r = await resolverVerificacion(id, aprobar, motivo)
      if ('error' in r) setError(r.error)
      else setHecho(aprobar ? 'Aprobada: el sello ya está activo.' : 'Rechazada: se ha avisado al usuario.')
    })
  }

  if (hecho) return <div className="ds-alert-success">{hecho}</div>

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" className="ds-btn-primary" style={{ width: 'auto', padding: '8px 16px' }} disabled={enCurso} onClick={() => resolver(true)}>
        Aprobar
      </button>
      <input
        className="ds-input"
        style={{ flex: '1 1 240px' }}
        placeholder="Motivo del rechazo (obligatorio para rechazar)"
        value={motivo}
        onChange={e => setMotivo(e.target.value)}
        maxLength={500}
      />
      <button type="button" className="ds-btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} disabled={enCurso} onClick={() => resolver(false)}>
        Rechazar
      </button>
      {error && <div className="ds-alert-error" style={{ width: '100%' }}>{error}</div>}
    </div>
  )
}
