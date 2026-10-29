'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cambiarCategoria, cambiarEstado, guardarNota, marcarLeido } from './acciones'
import type { EstadoCorreo } from '@/lib/correo/presentacion'

type Props = {
  id: string
  estado: EstadoCorreo
  categoria: 'persona' | 'servicio'
  nota: string | null
  responder: string | null
  esGmail: boolean
}

/** Botones del detalle de un correo. Al abrir uno nuevo, pasa a leído. */
export default function AccionesCorreo({ id, estado, categoria, nota, responder, esGmail }: Props) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [texto, setTexto] = useState(nota ?? '')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const yaMarcado = useRef(false)

  useEffect(() => {
    if (estado !== 'nuevo' || yaMarcado.current) return
    yaMarcado.current = true
    void marcarLeido(id).then(r => { if ('ok' in r) router.refresh() })
  }, [estado, id, router])

  const ejecutar = (accion: () => Promise<{ ok: true } | { error: string }>, hecho: string) => iniciar(async () => {
    const r = await accion()
    setAviso('error' in r ? { tipo: 'error', texto: r.error } : { tipo: 'ok', texto: hecho })
    if ('ok' in r) router.refresh()
  })

  const boton = { padding: '8px 14px', fontSize: '13px', width: 'auto' } as const

  return (
    <div className="account-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {responder && (
          <a href={responder} className="ds-btn-primary" style={boton}
            {...(esGmail ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            Responder{esGmail ? ' en Gmail' : ''}
          </a>
        )}
        {estado !== 'atendido' && (
          <button type="button" className="ds-btn-secondary" style={boton} disabled={pendiente}
            onClick={() => ejecutar(() => cambiarEstado(id, 'atendido'), 'Marcado como atendido.')}>Marcar como atendido</button>
        )}
        {estado !== 'archivado' && (
          <button type="button" className="ds-btn-secondary" style={boton} disabled={pendiente}
            onClick={() => ejecutar(() => cambiarEstado(id, 'archivado'), 'Archivado.')}>Archivar</button>
        )}
        {estado !== 'nuevo' && (
          <button type="button" className="ds-btn-secondary" style={boton} disabled={pendiente}
            onClick={() => ejecutar(() => cambiarEstado(id, 'nuevo'), 'Vuelve a estar como nuevo.')}>Volver a nuevo</button>
        )}
        <button type="button" className="ds-btn-secondary" style={boton} disabled={pendiente}
          onClick={() => ejecutar(() => cambiarCategoria(id, categoria === 'persona' ? 'servicio' : 'persona'),
            categoria === 'persona' ? 'Movido a Servicios.' : 'Movido a Personas.')}>
          {categoria === 'persona' ? 'Es de un servicio' : 'Es de una persona'}
        </button>
      </div>

      <div>
        <label htmlFor="nota-interna" className="obras-stat-label" style={{ display: 'block' }}>Nota interna</label>
        <textarea id="nota-interna" className="ds-textarea" value={texto} maxLength={4000} rows={3}
          onChange={e => setTexto(e.target.value)} placeholder="Solo la ve administración." style={{ minHeight: '72px' }} />
        <button type="button" className="ds-btn-secondary" style={{ ...boton, marginTop: '8px' }}
          disabled={pendiente || texto.trim() === (nota ?? '').trim()}
          onClick={() => ejecutar(() => guardarNota(id, texto), 'Nota guardada.')}>Guardar nota</button>
      </div>

      {aviso && (
        <div className={aviso.tipo === 'ok' ? 'ds-alert-success' : 'ds-alert-error'} role="status">{aviso.texto}</div>
      )}
    </div>
  )
}
