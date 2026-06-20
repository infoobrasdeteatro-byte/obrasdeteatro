'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { COUNTRIES } from '@/lib/geo/countries'

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
  country_code: string | null
  region: string | null
  postal_code: string | null
  tipo_perfil: TipoPerfil
  perfil_publico: boolean
  slug: string | null
}

// España al inicio, resto en el orden original del dataset
const SORTED_COUNTRIES = [
  COUNTRIES.find(c => c.code === 'ES')!,
  ...COUNTRIES.filter(c => c.code !== 'ES'),
]

export default function PerfilForm({ profile }: { profile: Profile | null }) {
  const [nombre, setNombre] = useState(profile?.nombre || '')
  const [apellidos, setApellidos] = useState(profile?.apellidos || '')
  const [nombreArtistico, setNombreArtistico] = useState(profile?.nombre_artistico || '')
  const [tipoPerfil, setTipoPerfil] = useState<TipoPerfil>(profile?.tipo_perfil ?? ('publico' as TipoPerfil))
  const [bio, setBio] = useState(profile?.bio || '')
  const [perfilPublico, setPerfilPublico] = useState(profile?.perfil_publico ?? true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Ubicación estructurada
  const initialCode =
    profile?.country_code ??
    COUNTRIES.find(c => c.name === profile?.pais)?.code ??
    'ES'
  const initialCountry = COUNTRIES.find(c => c.code === initialCode) ?? COUNTRIES[0]

  const [countryCode, setCountryCode] = useState(initialCode)
  const [pais, setPais] = useState(initialCountry.name)
  const [region, setRegion] = useState(profile?.region ?? '')
  const [ciudad, setCiudad] = useState(profile?.ciudad ?? '')
  const [postalCode, setPostalCode] = useState(profile?.postal_code ?? '')

  const currentCountry = COUNTRIES.find(c => c.code === countryCode)

  const handleCountryChange = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code)
    if (country) {
      setCountryCode(country.code)
      setPais(country.name)
      setRegion('')
    }
  }

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
        country_code: countryCode || null,
        region: region || null,
        ciudad: ciudad || null,
        postal_code: postalCode || null,
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

      {/* Ubicación estructurada */}
      <div>
        <label className="block text-sm font-medium mb-3">Ubicación</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">País</label>
            <select
              value={countryCode}
              onChange={e => handleCountryChange(e.target.value)}
              className="w-full border p-3 rounded"
            >
              {SORTED_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Provincia / Estado / Región</label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full border p-3 rounded"
            >
              <option value="">— Seleccionar —</option>
              {currentCountry?.regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ciudad</label>
            <input
              type="text"
              value={ciudad}
              onChange={e => setCiudad(e.target.value)}
              className="w-full border p-3 rounded"
              placeholder="Madrid"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Código postal</label>
            <input
              type="text"
              value={postalCode}
              onChange={e => setPostalCode(e.target.value)}
              className="w-full border p-3 rounded"
              placeholder="28001"
              maxLength={12}
            />
          </div>
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
