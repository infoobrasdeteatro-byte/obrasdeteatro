'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Training {
  id: string
  titulo: string
  institucion: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  en_curso: boolean
  descripcion: string | null
}

interface Award {
  id: string
  nombre: string
  entidad: string | null
  anio: number | null
  descripcion: string | null
}

interface Props {
  profileId: string
  initialTraining: Training[]
  initialAwards: Award[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(month: string): string | null {
  return month ? `${month}-01` : null
}

function formatDateRange(inicio: string | null, fin: string | null, enCurso: boolean): string {
  const fmt = (d: string) => {
    const [y, m] = d.split('-')
    return `${m}/${y}`
  }
  if (!inicio) return enCurso ? 'En curso' : ''
  if (enCurso) return `${fmt(inicio)} — Actualidad`
  if (!fin) return fmt(inicio)
  return `${fmt(inicio)} — ${fmt(fin)}`
}

// ── Formación section ─────────────────────────────────────────────────────────

function FormacionSection({ profileId, initial }: { profileId: string; initial: Training[] }) {
  const [items, setItems]           = useState<Training[]>(initial)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage]       = useState('')
  const [isError, setIsError]       = useState(false)

  const [titulo, setTitulo]         = useState('')
  const [institucion, setInstitucion] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin]     = useState('')
  const [enCurso, setEnCurso]       = useState(false)
  const [descripcion, setDescripcion] = useState('')

  const resetForm = () => {
    setTitulo('')
    setInstitucion('')
    setFechaInicio('')
    setFechaFin('')
    setEnCurso(false)
    setDescripcion('')
    setShowForm(false)
    setMessage('')
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return
    setSaving(true)
    setMessage('')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('profile_training')
      .insert({
        profile_id:   profileId,
        titulo:       titulo.trim(),
        institucion:  institucion.trim() || null,
        fecha_inicio: toDateStr(fechaInicio),
        fecha_fin:    enCurso ? null : toDateStr(fechaFin),
        en_curso:     enCurso,
        descripcion:  descripcion.trim() || null,
      })
      .select('id, titulo, institucion, fecha_inicio, fecha_fin, en_curso, descripcion')
      .single()

    if (error) {
      setMessage('Error: ' + error.message)
      setIsError(true)
    } else if (data) {
      setItems(prev => [data, ...prev])
      resetForm()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase  = createClient()
    const { error } = await supabase.from('profile_training').delete().eq('id', id)
    if (!error) setItems(prev => prev.filter(t => t.id !== id))
    setDeletingId(null)
  }

  return (
    <div>
      {items.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                padding: '12px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--white)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--black)', marginBottom: item.institucion ? '2px' : 0 }}>
                  {item.titulo}
                </p>
                {item.institucion && (
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{item.institucion}</p>
                )}
                {(item.fecha_inicio || item.en_curso) && (
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                    {formatDateRange(item.fecha_inicio, item.fecha_fin, item.en_curso)}
                  </p>
                )}
                {item.descripcion && (
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', lineHeight: '1.5' }}>
                    {item.descripcion}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                aria-label="Eliminar"
                style={{ fontSize: '13px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 4px' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="ds-btn-secondary"
          style={{ width: 'auto', padding: '8px 14px', fontSize: '13px' }}
        >
          + Añadir formación
        </button>
      ) : (
        <form onSubmit={handleAdd} className="ds-form" style={{ borderTop: items.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: items.length > 0 ? '16px' : 0 }}>
          <div className="ds-form-group">
            <label className="ds-label">Título / Curso *</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={200} className="ds-input" placeholder="Grado en Arte Dramático, Máster en Dirección..." />
          </div>
          <div className="ds-form-group">
            <label className="ds-label">Centro / Institución</label>
            <input type="text" value={institucion} onChange={e => setInstitucion(e.target.value)} maxLength={200} className="ds-input" placeholder="RESAD, Conservatorio Superior..." />
          </div>
          <div className="ds-form-grid">
            <div className="ds-form-group">
              <label className="ds-label">Inicio</label>
              <input type="month" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="ds-input" />
            </div>
            <div className="ds-form-group">
              <label className="ds-label">Fin</label>
              <input type="month" value={fechaFin} onChange={e => setFechaFin(e.target.value)} disabled={enCurso} className="ds-input" />
            </div>
          </div>
          <div className="ds-checkbox-row">
            <input type="checkbox" id="en_curso_form" checked={enCurso} onChange={e => setEnCurso(e.target.checked)} />
            <label htmlFor="en_curso_form" className="ds-checkbox-label">En curso actualmente</label>
          </div>
          <div className="ds-form-group">
            <label className="ds-label">Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} maxLength={500} className="ds-textarea" placeholder="Especialización, mención..." />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={saving || !titulo.trim()} className="ds-btn-primary" style={{ width: 'auto', padding: '9px 16px' }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={resetForm} className="ds-btn-secondary" style={{ width: 'auto', padding: '9px 14px' }}>
              Cancelar
            </button>
          </div>
          {message && <div className={isError ? 'ds-alert-error' : 'ds-alert-success'}>{message}</div>}
        </form>
      )}
    </div>
  )
}

// ── Premios section ───────────────────────────────────────────────────────────

function PremiosSection({ profileId, initial }: { profileId: string; initial: Award[] }) {
  const [items, setItems]           = useState<Award[]>(initial)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage]       = useState('')
  const [isError, setIsError]       = useState(false)

  const [nombre, setNombre]         = useState('')
  const [entidad, setEntidad]       = useState('')
  const [anio, setAnio]             = useState('')
  const [descripcion, setDescripcion] = useState('')

  const resetForm = () => {
    setNombre('')
    setEntidad('')
    setAnio('')
    setDescripcion('')
    setShowForm(false)
    setMessage('')
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    setMessage('')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('profile_awards')
      .insert({
        profile_id:  profileId,
        nombre:      nombre.trim(),
        entidad:     entidad.trim() || null,
        anio:        anio ? parseInt(anio, 10) : null,
        descripcion: descripcion.trim() || null,
      })
      .select('id, nombre, entidad, anio, descripcion')
      .single()

    if (error) {
      setMessage('Error: ' + error.message)
      setIsError(true)
    } else if (data) {
      setItems(prev => [data, ...prev])
      resetForm()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase  = createClient()
    const { error } = await supabase.from('profile_awards').delete().eq('id', id)
    if (!error) setItems(prev => prev.filter(a => a.id !== id))
    setDeletingId(null)
  }

  return (
    <div>
      {items.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                padding: '12px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--white)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--black)', marginBottom: '2px' }}>
                  {item.nombre}
                  {item.anio && (
                    <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)', marginLeft: '8px' }}>{item.anio}</span>
                  )}
                </p>
                {item.entidad && (
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{item.entidad}</p>
                )}
                {item.descripcion && (
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', lineHeight: '1.5' }}>
                    {item.descripcion}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                aria-label="Eliminar"
                style={{ fontSize: '13px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 4px' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="ds-btn-secondary"
          style={{ width: 'auto', padding: '8px 14px', fontSize: '13px' }}
        >
          + Añadir premio
        </button>
      ) : (
        <form onSubmit={handleAdd} className="ds-form" style={{ borderTop: items.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: items.length > 0 ? '16px' : 0 }}>
          <div className="ds-form-grid">
            <div className="ds-form-group">
              <label className="ds-label">Premio / Reconocimiento *</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required maxLength={200} className="ds-input" placeholder="Premio MAX de las Artes Escénicas..." />
            </div>
            <div className="ds-form-group">
              <label className="ds-label">Año</label>
              <input type="number" value={anio} onChange={e => setAnio(e.target.value)} min={1900} max={2100} className="ds-input" placeholder="2024" />
            </div>
          </div>
          <div className="ds-form-group">
            <label className="ds-label">Entidad / Organización</label>
            <input type="text" value={entidad} onChange={e => setEntidad(e.target.value)} maxLength={200} className="ds-input" placeholder="Academia de las Artes Escénicas..." />
          </div>
          <div className="ds-form-group">
            <label className="ds-label">Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} maxLength={500} className="ds-textarea" placeholder="Categoría, motivo..." />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={saving || !nombre.trim()} className="ds-btn-primary" style={{ width: 'auto', padding: '9px 16px' }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={resetForm} className="ds-btn-secondary" style={{ width: 'auto', padding: '9px 14px' }}>
              Cancelar
            </button>
          </div>
          {message && <div className={isError ? 'ds-alert-error' : 'ds-alert-success'}>{message}</div>}
        </form>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FormacionPremiosEditor({ profileId, initialTraining, initialAwards }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Formación */}
      <div className="account-card">
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px' }}>
            Formación
          </p>
          <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
            Estudios, cursos y talleres que han formado tu perfil profesional.
          </p>
        </div>
        <FormacionSection profileId={profileId} initial={initialTraining} />
      </div>

      {/* Premios */}
      <div className="account-card">
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px' }}>
            Premios y reconocimientos
          </p>
          <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
            Galardones, menciones especiales y reconocimientos de tu trayectoria.
          </p>
        </div>
        <PremiosSection profileId={profileId} initial={initialAwards} />
      </div>

    </div>
  )
}
