'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Work = Database['public']['Tables']['works']['Row']

const GENEROS = [
  'Teatro clásico',
  'Teatro contemporáneo',
  'Comedia',
  'Drama',
  'Tragicomedia',
  'Musical',
  'Teatro infantil / Familiar',
  'Teatro experimental',
  'Monólogo',
  'Teatro físico / Danza teatro',
  'Ópera',
  'Zarzuela',
  'Teatro del absurdo',
  'Teatro documental',
  'Performance',
  'Otro',
]

const IDIOMAS = [
  { value: 'es', label: 'Español' },
  { value: 'ca', label: 'Catalán' },
  { value: 'eu', label: 'Euskera' },
  { value: 'gl', label: 'Gallego' },
  { value: 'va', label: 'Valenciano' },
  { value: 'en', label: 'Inglés' },
  { value: 'fr', label: 'Francés' },
  { value: 'pt', label: 'Portugués' },
  { value: 'de', label: 'Alemán' },
  { value: 'it', label: 'Italiano' },
  { value: 'otro', label: 'Otro' },
]

export default function EditarObraForm({ obra }: { obra: Work }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [title, setTitle] = useState(obra.title)
  const [author, setAuthor] = useState(obra.author ?? '')
  const [synopsis, setSynopsis] = useState(obra.synopsis ?? '')
  const [genre, setGenre] = useState(obra.genre ?? '')
  const [language, setLanguage] = useState(obra.language ?? 'es')
  const [duration, setDuration] = useState(obra.duration_minutes?.toString() ?? '')
  const [minAge, setMinAge] = useState(obra.min_age?.toString() ?? '')
  const [castMin, setCastMin] = useState(obra.cast_size_min?.toString() ?? '')
  const [castMax, setCastMax] = useState(obra.cast_size_max?.toString() ?? '')
  const [isPublished, setIsPublished] = useState(obra.is_published ?? false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (castMin && castMax && Number(castMax) < Number(castMin)) {
      setError('El reparto máximo no puede ser menor que el mínimo.')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('works')
      .update({
        title: title.trim(),
        author: author.trim() || null,
        synopsis: synopsis.trim() || null,
        genre: genre || null,
        language,
        duration_minutes: duration ? Number(duration) : null,
        min_age: minAge ? Number(minAge) : null,
        cast_size_min: castMin ? Number(castMin) : null,
        cast_size_max: castMax ? Number(castMax) : null,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq('id', obra.id)

    setSaving(false)

    if (updateError) {
      setError('Error al guardar: ' + updateError.message)
    } else {
      setMessage('Cambios guardados correctamente')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${obra.title}"? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    const supabase = createClient()
    await supabase
      .from('works')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', obra.id)
    router.push('/mis-obras')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Estado de publicación */}
      <div className={`ds-status-banner ${isPublished ? 'ds-status-banner--published' : 'ds-status-banner--draft'}`}>
        <div>
          <p className="ds-status-title">
            {isPublished ? 'Obra publicada' : 'Borrador privado'}
          </p>
          <p className="ds-status-hint">
            {isPublished ? 'Visible públicamente en ObrasDeTeatro' : 'Solo tú puedes verla'}
          </p>
        </div>
        {obra.is_published && obra.slug && (
          <Link
            href={`/obras/${obra.slug}`}
            target="_blank"
            className="table-link"
          >
            Ver publicada →
          </Link>
        )}
      </div>

      <form onSubmit={handleSave} className="account-card ds-form">

        <div className="ds-form-group">
          <label className="ds-label">Título *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={200}
            className="ds-input"
          />
        </div>

        <div className="ds-form-group">
          <label className="ds-label">Autor / Autora</label>
          <input
            type="text"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            maxLength={200}
            className="ds-input"
          />
        </div>

        <div className="ds-form-group">
          <label className="ds-label">Sinopsis</label>
          <textarea
            value={synopsis}
            onChange={e => setSynopsis(e.target.value)}
            rows={4}
            maxLength={2000}
            className="ds-textarea"
          />
        </div>

        <div className="ds-form-grid">
          <div className="ds-form-group">
            <label className="ds-label">Género</label>
            <select
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="ds-select"
            >
              <option value="">— Sin especificar —</option>
              {GENEROS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="ds-form-group">
            <label className="ds-label">Idioma</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="ds-select"
            >
              {IDIOMAS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ds-form-grid">
          <div className="ds-form-group">
            <label className="ds-label">Duración (minutos)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              min={1}
              max={600}
              className="ds-input"
            />
          </div>
          <div className="ds-form-group">
            <label className="ds-label">Edad mínima recomendada</label>
            <input
              type="number"
              value={minAge}
              onChange={e => setMinAge(e.target.value)}
              min={0}
              max={99}
              className="ds-input"
            />
          </div>
        </div>

        <div className="ds-form-group">
          <label className="ds-label">Tamaño del reparto</label>
          <div className="ds-form-grid">
            <input
              type="number"
              value={castMin}
              onChange={e => setCastMin(e.target.value)}
              min={1}
              placeholder="Mínimo"
              className="ds-input"
            />
            <input
              type="number"
              value={castMax}
              onChange={e => setCastMax(e.target.value)}
              min={1}
              placeholder="Máximo"
              className="ds-input"
            />
          </div>
        </div>

        <div className="ds-checkbox-row">
          <input
            type="checkbox"
            id="is_published"
            checked={isPublished}
            onChange={e => setIsPublished(e.target.checked)}
          />
          <div>
            <label htmlFor="is_published" className="ds-checkbox-label">Publicar obra</label>
            <p className="ds-checkbox-hint">La obra será visible públicamente en ObrasDeTeatro</p>
          </div>
        </div>

        {error && <div className="ds-alert-error">{error}</div>}
        {message && <div className="ds-alert-success">{message}</div>}

        <button
          type="submit"
          disabled={saving}
          className="ds-btn-primary"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>

      </form>

      {/* Zona de peligro */}
      <div className="ds-danger-zone">
        <p className="ds-danger-zone-title">Zona de peligro</p>
        <p className="ds-danger-zone-text">
          Eliminar la obra la retira permanentemente del directorio. No se puede deshacer.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="ds-btn-danger"
        >
          {deleting ? 'Eliminando...' : 'Eliminar obra'}
        </button>
      </div>

    </div>
  )
}
