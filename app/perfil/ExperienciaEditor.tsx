'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const TIPO_OPTIONS = [
  { value: 'actuacion',  label: 'Actuación' },
  { value: 'direccion',  label: 'Dirección escénica' },
  { value: 'dramaturgia', label: 'Dramaturgia' },
  { value: 'produccion', label: 'Producción' },
  { value: 'tecnico',    label: 'Técnico escénico' },
  { value: 'gestion',    label: 'Gestión cultural' },
  { value: 'docencia',   label: 'Docencia' },
  { value: 'otro',       label: 'Otro' },
] as const

const TIPO_LABEL: Record<string, string> = {
  actuacion: 'Actuación', direccion: 'Dirección', dramaturgia: 'Dramaturgia',
  produccion: 'Producción', tecnico: 'Técnico', gestion: 'Gestión',
  docencia: 'Docencia', otro: 'Otro',
}

interface Experience {
  id: string
  tipo: string
  titulo: string
  organizacion: string | null
  descripcion: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  en_curso: boolean
}

interface Props {
  profileId: string
  plan: string
  initialData: Experience[]
}

const MAX_GRATUITO = 5

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

export default function ExperienciaEditor({ profileId, plan, initialData }: Props) {
  const [entries, setEntries]   = useState<Experience[]>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage]   = useState('')
  const [isError, setIsError]   = useState(false)

  // Form state
  const [tipo, setTipo]               = useState('actuacion')
  const [titulo, setTitulo]           = useState('')
  const [organizacion, setOrganizacion] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin]       = useState('')
  const [enCurso, setEnCurso]         = useState(false)

  const isPremium = plan !== 'gratuito'
  const canAdd    = isPremium || entries.length < MAX_GRATUITO

  const resetForm = () => {
    setTipo('actuacion')
    setTitulo('')
    setOrganizacion('')
    setDescripcion('')
    setFechaInicio('')
    setFechaFin('')
    setEnCurso(false)
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
      .from('professional_experience')
      .insert({
        profile_id:   profileId,
        tipo,
        titulo:       titulo.trim(),
        organizacion: organizacion.trim() || null,
        descripcion:  descripcion.trim() || null,
        fecha_inicio: toDateStr(fechaInicio),
        fecha_fin:    enCurso ? null : toDateStr(fechaFin),
        en_curso:     enCurso,
      })
      .select('id, tipo, titulo, organizacion, descripcion, fecha_inicio, fecha_fin, en_curso')
      .single()

    if (error) {
      setMessage('Error: ' + error.message)
      setIsError(true)
    } else if (data) {
      setEntries(prev => [data, ...prev])
      resetForm()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase  = createClient()
    const { error } = await supabase.from('professional_experience').delete().eq('id', id)
    if (!error) setEntries(prev => prev.filter(e => e.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="account-card">
      <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '24px', lineHeight: 1.6 }}>
        Registra tu trayectoria en el sector escénico. Cada entrada se muestra como un módulo en tu perfil.
        {!isPremium && (
          <>
            {' '}· Plan Gratuito: hasta {MAX_GRATUITO} entradas.{' '}
            <Link href="/precios" style={{ color: 'var(--black)', fontWeight: 500 }}>Ampliar →</Link>
          </>
        )}
      </p>

      {/* Lista de entradas */}
      {entries.length > 0 && (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entries.map(entry => (
            <div
              key={entry.id}
              style={{
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                padding: '12px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--white)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    {TIPO_LABEL[entry.tipo] ?? entry.tipo}
                  </span>
                  {(entry.fecha_inicio || entry.en_curso) && (
                    <>
                      <span style={{ fontSize: '10px', color: 'var(--border)' }}>·</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {formatDateRange(entry.fecha_inicio, entry.fecha_fin, entry.en_curso)}
                      </span>
                    </>
                  )}
                </div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--black)', fontFamily: 'var(--sans)', marginBottom: entry.organizacion ? '2px' : 0 }}>
                  {entry.titulo}
                </p>
                {entry.organizacion && (
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{entry.organizacion}</p>
                )}
                {entry.descripcion && (
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', lineHeight: '1.5' }}>
                    {entry.descripcion}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                aria-label="Eliminar entrada"
                style={{ fontSize: '13px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 4px' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón añadir o gate */}
      {!showForm && (
        canAdd ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="ds-btn-secondary"
            style={{ width: 'auto', padding: '9px 16px', fontSize: '13px' }}
          >
            + Añadir experiencia
          </button>
        ) : (
          <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--off)', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
              Has alcanzado el límite de {MAX_GRATUITO} entradas del plan Gratuito.
            </p>
            <Link href="/precios" className="ds-btn-secondary" style={{ width: 'auto', display: 'inline-block', padding: '8px 16px', fontSize: '13px' }}>
              Ampliar con Premium →
            </Link>
          </div>
        )
      )}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleAdd} className="ds-form" style={{ borderTop: entries.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: entries.length > 0 ? '20px' : 0 }}>
          <div className="ds-form-grid">
            <div className="ds-form-group">
              <label className="ds-label">Tipo *</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="ds-select">
                {TIPO_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="ds-form-group">
              <label className="ds-label">Título / Cargo *</label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                required
                maxLength={200}
                className="ds-input"
                placeholder="Actor protagonista, Directora de escena..."
              />
            </div>
          </div>

          <div className="ds-form-group">
            <label className="ds-label">Compañía / Teatro / Producción</label>
            <input
              type="text"
              value={organizacion}
              onChange={e => setOrganizacion(e.target.value)}
              maxLength={200}
              className="ds-input"
              placeholder="Teatro Nacional, Compañía XYZ..."
            />
          </div>

          <div className="ds-form-grid">
            <div className="ds-form-group">
              <label className="ds-label">Fecha inicio</label>
              <input
                type="month"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="ds-input"
              />
            </div>
            <div className="ds-form-group">
              <label className="ds-label">Fecha fin</label>
              <input
                type="month"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                disabled={enCurso}
                className="ds-input"
              />
            </div>
          </div>

          <div className="ds-checkbox-row">
            <input
              type="checkbox"
              id="en_curso_exp"
              checked={enCurso}
              onChange={e => setEnCurso(e.target.checked)}
            />
            <label htmlFor="en_curso_exp" className="ds-checkbox-label">En curso actualmente</label>
          </div>

          <div className="ds-form-group">
            <label className="ds-label">Descripción</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={3}
              maxLength={1000}
              className="ds-textarea"
              placeholder="Descripción del trabajo realizado..."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={saving || !titulo.trim()}
              className="ds-btn-primary"
              style={{ width: 'auto', padding: '10px 18px' }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="ds-btn-secondary"
              style={{ width: 'auto', padding: '10px 16px' }}
            >
              Cancelar
            </button>
          </div>

          {message && (
            <div className={isError ? 'ds-alert-error' : 'ds-alert-success'}>{message}</div>
          )}
        </form>
      )}
    </div>
  )
}
