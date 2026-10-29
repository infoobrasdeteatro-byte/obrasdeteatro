'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { crearTareaAccion } from './acciones'
import { ETIQUETA_PRIORIDAD, MAX_TEXTO, MAX_TITULO, PRIORIDADES, type OrigenTipo } from '@/lib/tareas/tareas'

export type OpcionAsignacion = { valor: string; etiqueta: string }

type Props = {
  inicial: { titulo: string; origen_tipo: OrigenTipo; origen_ref: string; origen_enlace: string }
  opciones: OpcionAsignacion[]
  asignacionInicial: string
}

/** Formulario de tarea nueva. Al crearla, va a su detalle (con aviso si el correo de asignación falló). */
export default function FormularioTarea({ inicial, opciones, asignacionInicial }: Props) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [existente, setExistente] = useState<{ id: string; titulo: string } | null>(null)

  const enviar = (fd: FormData) => iniciar(async () => {
    setError(null)
    const campos = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]))
    const r = await crearTareaAccion({ ...campos, origen_tipo: inicial.origen_tipo, origen_ref: inicial.origen_ref })
    if ('error' in r) { setError(r.error); return }
    if ('existente' in r) { setExistente(r.existente); return }
    router.push(`/admin/tareas/${r.id}${r.aviso ? `?aviso=${r.aviso}` : ''}`)
  })

  if (existente) {
    return (
      <div className="ds-status-banner ds-status-banner--draft">
        <div>
          <div className="ds-status-title">Ya hay una tarea abierta para esto</div>
          <div className="ds-status-hint"><Link href={`/admin/tareas/${existente.id}`} className="table-link">Tarea abierta: {existente.titulo}</Link></div>
        </div>
      </div>
    )
  }

  return (
    <form action={enviar} className="account-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '720px' }}>
      <div>
        <label htmlFor="t-titulo" className="obras-stat-label" style={{ display: 'block' }}>Título</label>
        <input id="t-titulo" name="titulo" className="ds-input" required maxLength={MAX_TITULO} defaultValue={inicial.titulo} />
      </div>
      <div>
        <label htmlFor="t-desc" className="obras-stat-label" style={{ display: 'block' }}>Descripción</label>
        <textarea id="t-desc" name="descripcion" className="ds-textarea" maxLength={MAX_TEXTO} rows={4} placeholder="Qué hay que hacer y cualquier detalle útil." />
      </div>
      <div className="ds-form-grid">
        <div>
          <label htmlFor="t-prioridad" className="obras-stat-label" style={{ display: 'block' }}>Prioridad</label>
          <select id="t-prioridad" name="prioridad" className="ds-select" defaultValue="normal">
            {PRIORIDADES.map(p => <option key={p} value={p}>{ETIQUETA_PRIORIDAD[p]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="t-fecha" className="obras-stat-label" style={{ display: 'block' }}>Fecha límite (opcional)</label>
          <input id="t-fecha" name="fecha_limite" type="date" className="ds-input" />
        </div>
      </div>
      <div>
        <label htmlFor="t-asignacion" className="obras-stat-label" style={{ display: 'block' }}>Asignar a</label>
        <select id="t-asignacion" name="asignacion" className="ds-select" defaultValue={asignacionInicial} disabled={opciones.length === 1}>
          {opciones.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </select>
        {opciones.length === 1 && <input type="hidden" name="asignacion" value={opciones[0].valor} />}
      </div>
      <div>
        <label htmlFor="t-enlace" className="obras-stat-label" style={{ display: 'block' }}>Enlace de origen</label>
        <input id="t-enlace" name="origen_enlace" className="ds-input" defaultValue={inicial.origen_enlace} placeholder="/admin/…" />
        <p className="ds-form-hint">Una ruta de la web, para volver a lo que originó la tarea.</p>
      </div>
      {error && <div className="ds-alert-error" role="alert">{error}</div>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" className="ds-btn-primary" style={{ width: 'auto', padding: '9px 20px' }} disabled={pendiente}>{pendiente ? 'Creando…' : 'Crear tarea'}</button>
        <Link href="/admin/tareas" className="ds-btn-secondary" style={{ width: 'auto', padding: '9px 20px' }}>Cancelar</Link>
      </div>
    </form>
  )
}
