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

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm space-y-5">

      <div>
        <label className="block text-sm font-medium mb-1">Título *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Título de la obra"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Autor / Autora</label>
        <input
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          maxLength={200}
          placeholder="Nombre del autor o autora"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Sinopsis</label>
        <textarea
          value={synopsis}
          onChange={e => setSynopsis(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Descripción breve de la obra..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Género</label>
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            className={`${inputClass} bg-white`}
          >
            <option value="">— Seleccionar —</option>
            {GENEROS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Idioma</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className={`${inputClass} bg-white`}
          >
            {IDIOMAS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Duración (minutos)</label>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            min={1}
            max={600}
            placeholder="90"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Edad mínima recomendada</label>
          <input
            type="number"
            value={minAge}
            onChange={e => setMinAge(e.target.value)}
            min={0}
            max={99}
            placeholder="7"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tamaño del reparto</label>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            value={castMin}
            onChange={e => setCastMin(e.target.value)}
            min={1}
            placeholder="Mínimo"
            className={inputClass}
          />
          <input
            type="number"
            value={castMax}
            onChange={e => setCastMax(e.target.value)}
            min={1}
            placeholder="Máximo"
            className={inputClass}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">Número de actores necesarios</p>
      </div>

      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          id="is_published"
          checked={isPublished}
          onChange={e => setIsPublished(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
        <div>
          <label htmlFor="is_published" className="text-sm font-medium cursor-pointer">
            Publicar obra
          </label>
          <p className="text-xs text-gray-400">
            Si no la publicas, quedará como borrador privado
          </p>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-black text-white py-3 rounded-lg font-medium text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear obra'}
        </button>
        <a
          href="/mis-obras"
          className="px-6 py-3 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 text-center"
        >
          Cancelar
        </a>
      </div>

    </form>
  )
}
