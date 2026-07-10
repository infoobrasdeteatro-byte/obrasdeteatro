'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ESTADOS = [
  { value: 'disponible',               label: 'Disponible' },
  { value: 'parcialmente_disponible',  label: 'Parcialmente disponible' },
  { value: 'no_disponible',            label: 'No disponible' },
  { value: 'buscando_trabajo',         label: 'Buscando proyectos activamente' },
  { value: 'abierto_a_propuestas',     label: 'Abierto a propuestas' },
] as const

const ALCANCES = [
  { value: 'local',                 label: 'Local' },
  { value: 'nacional',              label: 'Nacional' },
  { value: 'internacional',         label: 'Internacional' },
  { value: 'remoto',                label: 'Remoto / Online' },
  { value: 'nacional_internacional', label: 'Nacional e internacional' },
] as const

interface AvailabilityData {
  id?: string
  estado: string
  alcance: string
  nota: string | null
}

interface Props {
  profileId: string
  initialData: AvailabilityData | null
}

export default function DisponibilidadEditor({ profileId, initialData }: Props) {
  const [estado, setEstado]   = useState(initialData?.estado ?? 'abierto_a_propuestas')
  const [alcance, setAlcance] = useState(initialData?.alcance ?? 'nacional')
  const [nota, setNota]       = useState(initialData?.nota ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase
      .from('profile_availability')
      .upsert(
        {
          profile_id: profileId,
          estado,
          alcance,
          nota: nota.trim() || null,
        },
        { onConflict: 'profile_id' }
      )

    if (error) {
      setMessage('Error al guardar: ' + error.message)
      setIsError(true)
    } else {
      setMessage('Disponibilidad actualizada correctamente')
      setIsError(false)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleGuardar} className="account-card ds-form">
      <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: '24px', lineHeight: 1.6 }}>
        Indica tu situación actual de disponibilidad. Esta información aparecerá en tu perfil público.
      </p>

      <div className="ds-form-group">
        <label className="ds-label">Estado de disponibilidad</label>
        <select value={estado} onChange={e => setEstado(e.target.value)} className="ds-select">
          {ESTADOS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="ds-form-group">
        <label className="ds-label">Alcance geográfico</label>
        <select value={alcance} onChange={e => setAlcance(e.target.value)} className="ds-select">
          {ALCANCES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="ds-form-group">
        <label className="ds-label">
          Nota adicional
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400, marginLeft: '8px' }}>
            {nota.length}/300
          </span>
        </label>
        <textarea
          value={nota}
          onChange={e => setNota(e.target.value)}
          maxLength={300}
          rows={3}
          className="ds-textarea"
          placeholder="Disponible para colaboraciones en Madrid a partir de septiembre..."
        />
      </div>

      <button type="submit" disabled={loading} className="ds-btn-primary">
        {loading ? 'Guardando...' : 'Guardar disponibilidad'}
      </button>

      {message && (
        <div className={isError ? 'ds-alert-error' : 'ds-alert-success'}>
          {message}
        </div>
      )}
    </form>
  )
}
