'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/geo/countries'
import { ZONAS_PAIS } from '@/lib/cartelera/cartelera'

export type Sala = { id: string; nombre: string; municipio: string; region: string; pais_code: string }

export const PAISES_CARTELERA = COUNTRIES.filter(c => ZONAS_PAIS[c.code])
export const nombrePais = (code: string | null) => COUNTRIES.find(c => c.code === code)?.name ?? code ?? ''

/** Busca salas publicadas de Espacios escénicos por nombre o municipio. */
export default function BuscadorSala({ elegida, onElegir, pais, onManual }: {
  elegida: Sala | null; onElegir: (s: Sala | null) => void; pais: string; onManual: (texto: string) => void
}) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<Sala[]>([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    const texto = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9ñ ]/g, ' ').trim()
    if (texto.length < 3) { setResultados([]); return }
    let vigente = true
    const t = setTimeout(async () => {
      setBuscando(true)
      const patron = `%${texto.replace(/\s+/g, '%')}%`
      const { data } = await createClient()
        .from('espacios_escenicos')
        .select('id, nombre, municipio, region, pais_code')
        .eq('estado', 'publicado')
        .eq('pais_code', pais)
        .or(`nombre_normalizado.ilike.${patron},municipio_slug.ilike.${patron.replace(/ /g, '-')}`)
        .order('nombre')
        .limit(8)
      if (vigente) { setResultados(data ?? []); setBuscando(false) }
    }, 250)
    return () => { vigente = false; clearTimeout(t) }
  }, [q, pais])

  if (elegida) {
    return (
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', background: 'var(--subtle)', borderRadius: 'var(--radius)' }}>
        <span style={{ fontSize: '14px' }}>
          <strong>{elegida.nombre}</strong> · {elegida.municipio}, {nombrePais(elegida.pais_code)}
        </span>
        <button type="button" className="table-link" style={{ marginLeft: 'auto' }} onClick={() => onElegir(null)}>Cambiar</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input id="buscar-sala" className="ds-input" value={q} onChange={e => setQ(e.target.value)}
        placeholder={`Nombre de la sala o ciudad en ${nombrePais(pais)} (mín. 3 letras)`} autoComplete="off" />
      {(resultados.length > 0 || (q.trim().length >= 3 && !buscando)) && (
        <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--white, #fff)' }}>
          {resultados.map(s => (
            <li key={s.id}>
              <button type="button" onClick={() => { onElegir(s); setQ('') }}
                style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 0, borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '14px' }}>
                <strong>{s.nombre}</strong> <span style={{ color: 'var(--muted)' }}>· {s.municipio}, {nombrePais(s.pais_code)}</span>
              </button>
            </li>
          ))}
          {resultados.length === 0 && (
            <li style={{ padding: '9px 12px', fontSize: '13px', color: 'var(--muted)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Esa sala todavía no está en Espacios escénicos de {nombrePais(pais)}.</span>
              <button type="button" className="ds-btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={() => onManual(q.trim())}>
                Escribir el lugar a mano
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

