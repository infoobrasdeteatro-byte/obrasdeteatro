'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  profileId: string
  initialData: {
    id: string
    biografia: string | null
    trayectoria: string | null
    formacion: string | null
  } | null
}

export default function DirectorProSection({ profileId, initialData }: Props) {
  const [rowId, setRowId] = useState<string | null>(initialData?.id ?? null)
  const [biografia, setBiografia] = useState(initialData?.biografia ?? '')
  const [trayectoria, setTrayectoria] = useState(initialData?.trayectoria ?? '')
  const [formacion, setFormacion] = useState(initialData?.formacion ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    const now = new Date().toISOString()
    let error = null

    if (rowId) {
      const result = await supabase
        .from('perfil_director')
        .update({
          biografia: biografia || null,
          trayectoria: trayectoria || null,
          formacion: formacion || null,
          updated_at: now,
        })
        .eq('id', rowId)
      error = result.error
    } else {
      const result = await supabase
        .from('perfil_director')
        .insert({
          user_id: profileId,
          biografia: biografia || null,
          trayectoria: trayectoria || null,
          formacion: formacion || null,
          updated_at: now,
        })
        .select('id')
        .single()
      error = result.error
      if (!error && result.data) {
        setRowId(result.data.id)
      }
    }

    if (error) {
      setMessage('Error al guardar: ' + error.message)
      setIsError(true)
    } else {
      setMessage('¡Información profesional actualizada!')
      setIsError(false)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleGuardar} className="account-card ds-form" style={{ marginTop: '16px' }}>
      <h2 style={{
        fontFamily: 'var(--serif)',
        fontSize: '20px',
        color: 'var(--black)',
        letterSpacing: '-0.3px',
        marginBottom: '24px',
      }}>
        Información profesional
      </h2>

      <div className="ds-form-group">
        <label className="ds-label">Biografía profesional</label>
        <textarea
          value={biografia}
          onChange={e => setBiografia(e.target.value)}
          rows={6}
          className="ds-textarea"
          placeholder="Describe tu carrera artística, enfoque estético y visión como director/a escénico..."
        />
      </div>

      <div className="ds-form-group">
        <label className="ds-label">Trayectoria profesional</label>
        <textarea
          value={trayectoria}
          onChange={e => setTrayectoria(e.target.value)}
          rows={6}
          className="ds-textarea"
          placeholder="Producciones, compañías, teatros y proyectos más destacados de tu carrera..."
        />
      </div>

      <div className="ds-form-group">
        <label className="ds-label">Formación académica</label>
        <textarea
          value={formacion}
          onChange={e => setFormacion(e.target.value)}
          rows={4}
          className="ds-textarea"
          placeholder="Escuelas, conservatorios, cursos y formación especializada en dirección escénica..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="ds-btn-primary"
      >
        {loading ? 'Guardando...' : 'Guardar información profesional'}
      </button>

      {message && (
        <div className={isError ? 'ds-alert-error' : 'ds-alert-success'}>
          {message}
        </div>
      )}
    </form>
  )
}
