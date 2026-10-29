'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { anadirNotaAccion, cambiarEstadoTareaAccion, reasignarTareaAccion } from './acciones'
import { ESTADOS_TAREA, ETIQUETA_ESTADO_TAREA, MAX_TEXTO, type EstadoTarea } from '@/lib/tareas/tareas'
import type { OpcionAsignacion } from './FormularioTarea'

type Props = {
  id: string
  estado: EstadoTarea
  asignacion: string
  /** Solo admin puede reasignar: si no hay opciones, no se muestra. */
  opciones: OpcionAsignacion[] | null
}

/** Cambio de estado, reasignación (admin) y notas de una tarea. */
export default function AccionesTarea({ id, estado, asignacion, opciones }: Props) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [nota, setNota] = useState('')
  const [destino, setDestino] = useState(asignacion)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const ejecutar = (accion: () => Promise<{ error: string } | { ok: true; aviso?: 'enviado' | 'fallo' | null } | { existente: unknown }>, hecho: string, despues?: () => void) =>
    iniciar(async () => {
      const r = await accion()
      if ('error' in r) { setAviso({ tipo: 'error', texto: r.error }); return }
      const fallo = 'aviso' in r && r.aviso === 'fallo'
      setAviso(fallo
        ? { tipo: 'error', texto: `${hecho} No se pudo enviar el correo de aviso a la persona asignada.` }
        : { tipo: 'ok', texto: 'aviso' in r && r.aviso === 'enviado' ? `${hecho} Se le ha avisado por correo.` : hecho })
      despues?.()
      router.refresh()
    })

  const boton = { padding: '8px 14px', fontSize: '13px', width: 'auto' } as const

  return (
    <div className="account-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div className="obras-stat-label">Estado</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ESTADOS_TAREA.filter(e => e !== estado).map(e => (
            <button key={e} type="button" className="ds-btn-secondary" style={boton} disabled={pendiente}
              onClick={() => ejecutar(() => cambiarEstadoTareaAccion(id, e), `Estado: ${ETIQUETA_ESTADO_TAREA[e].toLowerCase()}.`)}>
              {e === 'resuelta' ? 'Marcar como resuelta' : e === 'en_curso' ? 'Empezar' : e === 'descartada' ? 'Descartar' : 'Volver a pendiente'}
            </button>
          ))}
        </div>
      </div>

      {opciones && (
        <div>
          <label htmlFor="t-reasignar" className="obras-stat-label" style={{ display: 'block' }}>Asignación</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select id="t-reasignar" className="ds-select" style={{ maxWidth: '320px' }} value={destino} onChange={e => setDestino(e.target.value)}>
              {opciones.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
            </select>
            <button type="button" className="ds-btn-secondary" style={boton} disabled={pendiente || destino === asignacion}
              onClick={() => ejecutar(() => reasignarTareaAccion(id, destino), 'Asignación cambiada.')}>Reasignar</button>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="t-nota" className="obras-stat-label" style={{ display: 'block' }}>Añadir nota</label>
        <textarea id="t-nota" className="ds-textarea" value={nota} maxLength={MAX_TEXTO} rows={3} style={{ minHeight: '72px' }}
          onChange={e => setNota(e.target.value)} placeholder="Qué se ha hecho, qué falta…" />
        <button type="button" className="ds-btn-secondary" style={{ ...boton, marginTop: '8px' }} disabled={pendiente || !nota.trim()}
          onClick={() => ejecutar(() => anadirNotaAccion(id, nota), 'Nota añadida.', () => setNota(''))}>Guardar nota</button>
      </div>

      {aviso && <div className={aviso.tipo === 'ok' ? 'ds-alert-success' : 'ds-alert-error'} role="status">{aviso.texto}</div>}
    </div>
  )
}
