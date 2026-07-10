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
  soloDisponibles: boolean
}

export default function FiltrosDirectorio({
  paisActivo,
  regionActiva,
  tipoActivo,
  busqueda,
  soloDisponibles,
}: Props) {
  const router = useRouter()
  const [pais, setPais] = useState(paisActivo ?? '')
  const [region, setRegion] = useState(regionActiva ?? '')
  const [disponible, setDisponible] = useState(soloDisponibles)

  const currentCountry = SORTED_COUNTRIES.find(c => c.code === pais)

  const buildUrl = (newPais: string, newRegion: string, newDisponible: boolean) => {
    const qs = new URLSearchParams()
    if (tipoActivo) qs.set('tipo', tipoActivo)
    if (newPais) qs.set('pais', newPais)
    if (newRegion && newPais) qs.set('region', newRegion)
    if (busqueda) qs.set('q', busqueda)
    if (newDisponible) qs.set('disponible', '1')
    return `/directorio${qs.toString() ? `?${qs.toString()}` : ''}`
  }

  const handlePaisChange = (code: string) => {
    setPais(code)
    setRegion('')
    router.push(buildUrl(code, '', disponible))
  }

  const handleRegionChange = (reg: string) => {
    setRegion(reg)
    router.push(buildUrl(pais, reg, disponible))
  }

  const handleDisponibleChange = (val: boolean) => {
    setDisponible(val)
    router.push(buildUrl(pais, region, val))
  }

  const selectStyle = {
    fontSize: '13px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px 12px',
    background: 'var(--white)',
    color: 'var(--text)',
    fontFamily: 'var(--sans)',
    outline: 'none',
    cursor: 'pointer',
  } as const

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
      {/* Búsqueda */}
      <form method="GET" action="/directorio" style={{ display: 'flex', gap: '6px' }}>
        {tipoActivo     && <input type="hidden" name="tipo"      value={tipoActivo} />}
        {paisActivo     && <input type="hidden" name="pais"      value={paisActivo} />}
        {regionActiva   && <input type="hidden" name="region"    value={regionActiva} />}
        {soloDisponibles && <input type="hidden" name="disponible" value="1" />}
        <input
          type="text"
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por nombre, especialidad…"
          style={{
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            fontFamily: 'var(--sans)',
            color: 'var(--text)',
            background: 'var(--white)',
            outline: 'none',
            minWidth: '180px',
          }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--black)', color: 'var(--white)',
            padding: '8px 18px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 500,
            fontFamily: 'var(--sans)',
            border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Buscar
        </button>
      </form>

      {/* País */}
      <select
        value={pais}
        onChange={e => handlePaisChange(e.target.value)}
        style={selectStyle}
        aria-label="Filtrar por país"
      >
        <option value="">Todos los países</option>
        {SORTED_COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>

      {/* Región (condicional) */}
      {pais && currentCountry && currentCountry.regions.length > 0 && (
        <select
          value={region}
          onChange={e => handleRegionChange(e.target.value)}
          style={selectStyle}
          aria-label="Filtrar por región"
        >
          <option value="">Todas las regiones</option>
          {currentCountry.regions.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      )}

      {/* Solo disponibles */}
      <button
        type="button"
        onClick={() => handleDisponibleChange(!disponible)}
        aria-pressed={disponible}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          fontSize: '12px', fontWeight: disponible ? 600 : 400,
          padding: '7px 14px', borderRadius: '20px',
          border: `1px solid ${disponible ? 'var(--black)' : 'var(--border)'}`,
          background: disponible ? 'var(--black)' : 'var(--white)',
          color: disponible ? 'var(--white)' : 'var(--muted)',
          cursor: 'pointer', fontFamily: 'var(--sans)',
          transition: 'all 0.15s',
        }}
      >
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: disponible ? '#4ade80' : '#9ca3af',
          display: 'inline-block', flexShrink: 0,
        }} />
        Solo disponibles
      </button>

      {/* Limpiar ubicación */}
      {(pais || region) && (
        <button
          type="button"
          onClick={() => { setPais(''); setRegion(''); router.push(buildUrl('', '', disponible)) }}
          style={{
            fontSize: '12px', color: 'var(--muted)', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)',
            textDecoration: 'underline', textUnderlineOffset: '3px',
          }}
        >
          Limpiar ubicación
        </button>
      )}
    </div>
  )
}
