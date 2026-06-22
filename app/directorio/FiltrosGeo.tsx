'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COUNTRIES } from '@/lib/geo/countries'

const SORTED_COUNTRIES = [
  COUNTRIES.find(c => c.code === 'ES')!,
  ...COUNTRIES.filter(c => c.code !== 'ES'),
]

interface Props {
  paisActivo: string | null
  regionActiva: string | null
  tipoActivo: string | null
  busqueda: string
}

export default function FiltrosGeo({ paisActivo, regionActiva, tipoActivo, busqueda }: Props) {
  const router = useRouter()
  const [pais, setPais] = useState(paisActivo ?? '')
  const [region, setRegion] = useState(regionActiva ?? '')

  const currentCountry = SORTED_COUNTRIES.find(c => c.code === pais)

  const buildUrl = (newPais: string, newRegion: string) => {
    const qs = new URLSearchParams()
    if (newPais) qs.set('pais', newPais)
    if (newRegion && newPais) qs.set('region', newRegion)
    if (tipoActivo) qs.set('tipo', tipoActivo)
    if (busqueda) qs.set('q', busqueda)
    return `/directorio${qs.toString() ? `?${qs.toString()}` : ''}`
  }

  const handlePaisChange = (code: string) => {
    setPais(code)
    setRegion('')
    router.push(buildUrl(code, ''))
  }

  const handleRegionChange = (reg: string) => {
    setRegion(reg)
    router.push(buildUrl(pais, reg))
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <select
        value={pais}
        onChange={e => handlePaisChange(e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        aria-label="Filtrar por país"
      >
        <option value="">Todos los países</option>
        {SORTED_COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>

      {pais && currentCountry && currentCountry.regions.length > 0 && (
        <select
          value={region}
          onChange={e => handleRegionChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          aria-label="Filtrar por región"
        >
          <option value="">Todas las regiones</option>
          {currentCountry.regions.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      )}

      {(pais || region) && (
        <button
          onClick={() => {
            setPais('')
            setRegion('')
            router.push(buildUrl('', ''))
          }}
          className="text-sm text-gray-500 hover:text-gray-900 underline"
          type="button"
        >
          Limpiar ubicación
        </button>
      )}
    </div>
  )
}
