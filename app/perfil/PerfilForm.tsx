'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type TipoPerfil = Database['public']['Enums']['tipo_perfil']

const TIPO_PERFIL_OPTIONS = [
  { value: 'actor',       label: 'Actor / Actriz' },
  { value: 'director',    label: 'Director/a' },
  { value: 'dramaturgo',  label: 'Dramaturgo/a' },
  { value: 'compania',    label: 'Compañía de teatro' },
  { value: 'productora',  label: 'Productora' },
  { value: 'teatro',      label: 'Teatro / Sala' },
  { value: 'festival',    label: 'Festival' },
  { value: 'escuela',     label: 'Escuela de artes escénicas' },
  { value: 'institucion', label: 'Institución pública' },
  { value: 'profesional', label: 'Profesional de artes escénicas' },
  { value: 'publico',     label: 'Público general' },
]

interface Profile {
  id: string
  nombre: string
  apellidos: string | null
  nombre_artistico: string | null
  bio: string | null
  pais: string
  ciudad: string | null
  tipo_perfil: TipoPerfil
  perfil_publico: boolean
  slug: string | null
}

export default function PerfilForm({ profile }: { profile: Profile | null }) {
  const [nombre, setNombre] = useState(profile?.nombre || '')
  const [apellidos, setApellidos] = useState(profile?.apellidos || '')
  const [nombreArtistico, setNombreArtistico] = useState(profile?.nombre_artistico || '')
  const [tipoPerfil, setTipoPerfil] = useState<TipoPerfil>(profile?.tipo_perfil ?? ('publico' as TipoPerfil))
  const [bio, setBio] = useState(profile?.bio || '')
  const [pais, setPais] = useState(profile?.pais || 'España')
  const [ciudad, setCiudad] = useState(profile?.ciudad || '')
  const [perfilPublico, setPerfilPublico] = useState(profile?.perfil_publico ?? true)
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
        nombre,
        apellidos: apellidos || null,
        nombre_artistico: nombreArtistico || null,
        tipo_perfil: tipoPerfil,
        bio: bio || null,
        pais,
        ciudad: ciudad || null,
        perfil_publico: perfilPublico,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile!.id)

    if (error) {
      setMessage('Error al guardar: ' + error.message)
    } else {
      setMessage('¡Perfil actualizado correctamente!')
    }
    setLoading(false)
  }

  if (!profile) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500 text-sm">No se encontró el perfil.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleGuardar} className="bg-white p-6 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre *</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            className="w-full border p-3 rounded"
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Apellidos</label>
          <input
            type="text"
            value={apellidos}
            onChange={e => setApellidos(e.target.value)}
            className="w-full border p-3 rounded"
            placeholder="Tus apellidos"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nombre artístico / Nombre público</label>
        <input
          type="text"
          value={nombreArtistico}
          onChange={e => setNombreArtistico(e.target.value)}
          className="w-full border p-3 rounded"
          placeholder="Nombre que aparecerá en tu perfil público"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tipo de perfil *</label>
        <select
          value={tipoPerfil}
          onChange={e => setTipoPerfil(e.target.value as TipoPerfil)}
          required
          className="w-full border p-3 rounded"
        >
          {TIPO_PERFIL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">País</label>
          <input
            type="text"
            value={pais}
            onChange={e => setPais(e.target.value)}
            className="w-full border p-3 rounded"
            placeholder="España"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ciudad</label>
          <input
            type="text"
            value={ciudad}
            onChange={e => setCiudad(e.target.value)}
            className="w-full border p-3 rounded"
            placeholder="Madrid"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="perfil_publico"
          checked={perfilPublico}
          onChange={e => setPerfilPublico(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="perfil_publico" className="text-sm">
          Perfil público (visible para otros usuarios)
        </label>
      </div>

      {profile.slug && (
        <p className="text-xs text-gray-400">
          URL de tu perfil: <span className="font-mono">/perfil/{profile.slug}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white p-3 rounded font-medium"
      >
        {loading ? 'Guardando...' : 'Guardar perfil'}
      </button>
      {message && (
        <p className={`text-center text-sm mt-2 ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
