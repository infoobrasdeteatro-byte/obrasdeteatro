'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { cancelarConexion, eliminarConexion, responderConexion, solicitarConexion } from '../red/acciones'
import { MAX_MENSAJE_SOLICITUD } from '@/lib/red/contacto'

export type EstadoConexion = 'conectados' | 'enviada' | 'recibida' | 'ninguna'

interface Props {
  perfilId: string
  nombre: string
  estado: EstadoConexion
  solicitud: string | null
}

const nota: React.CSSProperties = { fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--sans)', lineHeight: 1.5, margin: 0 }
const enlace: React.CSSProperties = { fontSize: '12px', color: 'var(--muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--sans)' }
const boton: React.CSSProperties = { width: 'auto', display: 'inline-flex', padding: '8px 16px', fontSize: '13px' }

/** Conectar: solicitud con mensaje opcional; la otra persona acepta o rechaza. */
export default function ConectarPerfil({ perfilId, nombre, estado: inicial, solicitud }: Props) {
  const [estado, setEstado] = useState<EstadoConexion>(inicial)
  const [abierto, setAbierto] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const ejecutar = (fn: () => Promise<{ ok: boolean; estado?: string; error?: string }>) => startTransition(async () => {
    setError('')
    const r = await fn()
    if (r.ok && r.estado) { setEstado(r.estado as EstadoConexion); setAbierto(false); setMensaje('') }
    else if (!r.ok) setError(r.error ?? 'No se pudo completar.')
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {estado === 'conectados' && (
        <p style={nota}>
          <span style={{ color: '#166534', fontWeight: 600 }}>✓ Conectados.</span>{' '}
          {nombre} forma parte de <Link href="/perfil/red" style={{ color: 'var(--black)' }}>tu red</Link>.{' '}
          <button type="button" style={enlace} disabled={pending}
            onClick={() => { if (window.confirm(`¿Eliminar la conexión con ${nombre}?`)) ejecutar(() => eliminarConexion(perfilId)) }}>
            Eliminar conexión
          </button>
        </p>
      )}

      {estado === 'enviada' && (
        <p style={nota}>
          Solicitud de conexión enviada. {nombre} decidirá si acepta.{' '}
          <button type="button" style={enlace} disabled={pending} onClick={() => ejecutar(() => cancelarConexion(perfilId))}>
            Retirar solicitud
          </button>
        </p>
      )}

      {estado === 'recibida' && solicitud && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ ...nota, color: 'var(--text)' }}>{nombre} quiere conectar contigo.</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="ds-btn-primary" style={boton} disabled={pending} onClick={() => ejecutar(() => responderConexion(solicitud, true))}>
              Aceptar conexión
            </button>
            <button type="button" className="ds-btn-secondary" style={boton} disabled={pending} onClick={() => ejecutar(() => responderConexion(solicitud, false))}>
              Rechazar
            </button>
          </div>
        </div>
      )}

      {estado === 'ninguna' && !abierto && (
        <div>
          <button type="button" className="ds-btn-primary" style={boton} onClick={() => setAbierto(true)}>
            Conectar
          </button>
        </div>
      )}

      {estado === 'ninguna' && abierto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '480px' }}>
          <label htmlFor="mensaje-conexion" style={{ ...nota, color: 'var(--text)' }}>
            Mensaje para {nombre} (opcional)
          </label>
          <textarea
            id="mensaje-conexion"
            value={mensaje}
            onChange={e => setMensaje(e.target.value.slice(0, MAX_MENSAJE_SOLICITUD))}
            rows={3}
            className="ds-input"
            placeholder="Preséntate brevemente: dónde se conocieron, un proyecto en común…"
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" onClick={() => ejecutar(() => solicitarConexion(perfilId, mensaje))} disabled={pending} className="ds-btn-primary" style={boton}>
              {pending ? 'Enviando…' : 'Enviar solicitud'}
            </button>
            <button type="button" onClick={() => setAbierto(false)} disabled={pending}
              style={{ fontSize: '13px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Cancelar
            </button>
            <span style={{ ...nota, marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '11px' }}>{mensaje.length}/{MAX_MENSAJE_SOLICITUD}</span>
          </div>
          <p style={nota}>Conectar no comparte tu teléfono ni tu WhatsApp: eso se pide aparte.</p>
        </div>
      )}

      {error && <p style={{ ...nota, color: '#b91c1c' }}>{error}</p>}
    </div>
  )
}
