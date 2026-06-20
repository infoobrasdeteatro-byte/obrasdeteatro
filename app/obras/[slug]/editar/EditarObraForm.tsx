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

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black'

  return (
    <div className="space-y-6">

      <div className={`rounded-xl p-4 flex items-center justify-between ${
        isPublished
          ? 'bg-green-50 border border-green-200'
          : 'bg-amber-50 border border-amber-200'
      }`}>
        <div>
          <p className={`text-sm font-medium ${isPublished ? 'text-green-700' : 'text-amber-700'}`}>
            {isPublished ? 'Obra publicada' : 'Borrador privado'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isPublished
              ? 'Visible públicamente en ObrasDeTeatro'
              : 'Solo tú puedes verla'}
          </p>
        </div>
        {obra.is_published && obra.slug && (
          <Link
            href={`/obras/${obra.slug}`}
            target="_blank"
            className="text-xs underline text-gray-500 hover:text-black"
          >
            Ver publicada →
          </Link>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-xl shadow-sm space-y-5">

        <div>
          <label className="block text-sm font-medium mb-1">Título *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={200}
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
              <option value="">— Sin especificar —</option>
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
              La obra será visible públicamente en ObrasDeTeatro
            </p>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
        )}
        {message && (
          <p className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{message}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white py-3 rounded-lg font-medium text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>

      </form>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-red-100">
        <h3 className="font-semibold text-gray-900 mb-1">Zona de peligro</h3>
        <p className="text-sm text-gray-500 mb-4">
          Eliminar la obra la retira permanentemente del directorio. No se puede deshacer.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
        >
          {deleting ? 'Eliminando...' : 'Eliminar obra'}
        </button>
      </div>

    </div>
  )
}
