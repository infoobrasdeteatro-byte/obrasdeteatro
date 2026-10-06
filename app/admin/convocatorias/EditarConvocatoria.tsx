'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/geo/countries'
import { CATEGORIAS } from '@/components/convocatorias/vocabulario'
import { MAX_CIUDAD, MAX_RESUMEN, MAX_TITULO } from '@/lib/convocatorias/importacion'
import { type CamposEdicion, cambiosDeEdicion, validarEdicion } from './edicion'

/**
 * Modo «Editar» de una convocatoria de la Redacción antes de aprobarla.
 *
 * Guarda con la sesión del moderador: la política «Moderación gestiona
 * convocatorias» y el trigger deciden. El UPDATE no lleva `estado` y se limita
 * a filas en revisión: si otra persona la aprobó o rechazó mientras tanto, no
 * se toca y se avisa.
 */
export default function EditarConvocatoria({
  id,
  inicial,
  onGuardada,
  onCancelar,
}: {
  id: string
  inicial: CamposEdicion
  onGuardada: () => void
  onCancelar: () => void
}) {
  const [c, setC] = useState<CamposEdicion>(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof CamposEdicion>(k: K, v: CamposEdicion[K]) => setC(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    setError('')
    const problema = validarEdicion(c)
    if (problema) {
      setError(problema)
      return
    }

    setGuardando(true)
    const { data, error: err } = await createClient()
      .from('calls')
      .update(cambiosDeEdicion(c))
      .eq('id', id)
      .eq('estado', 'pendiente_revision')
      .select('id')
      .maybeSingle()
    setGuardando(false)

    if (err) {
      setError(err.message.includes('row-level security')
        ? 'Tu cuenta no tiene permiso de moderación sobre esta convocatoria.'
        : err.message)
      return
    }
    if (!data) {
      setError('No se guardó: esta convocatoria ya no está en revisión (otra persona la ha aprobado o rechazado).')
      return
    }
    onGuardada()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
      <div className="ds-form-group">
        <label className="ds-label" htmlFor={`editar-titulo-${id}`}>Título</label>
        <input id={`editar-titulo-${id}`} className="ds-input" maxLength={MAX_TITULO}
          value={c.title} onChange={e => set('title', e.target.value)} />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor={`editar-resumen-${id}`}>Resumen</label>
        <textarea id={`editar-resumen-${id}`} className="ds-textarea" rows={5} maxLength={MAX_RESUMEN}
          value={c.description} onChange={e => set('description', e.target.value)} />
        <p className="ds-form-hint" aria-live="polite"
          style={{ color: MAX_RESUMEN - c.description.length < 40 ? 'var(--red-h)' : undefined }}>
          {c.description.length} / {MAX_RESUMEN} caracteres
        </p>
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor={`editar-categoria-${id}`}>Categoría</label>
          <select id={`editar-categoria-${id}`} className="ds-select"
            value={c.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIAS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor={`editar-fecha-${id}`}>Fecha límite</label>
          <input id={`editar-fecha-${id}`} className="ds-input" type="date"
            value={c.fecha_limite} onChange={e => set('fecha_limite', e.target.value)} />
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor={`editar-pais-${id}`}>País</label>
          <select id={`editar-pais-${id}`} className="ds-select"
            value={c.pais_code} onChange={e => set('pais_code', e.target.value)}>
            {COUNTRIES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor={`editar-ciudad-${id}`}>Ciudad</label>
          <input id={`editar-ciudad-${id}`} className="ds-input" maxLength={MAX_CIUDAD}
            value={c.ciudad} onChange={e => set('ciudad', e.target.value)} placeholder="Opcional" />
        </div>
      </div>

      {error && <div className="ds-alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" className="ds-btn-primary" disabled={guardando}
          style={{ width: 'auto', padding: '9px 18px', fontSize: '13px' }}
          onClick={guardar}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button type="button" className="ds-btn-secondary" disabled={guardando}
          style={{ padding: '9px 18px', fontSize: '13px' }}
          onClick={onCancelar}>
          Cancelar
        </button>
      </div>
      <p className="ds-form-hint">Guardar no publica: la convocatoria sigue en revisión hasta que pulses «Aprobar y publicar».</p>
    </div>
  )
}
