'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/geo/countries'
import { MAX_RESUMEN, MAX_TITULAR } from '@/lib/noticias/importacion'
import {
  type CamposEdicion,
  type CategoriaOpcion,
  cambiosDeEdicion,
  categoriasParaEditar,
  contadorResumen,
  validarEdicion,
} from './edicion'

/**
 * Modo «Editar» de una candidata: titular, resumen, categoría y país.
 *
 * Guarda con la sesión del moderador. El UPDATE no lleva `estado` y se limita
 * a filas en estado 'candidata': si otra persona la publicó o descartó
 * mientras tanto, no se toca y se avisa.
 */
export default function EditarCandidata({
  id,
  inicial,
  categorias,
  onGuardada,
  onCancelar,
}: {
  id: string
  inicial: CamposEdicion
  categorias: CategoriaOpcion[]
  onGuardada: () => void
  onCancelar: () => void
}) {
  const [c, setC] = useState<CamposEdicion>(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const opciones = categoriasParaEditar(categorias, inicial.categoria_id)
  const set = <K extends keyof CamposEdicion>(k: K, v: CamposEdicion[K]) => setC(p => ({ ...p, [k]: v }))

  const guardar = async () => {
    setError('')
    const problema = validarEdicion(c, new Set(opciones.map(o => o.id)))
    if (problema) {
      setError(problema)
      return
    }

    setGuardando(true)
    const { data, error: err } = await createClient()
      .from('noticias')
      .update(cambiosDeEdicion(c))
      .eq('id', id)
      .eq('estado', 'candidata')
      .select('id')
      .maybeSingle()
    setGuardando(false)

    if (err) {
      setError(err.message.includes('row-level security')
        ? 'Tu cuenta no tiene permiso de moderación sobre esta noticia.'
        : err.message)
      return
    }
    if (!data) {
      setError('No se guardó: esta noticia ya no es candidata (otra persona la ha publicado o descartado).')
      return
    }
    onGuardada()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
      <div className="ds-form-group">
        <label className="ds-label" htmlFor={`editar-titular-${id}`}>Titular</label>
        <input id={`editar-titular-${id}`} className="ds-input" maxLength={MAX_TITULAR}
          value={c.titular} onChange={e => set('titular', e.target.value)} />
      </div>

      <div className="ds-form-group">
        <label className="ds-label" htmlFor={`editar-resumen-${id}`}>Resumen</label>
        <textarea id={`editar-resumen-${id}`} className="ds-textarea" rows={4} maxLength={MAX_RESUMEN}
          value={c.resumen} onChange={e => set('resumen', e.target.value)} />
        <p className="ds-form-hint" aria-live="polite"
          style={{ color: MAX_RESUMEN - c.resumen.length < 40 ? 'var(--red-h)' : undefined }}>
          {contadorResumen(c.resumen)} caracteres
        </p>
      </div>

      <div className="ds-form-grid">
        <div className="ds-form-group">
          <label className="ds-label" htmlFor={`editar-categoria-${id}`}>Categoría</label>
          <select id={`editar-categoria-${id}`} className="ds-select"
            value={c.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
            {opciones.map(o => (
              <option key={o.id} value={o.id}>{o.etiqueta}{o.activo ? '' : ' (desactivada)'}</option>
            ))}
          </select>
        </div>
        <div className="ds-form-group">
          <label className="ds-label" htmlFor={`editar-pais-${id}`}>País</label>
          <select id={`editar-pais-${id}`} className="ds-select"
            value={c.pais_code} onChange={e => set('pais_code', e.target.value)}>
            {COUNTRIES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
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
      <p className="ds-form-hint">Guardar no publica: la noticia sigue como candidata hasta que pulses «Publicar».</p>
    </div>
  )
}
