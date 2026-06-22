'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

export default function NuevaObraForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [genre, setGenre] = useState('')
  const [language, setLanguage] = useState('es')
  const [duration, setDuration] = useState('')
  const [minAge, setMinAge] = useState('')
  const [castMin, setCastMin] = useState('')
  const [castMax, setCastMax] = useState('')
  const [isPublished, setIsPublished] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (castMin && castMax && Number(castMax) < Number(castMin)) {
      setError('El reparto máximo no puede ser menor que el mínimo.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: insertError } = await supabase
      .from('works')
      .insert({
        profile_id: userId,
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
      })
      .select('slug')
      .single()

    setLoading(false)

    if (insertError || !data?.slug) {
      setError('Error al crear la obra: ' + (insertError?.message ?? 'respuesta inesperada'))
      return
    }

    router.push(`/obras/${data.slug}/editar`)
  }

  return (
    <form onSubmit={handleSubmit} className="account-card ds-form">

      <div className="ds-form-group">
        <label className="ds-label">Título *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Título de la obra"
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
          placeholder="Nombre del autor o autora"
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
          placeholder="Descripción breve de la obra..."
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
            <option value="">— Seleccionar —</option>
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
            placeholder="90"
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
            placeholder="7"
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
        <p className="ds-form-hint">Número de actores necesarios</p>
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
          <p className="ds-checkbox-hint">Si no la publicas, quedará como borrador privado</p>
        </div>
      </div>

      {error && (
        <div className="ds-alert-error">{error}</div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="submit"
          disabled={loading}
          className="ds-btn-primary"
        >
          {loading ? 'Creando...' : 'Crear obra'}
        </button>
        <a href="/mis-obras" className="ds-btn-secondary" style={{ flex: 'none' }}>
          Cancelar
        </a>
      </div>

    </form>
  )
}
