'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PerfilForm({ profile }: { profile: any }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [location, setLocation] = useState(profile?.location || '')
  const [website, setWebsite] = useState(profile?.website || '')
  const [professionalType, setProfessionalType] = useState(profile?.professional_type || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        bio,
        location,
        website,
        professional_type: professionalType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (error) {
      setMessage('Error al guardar: ' + error.message)
    } else {
      setMessage('¡Perfil actualizado correctamente!')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleGuardar} className="bg-white p-6 rounded-lg shadow space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre artístico</label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="w-full border p-3 rounded"
          placeholder="Tu nombre público"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tipo profesional</label>
        <select
          value={professionalType}
          onChange={e => setProfessionalType(e.target.value)}
          className="w-full border p-3 rounded"
        >
          <option value="">Selecciona...</option>
          <option value="actor">Actor/Actriz</option>
          <option value="director">Director/a</option>
          <option value="dramaturgo">Dramaturgo/a</option>
          <option value="compania">Compañía</option>
          <option value="tecnico">Técnico/a</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Biografía</label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={4}
          className="w-full border p-3 rounded"
          placeholder="Cuéntanos sobre ti..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Ubicación</label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          className="w-full border p-3 rounded"
          placeholder="Ciudad, País"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Sitio web</label>
        <input
          type="url"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          className="w-full border p-3 rounded"
          placeholder="https://..."
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white p-3 rounded font-medium"
      >
        {loading ? 'Guardando...' : 'Guardar perfil'}
      </button>
      {message && <p className="text-center text-sm mt-2">{message}</p>}
    </form>
  )
}